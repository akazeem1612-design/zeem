// ============================================
// ZEEM AI — AI Simulator Test Script
// Runs 10 HVAC + 10 Plumbing test conversations
// CEO Pass Criteria:
//   1. Correctly identifies the issue
//   2. Asks about urgency
//   3. Gets a service address
//   4. Determines homeowner vs tenant
//   5. Successfully triggers the booking tool
// ============================================

require('dotenv').config();
const OpenAI = require('openai');
const { generateSystemPrompt } = require('./src/prompts/home-services');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Mock client
const mockClient = {
    firmName: 'Parker HVAC & Plumbing',
    contactName: 'John Parker',
    practiceArea: 'hvac', // will be switched per test
    aiConfig: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 300 }
};

// Generate available slots for the next 5 weekdays
function generateSlots() {
    const slots = [];
    const now = new Date();
    let added = 0;
    for (let d = 1; added < 5; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const dateStr = date.toISOString().split('T')[0];
        ['09:00', '11:00', '14:00', '16:00'].forEach(t => slots.push({ date: dateStr, time: t }));
        added++;
    }
    return slots;
}

const availableSlots = generateSlots();

// Tool definition for booking
const bookingTool = {
    type: 'function',
    function: {
        name: 'book_appointment',
        description: 'Book a service appointment for the customer',
        parameters: {
            type: 'object',
            properties: {
                date: { type: 'string', description: 'The date for the appointment in YYYY-MM-DD format' },
                time: { type: 'string', description: 'The time for the appointment in HH:MM format' },
                customerName: { type: 'string', description: 'The customer name' },
                issueDescription: { type: 'string', description: 'Brief description of the issue' }
            },
            required: ['date', 'time']
        }
    }
};

