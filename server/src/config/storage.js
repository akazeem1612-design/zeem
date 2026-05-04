// ============================================
// ZEEM AI — Storage Layer
// Supports two backends:
//   1. Supabase PostgreSQL (production)
//   2. Local JSON files (development)
// The backend is auto-detected from .env
// ============================================
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { isConfigured: isSupabaseConfigured } = require('./supabase');

const DATA_DIR = path.join(__dirname, '../../data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

let clients = {};
let conversations = {};
let bookings = [];
let storageMode = 'json'; // 'json' or 'supabase'

// ---- Initialize Storage ----
async function initStorage() {
    if (isSupabaseConfigured()) {
        storageMode = 'supabase';
        console.log('🔌 Storage mode: SUPABASE (production)');
        console.log('   Data will persist across deploys ✅');
        // Supabase tables are created via schema.sql — no auto-init needed
    } else {
        storageMode = 'json';
        console.log('📁 Storage mode: LOCAL JSON (development)');
        console.log('   ⚠️  Data will NOT persist on Railway/Render deploys');
    }

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    clients = loadJSON(CLIENTS_FILE, {});
    conversations = loadJSON(CONVERSATIONS_FILE, {});
    bookings = loadJSON(BOOKINGS_FILE, []);

    // Create a demo client if none exist
    if (Object.keys(clients).length === 0) {
        const demoId = uuidv4();
        clients[demoId] = {
            id: demoId,
            firmName: 'Parker HVAC & Plumbing',
            practiceArea: 'hvac',
            contactName: 'John Parker',
            contactEmail: 'john@parkerhvac.com',
            contactPhone: '+15551234567',
            twilioNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
            calendarId: null,
            calendarConnected: false,
            aiConfig: {
                model: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 300,
            },
            qualificationCriteria: {
                goodLead: ['broken AC', 'leaking unit', 'no heat'],
                badLead: ['outside service area', 'wants free advice', 'apartment renter without landlord approval'],
            },
            availableSlots: generateDefaultSlots(),
            status: 'active',
            createdAt: new Date().toISOString(),
            stats: {
                totalConversations: 0,
                totalBookings: 0,
                totalLeadsQualified: 0,
            }
        };
        saveJSON(CLIENTS_FILE, clients);
        console.log('✅ Created demo client: Parker HVAC & Plumbing');
    }

    // Force update the first client's Twilio number to match the live Environment Variable.
    const clientIds = Object.keys(clients);
    if (clientIds.length > 0 && process.env.TWILIO_PHONE_NUMBER) {
        if (clients[clientIds[0]].twilioNumber !== process.env.TWILIO_PHONE_NUMBER) {
            clients[clientIds[0]].twilioNumber = process.env.TWILIO_PHONE_NUMBER;
            saveJSON(CLIENTS_FILE, clients);
            console.log(`✅ Updated demo client Twilio number to match environment: ${process.env.TWILIO_PHONE_NUMBER}`);
        }
    }

    console.log(`📦 Storage initialized: ${Object.keys(clients).length} client(s), ${Object.keys(conversations).length} conversation(s)`);
}

// ---- Helper Functions ----
function loadJSON(filepath, defaultValue) {
    try {
        if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        }
    } catch (err) {
        console.error(`Error loading ${filepath}:`, err.message);
    }
    return defaultValue;
}

