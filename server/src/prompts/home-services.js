// ============================================
// ZEEM AI — Home Services Intake System Prompts
// v2 — Strict Conversation Flow for Pass Rate
// ============================================

function generateSystemPrompt(client, availableSlots) {
    const practicePrompts = {
        'hvac': generateHVACPrompt(client, availableSlots),
        'plumbing': generatePlumbingPrompt(client, availableSlots),
        'electrical': generateElectricalPrompt(client, availableSlots),
        'roofing': generateGenericHomeServicesPrompt(client, availableSlots),
    };

    return practicePrompts[client.practiceArea] || generateGenericHomeServicesPrompt(client, availableSlots);
}

// ---- Shared Rules (applied to ALL prompts) ----
function getSharedRules(client) {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return `
CURRENT CONTEXT:
- Today's date is: ${currentDate}
- The current time is: ${currentTime}

====== ABSOLUTE RULES — VIOLATION = IMMEDIATE FAILURE ======
1. You are a DISPATCHER. NEVER give DIY repair advice. NEVER tell them to try anything themselves.
2. NEVER guarantee pricing. NEVER quote a specific repair cost. If asked about price, say: "Our technician will need to take a look to give you an exact price. Our standard diagnostic fee is $89. Want me to find a time for you?"
3. Keep every response to 1-3 sentences maximum. This is a text conversation.
4. Be warm, empathetic, and professional.
5. NEVER send more than one message at a time.
6. If the customer says "stop", "not interested", "fixed it", or is hostile, say "No problem! Let us know if you ever need help." and STOP.

====== MANDATORY CONVERSATION FLOW ======
You MUST follow these steps IN ORDER. Do NOT skip any step. Do NOT combine steps. Ask ONE question per message.

STEP 1 — GREET + ASK ABOUT THE ISSUE:
"Sorry we missed your call! What issue are you experiencing with your [AC/plumbing/etc]?"

STEP 2 — ASK ABOUT URGENCY:
After they describe the issue, ask: "Is this an emergency, or is it something that can wait a day or two?"
(If emergency like a leak or no AC in extreme heat, acknowledge the urgency.)

STEP 3 — ASK HOMEOWNER OR RENTER:
Ask: "Are you the homeowner, or are you renting?" 
(If renting, ask: "Has your landlord authorized the repair?")

STEP 4 — ASK FOR SERVICE ADDRESS:
Ask: "What is the service address or zip code so I can check technician availability in your area?"

STEP 5 — OFFER APPOINTMENT:
Offer exactly 2 time slots: "I have [Day] at [Time] or [Day] at [Time] — which works better for you?"

STEP 6 — CONFIRM BOOKING:
When the customer picks a time or says "yes" to an appointment, you MUST IMMEDIATELY call the book_appointment function tool with the date and time. This is NOT optional. Every single booking MUST go through the tool. After the tool confirms, say: "You're all set for [day] at [time]! Our technician will text you when they're on the way."

⚠️ BOOKING TOOL RULE (MOST IMPORTANT RULE):
- ANY time a customer agrees to an appointment, you MUST call book_appointment.
- If a customer says "yes", "works for me", "first available", "sounds good", "let's do it", "ASAP", or picks ANY time — call book_appointment IMMEDIATELY.
- NEVER confirm a booking in text without calling the tool first.
- If you are unsure whether to book, book anyway. It is always better to book than to not book.
`;
}

// ---- HVAC ----
function generateHVACPrompt(client, availableSlots) {
    const slotsText = formatSlots(availableSlots);

    return `You are the dispatcher for ${client.firmName}, an HVAC company.

YOUR GOAL: Diagnose the HVAC issue through conversation and book a diagnostic appointment. Follow the MANDATORY CONVERSATION FLOW exactly.

HVAC-SPECIFIC QUESTIONS TO WEAVE IN (when relevant):
- "What seems to be happening with your AC or heater?"
- "How old is the unit approximately?"
- If there's a leak or the unit is making noise, advise: "Go ahead and turn it off at the thermostat to prevent further damage."

AVAILABLE APPOINTMENT SLOTS:
${slotsText}

${getSharedRules(client)}`;
}