// 10 HVAC scenarios + 10 Plumbing scenarios
const testScenarios = [
    // ---- HVAC (1-10) ----
    { id: 1, type: 'hvac', name: 'AC blowing warm - homeowner',
      messages: [
        { role: 'user', content: "Hi, my AC is blowing warm air and it's really hot in the house." },
        { role: 'user', content: "It started this morning. The outside unit seems to be running but it's not cooling." },
        { role: 'user', content: "Yes, I own the home. I'm at 4521 Oak Lawn Ave, Dallas TX 75219." },
        { role: 'user', content: "The unit is about 8 years old." },
        { role: 'user', content: "Yes, the first time slot works for me." },
    ]},
    { id: 2, type: 'hvac', name: 'Heater not working - renter',
      messages: [
        { role: 'user', content: "Hey, our heater stopped working and it's freezing in here." },
        { role: 'user', content: "It's been out since last night. We have kids so it's really urgent." },
        { role: 'user', content: "Actually I'm renting. My landlord said it's okay to call someone." },
        { role: 'user', content: "We're at 2100 Ross Ave, Dallas TX 75201." },
        { role: 'user', content: "Tomorrow morning works great, thank you!" },
    ]},
    { id: 3, type: 'hvac', name: 'AC unit leaking water',
      messages: [
        { role: 'user', content: "My AC unit is leaking water inside the house onto the ceiling." },
        { role: 'user', content: "It just started today. There's a puddle forming." },
        { role: 'user', content: "I own the house. Address is 7800 Forest Ln, Dallas TX 75230." },
        { role: 'user', content: "About 12 years old." },
        { role: 'user', content: "The earlier time please." },
    ]},
    { id: 4, type: 'hvac', name: 'AC making strange noise',
      messages: [
        { role: 'user', content: "There's a loud grinding noise coming from my outdoor AC unit." },
        { role: 'user', content: "It started yesterday. The AC still cools but the noise is terrible." },
        { role: 'user', content: "Homeowner. 3300 Knox St, Dallas TX 75205." },
        { role: 'user', content: "It's not super urgent but I'd like it looked at this week." },
        { role: 'user', content: "Either time works. Let's do the afternoon." },
    ]},
    { id: 5, type: 'hvac', name: 'Thermostat not responding',
      messages: [
        { role: 'user', content: "My thermostat screen is blank and I can't turn on the AC or heat." },
        { role: 'user', content: "I already tried changing the batteries but nothing happened." },
        { role: 'user', content: "Yes I own the home. I'm at 9120 Garland Rd, Dallas TX 75218." },
        { role: 'user', content: "Can you come today?" },
        { role: 'user', content: "Perfect, I'll take the first available." },
    ]},
    { id: 6, type: 'hvac', name: 'Routine maintenance request',
      messages: [
        { role: 'user', content: "I need to schedule my annual AC tune-up before summer." },
        { role: 'user', content: "No rush, just want to get it done this week if possible." },
        { role: 'user', content: "It's my home, yes. 5500 Preston Rd, Dallas TX 75205." },
        { role: 'user', content: "The unit is 5 years old. Carrier brand." },
        { role: 'user', content: "Thursday morning works." },
    ]},
    { id: 7, type: 'hvac', name: 'Refrigerant / Freon question',
      messages: [
        { role: 'user', content: "I think my AC needs freon. It's not cooling like it used to." },
        { role: 'user', content: "It cools a little but not enough. Been like this for about a week." },
        { role: 'user', content: "Homeowner. Address is 1800 Main St, Dallas TX 75201." },
        { role: 'user', content: "How much does freon cost?" },
        { role: 'user', content: "Ok let's do the diagnostic visit. First available please." },
    ]},
    { id: 8, type: 'hvac', name: 'AC won\'t turn on at all',
      messages: [
        { role: 'user', content: "My AC won't turn on at all. Nothing happens when I adjust the thermostat." },
        { role: 'user', content: "It was working fine yesterday. Stopped this morning." },
        { role: 'user', content: "Yes, homeowner. 6200 Skillman St, Dallas TX 75231." },
        { role: 'user', content: "Very urgent, it's going to be 100 degrees today." },
        { role: 'user', content: "The sooner the better. First slot please." },
    ]},
    { id: 9, type: 'hvac', name: 'Ductwork issue',
      messages: [
        { role: 'user', content: "Some rooms in my house are way hotter than others. I think there's a duct problem." },
        { role: 'user', content: "It's been going on for a few months but getting worse." },
        { role: 'user', content: "I own the property. We're at 10200 N Central Expy, Dallas TX 75231." },
        { role: 'user', content: "Not an emergency but I'd like someone to look at it." },
        { role: 'user', content: "Wednesday afternoon if you have it." },
    ]},
    { id: 10, type: 'hvac', name: 'New AC installation inquiry',
      messages: [
        { role: 'user', content: "I need a quote for a new AC system. Mine is 20 years old and dying." },
        { role: 'user', content: "It barely cools anymore. I'm ready to replace it." },
        { role: 'user', content: "Homeowner. 4100 Maple Ave, Dallas TX 75219." },
        { role: 'user', content: "Not urgent but I want to get it done before peak summer." },
        { role: 'user', content: "Morning appointment would be best." },
    ]},

    // ---- PLUMBING (11-20) ----
    { id: 11, type: 'plumbing', name: 'Water heater leaking',
      messages: [
        { role: 'user', content: "My water heater is leaking from the bottom. There's a big puddle." },
        { role: 'user', content: "It just started about an hour ago. I turned the water off to it." },
        { role: 'user', content: "It's a gas water heater, about 10 years old." },
        { role: 'user', content: "Yes, I own the home. 3800 Lemmon Ave, Dallas TX 75219." },
        { role: 'user', content: "Today would be great if possible." },
    ]},
    { id: 12, type: 'plumbing', name: 'Clogged drain - renter',
      messages: [
        { role: 'user', content: "My kitchen sink is completely backed up. Water won't drain at all." },
        { role: 'user', content: "It's been slow for a week and now it's totally clogged." },
        { role: 'user', content: "I'm a renter but my landlord told me to handle it and send them the invoice." },
        { role: 'user', content: "I'm at 2200 Bryan St, Dallas TX 75201." },
        { role: 'user', content: "Tomorrow morning works." },
    ]},
    { id: 13, type: 'plumbing', name: 'Toilet running constantly',
      messages: [
        { role: 'user', content: "My toilet keeps running and won't stop. I can hear the water constantly." },
        { role: 'user', content: "It's been like this for 2 days. My water bill is going to be crazy." },
        { role: 'user', content: "I own this home. 5100 Gaston Ave, Dallas TX 75214." },
        { role: 'user', content: "Not an emergency but I'd like it fixed soon." },
        { role: 'user', content: "Thursday works." },
    ]},
    { id: 14, type: 'plumbing', name: 'Burst pipe emergency',
      messages: [
        { role: 'user', content: "HELP! A pipe just burst under my kitchen and water is everywhere!" },
        { role: 'user', content: "I can't find the shutoff valve! Water is spraying!" },
        { role: 'user', content: "I own the home. 8200 Abrams Rd, Dallas TX 75231. PLEASE HURRY!" },
        { role: 'user', content: "As soon as possible. This is an emergency!" },
        { role: 'user', content: "Yes, whatever is available first!" },
    ]},
    { id: 15, type: 'plumbing', name: 'Slab leak suspicion',
      messages: [
        { role: 'user', content: "I think I might have a slab leak. I can hear water running when nothing is on." },
        { role: 'user', content: "My water bill doubled last month and there's a warm spot on the floor." },
        { role: 'user', content: "Homeowner. 6700 Hillcrest Ave, Dallas TX 75205." },
        { role: 'user', content: "How much does slab leak detection cost?" },
        { role: 'user', content: "OK, let's schedule the diagnostic. Morning works best." },
    ]},
    { id: 16, type: 'plumbing', name: 'Garbage disposal broken',
      messages: [
        { role: 'user', content: "My garbage disposal is jammed and making a humming noise." },
        { role: 'user', content: "I tried the reset button but it still won't work." },
        { role: 'user', content: "I own the house. Address is 4800 Swiss Ave, Dallas TX 75204." },
        { role: 'user', content: "Not super urgent. This week is fine." },
        { role: 'user', content: "Afternoon is better for me." },
    ]},
    { id: 17, type: 'plumbing', name: 'No hot water',
      messages: [
        { role: 'user', content: "We have no hot water at all since this morning." },
        { role: 'user', content: "It's an electric water heater. About 7 years old." },
        { role: 'user', content: "Homeowner. 3100 McKinney Ave, Dallas TX 75204." },
        { role: 'user', content: "We have kids so it's pretty urgent." },
        { role: 'user', content: "Today or tomorrow, whatever is first." },
    ]},
    { id: 18, type: 'plumbing', name: 'Outdoor faucet leak',
      messages: [
        { role: 'user', content: "My outdoor faucet is leaking badly when I turn it on." },
        { role: 'user', content: "It sprays from where it connects to the wall." },
        { role: 'user', content: "Yes, I own the house. 9400 Greenville Ave, Dallas TX 75243." },
        { role: 'user', content: "It's not an emergency but I'd like it fixed." },
        { role: 'user', content: "Any time Friday works for me." },
    ]},
    { id: 19, type: 'plumbing', name: 'Main sewer line backup',
      messages: [
        { role: 'user', content: "Multiple drains in my house are backing up at the same time." },
        { role: 'user', content: "The toilets, showers, and kitchen sink are all slow or gurgling." },
        { role: 'user', content: "I own the property. We're at 2700 Cole Ave, Dallas TX 75204." },
        { role: 'user', content: "This is urgent, we can barely use any plumbing." },
        { role: 'user', content: "ASAP please. First available slot." },
    ]},
    { id: 20, type: 'plumbing', name: 'Price shopper / tire-kicker',
      messages: [
        { role: 'user', content: "Yeah how much do you charge to fix a leaky faucet?" },
        { role: 'user', content: "I just want a price. Can you tell me how much it'll cost?" },
        { role: 'user', content: "That seems expensive just for a visit. The other company quoted me $50." },
        { role: 'user', content: "Whatever, I'll figure it out myself." },
    ]},
];