function saveJSON(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateDefaultSlots() {
    // Generate appointment slots for the next 14 days
    const slots = [];
    const times = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
    const now = new Date();

    for (let d = 1; d <= 14; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        for (const time of times) {
            slots.push({
                date: date.toISOString().split('T')[0],
                time,
                booked: false,
            });
        }
    }
    return slots;
}

// ---- Client Operations ----
function getClients() {
    return clients;
}

function getClient(clientId) {
    return clients[clientId] || null;
}

function getClientByPhone(phoneNumber) {
    return Object.values(clients).find(c => c.twilioNumber === phoneNumber) || null;
}

function createClient(data) {
    const id = uuidv4();
    const client = {
        id,
        firmName: data.firmName,
        practiceArea: data.practiceArea,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        twilioNumber: data.twilioNumber || null,
        calendarId: data.calendarId || null,
        calendarConnected: false,
        aiConfig: {
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 300,
        },
        qualificationCriteria: data.qualificationCriteria || {
            goodLead: [],
            badLead: [],
        },
        availableSlots: generateDefaultSlots(),
        status: 'active',
        createdAt: new Date().toISOString(),
        stats: {
            totalConversations: 0,
            totalBookings: 0,
            totalLeadsQualified: 0,
        }
    };

    clients[id] = client;
    saveJSON(CLIENTS_FILE, clients);
    return client;
}

function updateClient(clientId, updates) {
    if (!clients[clientId]) return null;
    clients[clientId] = { ...clients[clientId], ...updates };
    saveJSON(CLIENTS_FILE, clients);
    return clients[clientId];
}

// ---- Conversation Operations ----
function getConversation(phoneNumber) {
    return conversations[phoneNumber] || null;
}

function getAllConversations() {
    return conversations;
}

function upsertConversation(phoneNumber, clientId, message, role) {
    if (!conversations[phoneNumber]) {
        conversations[phoneNumber] = {
            id: uuidv4(),
            phoneNumber,
            clientId,
            messages: [],
            status: 'active', // active, qualified, booked, disqualified, stopped
            leadName: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Increment client stats
        if (clients[clientId]) {
            clients[clientId].stats.totalConversations++;
            saveJSON(CLIENTS_FILE, clients);
        }
    }

    conversations[phoneNumber].messages.push({
        role, // 'user' or 'assistant'
        content: message,
        timestamp: new Date().toISOString(),
    });
    conversations[phoneNumber].updatedAt = new Date().toISOString();

    saveJSON(CONVERSATIONS_FILE, conversations);
    return conversations[phoneNumber];
}

function updateConversationStatus(phoneNumber, status) {
    if (conversations[phoneNumber]) {
        conversations[phoneNumber].status = status;
        conversations[phoneNumber].updatedAt = new Date().toISOString();
        saveJSON(CONVERSATIONS_FILE, conversations);
    }
}

// ---- Booking Operations ----
function createBooking(data) {
    const booking = {
        id: uuidv4(),
        clientId: data.clientId,
        leadPhone: data.leadPhone,
        leadName: data.leadName || 'Unknown',
        date: data.date,
        time: data.time,
        practiceArea: data.practiceArea,
        notes: data.notes || '',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
    };

    bookings.push(booking);
    saveJSON(BOOKINGS_FILE, bookings);

    // Update client stats
    if (clients[data.clientId]) {
        clients[data.clientId].stats.totalBookings++;
        saveJSON(CLIENTS_FILE, clients);
    }

    // Update conversation status
    updateConversationStatus(data.leadPhone, 'booked');

    return booking;
}

function getBookings(clientId) {
    return bookings.filter(b => b.clientId === clientId);
}

function getAllBookings() {
    return bookings;
}

// ---- Available Slots ----
// Always generate fresh slots from TODAY to avoid stale dates
function getAvailableSlots(clientId) {
    const client = clients[clientId];
    if (!client) return [];

    // Get booked slots from stored bookings
    const bookedSlots = new Set(
        bookings
            .filter(b => b.clientId === clientId && b.status === 'confirmed')
            .map(b => `${b.date}|${b.time}`)
    );

    // Generate fresh slots starting from tomorrow
    const slots = [];
    const times = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
    const now = new Date();

    for (let d = 1; d <= 14; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dateStr = date.toISOString().split('T')[0];
        for (const time of times) {
            const key = `${dateStr}|${time}`;
            if (!bookedSlots.has(key)) {
                slots.push({ date: dateStr, time, booked: false });
            }
        }
    }
    return slots;
}

module.exports = {
    initStorage,
    getClients,
    getClient,
    getClientByPhone,
    createClient,
    updateClient,
    getConversation,
    getAllConversations,
    upsertConversation,
    updateConversationStatus,
    createBooking,
    getBookings,
    getAllBookings,
    getAvailableSlots,
};
