// ============================================
// ZEEM AI — AI Conversation Service
// Handles OpenAI API calls for generating responses
// ============================================
const { generateSystemPrompt, detectBookingIntent, detectStopSignal } = require('../prompts/home-services');
const { getAvailableSlots, upsertConversation, updateConversationStatus, createBooking, getClient } = require('../config/storage');
const { notifyAttorneyOfBooking } = require('./notifications');

let openai = null;

function getOpenAI() {
    if (!openai) {
        // Lazy-load OpenAI (large package, slow to import on Node v24)
        const OpenAI = require('openai');
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
}

/**
 * Generate an AI response for an incoming message
 * This is the main function that powers the entire product
 */
async function generateResponse(phoneNumber, incomingMessage, clientId) {
    const client = getClient(clientId);
    if (!client) throw new Error('Client not found');

    // 1. Check for stop signals
    if (detectStopSignal(incomingMessage)) {
        updateConversationStatus(phoneNumber, 'stopped');
        return {
            response: "No problem at all! If you ever need help in the future, we're here. Have a great day! 😊",
            shouldStop: true,
            booking: null,
        };
    }

    // 2. Store the incoming message
    const conversation = upsertConversation(phoneNumber, clientId, incomingMessage, 'user');

    // 3. Check if conversation is already stopped/booked
    if (conversation.status === 'stopped' || conversation.status === 'booked') {
        return { response: null, shouldStop: true, booking: null };
    }

    // 4. Get available appointment slots
    const availableSlots = getAvailableSlots(clientId);

    // 5. Build the system prompt
    const systemPrompt = generateSystemPrompt(client, availableSlots);

    // 6. Build message history for context
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversation.messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
        })),
    ];

    // 7. Define tools for structured AI actions
    const tools = [
        {
            type: 'function',
            function: {
                name: 'book_appointment',
                description: 'Book a consultation appointment when the lead has agreed to a specific date and time.',
                parameters: {
                    type: 'object',
                    properties: {
                        date: { type: 'string', description: 'The appointment date in YYYY-MM-DD format' },
                        time: { type: 'string', description: 'The appointment time in HH:MM format (24-hour)' },
                        leadName: { type: 'string', description: 'The name of the lead/potential client' },
                    },
                    required: ['date', 'time'],
                },
            },
        },
    ];

    // 8. Call OpenAI with tool calling
    try {
        const ai = getOpenAI();
        const completion = await ai.chat.completions.create({
            model: client.aiConfig.model || 'gpt-4o-mini',
            messages,
            temperature: client.aiConfig.temperature || 0.7,
            max_tokens: client.aiConfig.maxTokens || 300,
            tools,
            tool_choice: 'auto',
        });

        const choice = completion.choices[0];
        let aiResponse = '';
        let booking = null;

        // Check if AI called the booking tool
        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
            const toolCall = choice.message.tool_calls[0];

            if (toolCall.function.name === 'book_appointment') {
                const args = JSON.parse(toolCall.function.arguments);
                const leadName = args.leadName || extractName(conversation.messages) || 'Lead';

                // Validate the slot exists
                const slotValid = availableSlots.some(s => s.date === args.date && s.time === args.time);

                if (slotValid) {
                    booking = createBooking({
                        clientId,
                        leadPhone: phoneNumber,
                        leadName,
                        date: args.date,
                        time: args.time,
                        practiceArea: client.practiceArea,
                        notes: summarizeConversation(conversation.messages),
                    });
                    console.log(`📅 BOOKING CREATED (via tool): ${booking.leadName} at ${booking.date} ${booking.time} for ${client.firmName}`);

                    // Notify the attorney immediately
                    notifyAttorneyOfBooking(client, booking).catch(err => {
                        console.error('Failed to send booking notification:', err.message);
                    });

                    // Get a follow-up response acknowledging the booking
                    const followUp = await ai.chat.completions.create({
                        model: client.aiConfig.model || 'gpt-4o-mini',
                        messages: [
                            ...messages,
                            choice.message,
                            { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ success: true, booking: { date: args.date, time: args.time, leadName } }) },
                        ],
                        temperature: 0.7,
                        max_tokens: 200,
                    });
                    aiResponse = followUp.choices[0].message.content.trim();
                } else {
                    // Slot not available — ask AI to suggest another
                    aiResponse = choice.message.content || "I'm sorry, that time slot just got taken. Let me check what else is available...";
                }
            }
        } else {
            // Normal text response (no tool call)
            aiResponse = choice.message.content.trim();

            // Fallback: also check with old regex method in case tool wasn't triggered
            const bookingDetection = detectBookingIntent(aiResponse, incomingMessage, availableSlots);
            if (bookingDetection && bookingDetection.shouldBook) {
                booking = createBooking({
                    clientId,
                    leadPhone: phoneNumber,
                    leadName: extractName(conversation.messages) || 'Lead',
                    date: bookingDetection.date,
                    time: bookingDetection.time,
                    practiceArea: client.practiceArea,
                    notes: summarizeConversation(conversation.messages),
                });
                console.log(`📅 BOOKING CREATED (via regex fallback): ${booking.leadName} at ${booking.date} ${booking.time} for ${client.firmName}`);

                notifyAttorneyOfBooking(client, booking).catch(err => {
                    console.error('Failed to send booking notification:', err.message);
                });
            }
        }

        // 9. Store the AI response
        if (aiResponse) {
            upsertConversation(phoneNumber, clientId, aiResponse, 'assistant');
        }

        // 10. Log the exchange
        console.log(`💬 [${client.firmName}] ${phoneNumber}`);
        console.log(`   Lead: ${incomingMessage}`);
        console.log(`   AI:   ${aiResponse}`);
        console.log(`   Tokens: ${completion.usage.total_tokens} | Cost: ~$${(completion.usage.total_tokens * 0.00000015).toFixed(6)}`);
        if (booking) console.log(`   🎉 BOOKING: ${booking.date} at ${booking.time}`);

        return { response: aiResponse, shouldStop: false, booking };

    } catch (error) {
        console.error('❌ OpenAI API Error:', error.message);

        // Fallback response if API fails
        return {
            response: "Thanks for reaching out! I'm having a brief technical issue. One of our team members will text you back shortly.",
            shouldStop: false,
            booking: null,
        };
    }
}