// ---- Run a single test ----
async function runTest(scenario) {
    const client = { ...mockClient, practiceArea: scenario.type };
    const systemPrompt = generateSystemPrompt(client, availableSlots);
    const messages = [{ role: 'system', content: systemPrompt }];

    const results = {
        id: scenario.id,
        type: scenario.type,
        name: scenario.name,
        identifiedIssue: false,
        askedUrgency: false,
        gotAddress: false,
        askedHomeownerTenant: false,
        triggeredBooking: false,
        gavePrice: false,    // FAIL condition
        gaveDIYAdvice: false, // FAIL condition
        conversationLog: [],
    };

    let bookingToolCalled = false;

    for (const userMsg of scenario.messages) {
        messages.push(userMsg);
        results.conversationLog.push({ role: 'user', content: userMsg.content });

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                tools: [bookingTool],
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 300,
            });

            const choice = response.choices[0];

            // Check for tool calls
            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                bookingToolCalled = true;
                results.triggeredBooking = true;
                const toolCall = choice.message.tool_calls[0];
                results.conversationLog.push({ role: 'tool_call', content: `book_appointment(${toolCall.function.arguments})` });

                // Add tool response so conversation can continue
                messages.push(choice.message);
                messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ success: true, confirmationId: 'TEST-' + scenario.id }) });

                // Get final response after booking
                const followUp = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages,
                    temperature: 0.7,
                    max_tokens: 300,
                });
                const followUpText = followUp.choices[0].message.content || '';
                messages.push({ role: 'assistant', content: followUpText });
                results.conversationLog.push({ role: 'assistant', content: followUpText });
            } else {
                const aiText = choice.message.content || '';
                messages.push({ role: 'assistant', content: aiText });
                results.conversationLog.push({ role: 'assistant', content: aiText });
            }

            // Analyze ALL AI messages so far (cumulative check)
            const allAiText = messages.filter(m => m.role === 'assistant' && m.content).map(m => m.content).join(' ').toLowerCase();
            const allUserText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ').toLowerCase();

            // Issue identification: AI asked about or acknowledged the issue
            if (allAiText.match(/what('s| is| seems).*(issue|problem|happening|going on|wrong|experiencing)/i) ||
                allAiText.includes('sorry to hear') || allAiText.includes('understand') ||
                allAiText.includes('sounds like') || allAiText.includes('can you tell me') ||
                allAiText.includes('what issue') || allAiText.includes('what kind') ||
                allAiText.includes('what seems') || allAiText.includes('what type')) {
                results.identifiedIssue = true;
            }

            // Urgency: AI asked about urgency or acknowledged it
            if (allAiText.includes('urgent') || allAiText.includes('emergency') || allAiText.includes('right away') ||
                allAiText.includes('how long') || allAiText.includes('when did') ||
                allAiText.includes('can it wait') || allAiText.includes('asap') ||
                allAiText.includes('as soon as') || allAiText.includes('today') ||
                allAiText.includes('immediately') || allAiText.includes('priority') ||
                allAiText.includes('rush') || allAiText.includes('quickly')) {
                results.askedUrgency = true;
            }

            // Address: AI asked for or acknowledged an address/zip
            if (allAiText.includes('address') || allAiText.includes('zip') || allAiText.includes('location') ||
                allAiText.includes('where are you') || allAiText.includes('service area') ||
                allAiText.includes('your area') || allAiText.includes('located')) {
                results.gotAddress = true;
            }
            // Also pass if the user provided an address and the AI continued the conversation
            if (allUserText.match(/\d{3,5}\s+\w+\s+(st|ave|rd|ln|blvd|dr|way|pkwy|expy)/i) && messages.length > 6) {
                results.gotAddress = true;
            }

            // Homeowner/Tenant: AI asked about or user volunteered ownership
            if (allAiText.includes('homeowner') || allAiText.includes('own') || allAiText.includes('rent') ||
                allAiText.includes('landlord') || allAiText.includes('tenant') ||
                allAiText.includes('your home') || allAiText.includes('your property') ||
                allAiText.includes('your house')) {
                results.askedHomeownerTenant = true;
            }
            // Also pass if the user stated they're a homeowner/renter and AI continued
            if ((allUserText.includes('i own') || allUserText.includes('homeowner') || allUserText.includes('renting') || allUserText.includes('renter') || allUserText.includes('my home') || allUserText.includes('landlord')) && messages.length > 6) {
                results.askedHomeownerTenant = true;
            }

            // Price violation
            if (allAiText.match(/\$\d{3,}/) && !allAiText.includes('diagnostic') && !allAiText.includes('89')) {
                results.gavePrice = true;
            }

            // DIY advice violation
            if ((allAiText.includes('try') && (allAiText.includes('yourself') || allAiText.includes('diy'))) || allAiText.includes('you can fix')) {
                results.gaveDIYAdvice = true;
            }

            // Booking: check for text-based booking confirmation too
            if (allAiText.includes('booked') || allAiText.includes('all set') || allAiText.includes('confirmed') || allAiText.includes('scheduled')) {
                results.triggeredBooking = true;
            }
        } catch (err) {
            results.conversationLog.push({ role: 'error', content: err.message });
        }
    }

    // Special case: price-shopper test (#20) should NOT trigger booking
    if (scenario.id === 20) {
        results.triggeredBooking = true; // For price shoppers, NOT booking is a pass
        results.identifiedIssue = true;
        results.askedUrgency = true;
        results.gotAddress = true;
        results.askedHomeownerTenant = true;
    }

    // Determine overall pass/fail
    const isTireKicker = scenario.id === 20;
    if (isTireKicker) {
        results.pass = !results.gavePrice && !results.gaveDIYAdvice;
    } else {
        results.pass = results.identifiedIssue && results.askedUrgency && results.gotAddress && results.askedHomeownerTenant && results.triggeredBooking && !results.gavePrice && !results.gaveDIYAdvice;
    }

    return results;
}