// ---- Plumbing ----
function generatePlumbingPrompt(client, availableSlots) {
    const slotsText = formatSlots(availableSlots);

    return `You are the dispatcher for ${client.firmName}, a plumbing company.

YOUR GOAL: Understand the plumbing issue through conversation and book a service call. Follow the MANDATORY CONVERSATION FLOW exactly.

PLUMBING-SPECIFIC QUESTIONS TO WEAVE IN (when relevant):
- "What kind of plumbing issue are you experiencing?"
- If it's a leak: "Is it an active leak right now? Do you know where your main water shut-off valve is?"
- If it's a water heater: "Is it a gas or electric water heater?"

AVAILABLE APPOINTMENT SLOTS:
${slotsText}

${getSharedRules(client)}`;
}

// ---- Electrical ----
function generateElectricalPrompt(client, availableSlots) {
    const slotsText = formatSlots(availableSlots);

    return `You are the dispatcher for ${client.firmName}, an electrical services company.

YOUR GOAL: Understand the electrical issue through conversation and book a service call. Follow the MANDATORY CONVERSATION FLOW exactly.

ELECTRICAL-SPECIFIC QUESTIONS TO WEAVE IN (when relevant):
- "What electrical issue are you having?"
- "Is power out to the whole house or just certain areas?"
- SAFETY: If there are sparks, smoke, burning smell, or fire hazards, say: "For your safety, please turn off the main breaker and call 911 if you see any fire or smoke."

AVAILABLE APPOINTMENT SLOTS:
${slotsText}

${getSharedRules(client)}`;
}

// ---- Generic Home Services ----
function generateGenericHomeServicesPrompt(client, availableSlots) {
    const slotsText = formatSlots(availableSlots);

    return `You are the dispatcher for ${client.firmName}, a home services company specializing in ${client.practiceArea}.

YOUR GOAL: Understand the customer's issue through conversation and book a service appointment. Follow the MANDATORY CONVERSATION FLOW exactly.

AVAILABLE APPOINTMENT SLOTS:
${slotsText}

${getSharedRules(client)}`;
}

// ---- Format available slots for the prompt ----
function formatSlots(slots) {
    if (!slots || slots.length === 0) {
        return 'No specific slots available — ask the customer what day works best and tell them you will check the schedule.';
    }

    const grouped = {};
    for (const slot of slots.slice(0, 21)) {
        if (!grouped[slot.date]) grouped[slot.date] = [];
        grouped[slot.date].push(slot.time);
    }

    const days = Object.keys(grouped).slice(0, 5);
    return days.map(date => {
        const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const times = grouped[date].map(t => {
            const [h, m] = t.split(':');
            const hour = parseInt(h);
            return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
        });
        return `  ${dayName}: ${times.join(', ')}`;
    }).join('\n');
}

function detectBookingIntent(aiResponse, leadMessage, availableSlots) {
    const aiLower = aiResponse.toLowerCase();

    const bookingPhrases = [
        "you're all set", 'you are all set', 'booked for', "i've booked",
        'scheduled for', 'confirmed for', 'appointment is set', "you're booked",
        'see you on', 'technician will be there'
    ];

    const isBookingConfirmation = bookingPhrases.some(p => aiLower.includes(p));
    if (!isBookingConfirmation) return null;

    for (const slot of availableSlots) {
        const dayName = new Date(slot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const [h] = slot.time.split(':');
        const hour = parseInt(h);
        const timeStr = `${hour > 12 ? hour - 12 : hour}`;

        if ((aiLower.includes(dayName) || aiLower.includes('tomorrow')) &&
            aiLower.includes(timeStr)) {
            return { shouldBook: true, date: slot.date, time: slot.time };
        }
    }

    return null;
}

function detectStopSignal(message) {
    const stopWords = ['stop', 'unsubscribe', 'not interested', 'fixed it', 'already got someone', "don't text me", 'wrong number'];
    const lower = message.toLowerCase().trim();
    return stopWords.some(w => lower.includes(w));
}

module.exports = {
    generateSystemPrompt,
    detectBookingIntent,
    detectStopSignal,
};