/**
 * Try to extract the lead's name from conversation history
 */
function extractName(messages) {
    // Look for common name patterns in their messages
    for (const msg of messages) {
        if (msg.role !== 'user') continue;
        const namePatterns = [
            /(?:my name is|i'm|i am|this is|it's|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/,
        ];
        for (const pattern of namePatterns) {
            const match = msg.content.match(pattern);
            if (match) return match[1];
        }
    }
    return null;
}

/**
 * Create a brief summary of the conversation for booking notes
 */
function summarizeConversation(messages) {
    const leadMessages = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' | ');
    return leadMessages.substring(0, 500);
}

/**
 * Handle a new lead coming in from a Facebook/Google ad
 * Sends the FIRST message proactively
 */
async function handleNewLead(phoneNumber, clientId, leadInfo = {}) {
    const client = getClient(clientId);
    if (!client) throw new Error('Client not found');

    // Generate a personalized opening message
    const openings = {
        'hvac': `Hi${leadInfo.name ? ' ' + leadInfo.name : ''}! Sorry we missed your call to ${client.firmName}. I understand you might be having an issue with your AC or Heating. What's going on?`,
        'plumbing': `Hi${leadInfo.name ? ' ' + leadInfo.name : ''}! Sorry we missed your call to ${client.firmName}. I know plumbing issues can be stressful. What kind of problem are you having?`,
        'electrical': `Hi${leadInfo.name ? ' ' + leadInfo.name : ''}! Sorry we missed your call to ${client.firmName}. Electrical issues need to be handled quickly. How can we help?`,
        'roofing': `Hi${leadInfo.name ? ' ' + leadInfo.name : ''}! Sorry we missed your call to ${client.firmName}. What type of roofing service are you looking for today?`,
    };

    const greeting = openings[client.practiceArea] ||
        `Hi${leadInfo.name ? ' ' + leadInfo.name : ''}! Thank you for reaching out to ${client.firmName}. How can we help you today?`;

    // Store as the first message in the conversation (from assistant)
    upsertConversation(phoneNumber, clientId, greeting, 'assistant');

    return greeting;
}

module.exports = {
    generateResponse,
    handleNewLead,
};