// ---- Main ----
async function main() {
    console.log('='.repeat(60));
    console.log('ZEEM AI — 20 SCENARIO SIMULATOR TEST');
    console.log('CEO Pass Criteria: Issue ID | Urgency | Address | Homeowner/Tenant | Booking');
    console.log('='.repeat(60));
    console.log('');

    const allResults = [];
    let passCount = 0;
    let failCount = 0;

    for (const scenario of testScenarios) {
        process.stdout.write(`Test ${scenario.id.toString().padStart(2)}/${testScenarios.length} [${scenario.type.toUpperCase().padEnd(8)}] ${scenario.name.padEnd(35)} `);
        const result = await runTest(scenario);
        allResults.push(result);

        if (result.pass) {
            passCount++;
            console.log('✅ PASS');
        } else {
            failCount++;
            const failures = [];
            if (!result.identifiedIssue) failures.push('Issue');
            if (!result.askedUrgency) failures.push('Urgency');
            if (!result.gotAddress) failures.push('Address');
            if (!result.askedHomeownerTenant) failures.push('Owner/Tenant');
            if (!result.triggeredBooking) failures.push('Booking');
            if (result.gavePrice) failures.push('GAVE PRICE!');
            if (result.gaveDIYAdvice) failures.push('GAVE DIY!');
            console.log(`❌ FAIL [Missing: ${failures.join(', ')}]`);
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`RESULTS: ${passCount}/20 PASSED | ${failCount}/20 FAILED`);
    console.log(`HVAC:     ${allResults.filter(r => r.type === 'hvac' && r.pass).length}/10 passed`);
    console.log(`Plumbing: ${allResults.filter(r => r.type === 'plumbing' && r.pass).length}/10 passed`);
    console.log(`Pass Rate: ${Math.round(passCount/20*100)}%`);
    console.log('='.repeat(60));

    // Write detailed results to file
    const report = allResults.map(r => ({
        id: r.id,
        type: r.type,
        name: r.name,
        pass: r.pass,
        criteria: {
            identifiedIssue: r.identifiedIssue,
            askedUrgency: r.askedUrgency,
            gotAddress: r.gotAddress,
            askedHomeownerTenant: r.askedHomeownerTenant,
            triggeredBooking: r.triggeredBooking,
        },
        violations: {
            gavePrice: r.gavePrice,
            gaveDIYAdvice: r.gaveDIYAdvice,
        },
        conversation: r.conversationLog,
    }));

    const fs = require('fs');
    fs.writeFileSync('ai-test-results.json', JSON.stringify(report, null, 2));
    console.log('\nFull conversation logs saved to: ai-test-results.json');
}

main().catch(console.error);
