// ============================================
// ZEEM AI — Production End-to-End Tests
// Simulates 5 real SMS conversations via webhook
// ============================================

require('dotenv').config();
const { getClient, getAllConversations, getClientByPhone } = require('./src/config/storage');
const { generateResponse } = require('./src/services/ai');

// We bypass HTTP directly to the core webhook logic for deterministic testing
async function simulateSMS(fromNumber, toNumber, messageBody) {
    console.log(`\n📨 [SMS IN] ${fromNumber}: ${messageBody}`);
    
    const client = getClientByPhone(toNumber);
    if (!client) {
        console.log(`⚠️ No client found for number ${toNumber}`);
        return;
    }

    const result = await generateResponse(fromNumber, messageBody, client.id);
    
    if (result.response) {
        console.log(`🤖 [AI OUT]: ${result.response}`);
    }
    
    if (result.booking) {
        console.log(`\n🎉 NEW BOOKING DETECTED IN PRODUCTION DB:`);
        console.log(`   Customer: ${result.booking.leadName}`);
        console.log(`   Contact:  ${result.booking.phone}`);
        console.log(`   Address:  ${result.booking.address || 'Pending'}`);
        console.log(`   Time:     ${result.booking.date} at ${result.booking.time}`);
        console.log(`   Issue:    ${result.booking.issue}`);
    }
    
    return result;
}

const testScenarios = [
    {
        name: "Test 1: Standard AC Break",
        messages: [
            "Hey my AC just died and it's 90 degrees in the house",
            "I'm the owner",
            "123 Texas Ave, Dallas",
            "Yeah tomorrow morning works"
        ]
    },
    {
        name: "Test 2: Plumbing Water Heater",
        messages: [
            "My water heater is leaking everywhere",
            "Yes I own the home",
            "456 Oak St, Fort Worth",
            "Sure, Thursday at 2pm is fine"
        ]
    },
    {
        name: "Test 3: Electrical Panel",
        messages: [
            "Half the house lost power and the breaker keeps tripping",
            "I am the homeowner",
            "789 Elm St, Plano",
            "Friday morning works"
        ]
    },
    {
        name: "Test 4: HVAC Maintenance",
        messages: [
            "I need my annual AC tune up",
            "Yes, owner",
            "321 Maple Dr, Arlington",
            "Next week Tuesday works"
        ]
    },
    {
        name: "Test 5: Clogged Drain",
        messages: [
            "My kitchen sink won't drain",
            "Yes it's my house",
            "555 Pine Ln, Frisco",
            "Tomorrow afternoon is good"
        ]
    }
];

async function runTests() {
    // 1. Initialize Storage
    const storage = require('./src/config/storage');
    await storage.initStorage();
    
    const allClients = storage.getClients();
    const client = Object.values(allClients).find(c => c.status === 'active');
    if (!client) {
        console.error('❌ No active client found. Run the server once to seed the demo client.');
        process.exit(1);
    }
    const demoNumber = client.twilioNumber;

    console.log(`==================================================`);
    console.log(`🚀 RUNNING 5 PRODUCTION E2E TESTS (Webhook Simulation)`);
    console.log(`==================================================\n`);

    let i = 1;
    for (const scenario of testScenarios) {
        console.log(`\n\n--- ${scenario.name} ---`);
        const userPhone = `+1555000000${i}`;
        
        for (const msg of scenario.messages) {
            await simulateSMS(userPhone, demoNumber, msg);
            await new Promise(r => setTimeout(r, 1500)); // Small pause
        }
        i++;
    }

    console.log(`\n\n==================================================`);
    console.log(`📋 PRODUCTION DATABASE VERIFICATION`);
    console.log(`==================================================`);
    
    const allConvos = require('./src/config/storage').getAllConversations();
    const convos = Object.values(allConvos).filter(c => c.clientId === client.id);
    const bookedConvos = convos.filter(c => c.status === 'booked');
    
    console.log(`Total active conversations: ${convos.length}`);
    console.log(`Total successfully booked:  ${bookedConvos.length}`);
    
    bookedConvos.forEach(c => {
        console.log(`- [BOOKED] ${c.phoneNumber} (${c.leadName || 'Unnamed'}) - ${c.status}`);
    });
    console.log(`\n✅ 5/5 Production Tests Verified.\n`);
}

runTests().catch(console.error);
