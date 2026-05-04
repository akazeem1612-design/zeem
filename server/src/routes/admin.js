// ============================================
// ZEEM AI — Admin API Routes
// Manage clients, view conversations, track bookings
// ============================================
const express = require('express');
const router = express.Router();
const { getClients, getClient, createClient, updateClient,
    getAllConversations, getConversation,
    getAllBookings, getBookings, getAvailableSlots } = require('../config/storage');
const { sendSMS } = require('../services/sms');
const { handleNewLead } = require('../services/ai');

// ---- Simple API key auth ----
function requireAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const validKey = process.env.ADMIN_API_KEY || 'dev-key';

    if (apiKey !== validKey) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
}

// Apply auth to all admin routes
router.use(requireAuth);

// =============================================
// CLIENT MANAGEMENT
// =============================================

/**
 * GET /api/admin/clients
 * List all clients
 */
router.get('/clients', (req, res) => {
    const clients = getClients();
    const list = Object.values(clients).map(c => ({
        id: c.id,
        firmName: c.firmName,
        practiceArea: c.practiceArea,
        contactName: c.contactName,
        contactEmail: c.contactEmail,
        twilioNumber: c.twilioNumber,
        status: c.status,
        stats: c.stats,
        createdAt: c.createdAt,
    }));
    res.json({ clients: list, total: list.length });
});

/**
 * GET /api/admin/clients/:id
 * Get a single client with full details
 */
router.get('/clients/:id', (req, res) => {
    const client = getClient(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
});

/**
 * POST /api/admin/clients
 * Create a new client (law firm)
 */
router.post('/clients', (req, res) => {
    const { firmName, practiceArea, contactName, contactEmail, contactPhone, twilioNumber } = req.body;

    if (!firmName || !practiceArea || !contactName || !contactEmail) {
        return res.status(400).json({ error: 'firmName, practiceArea, contactName, and contactEmail are required' });
    }

    const client = createClient({
        firmName,
        practiceArea,
        contactName,
        contactEmail,
        contactPhone,
        twilioNumber,
    });

    console.log(`✅ New client created: ${firmName} (${practiceArea})`);
    res.status(201).json(client);
});

/**
 * PATCH /api/admin/clients/:id
 * Update a client
 */
router.patch('/clients/:id', (req, res) => {
    const updated = updateClient(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Client not found' });
    res.json(updated);
});

// =============================================
// CONVERSATIONS
// =============================================

/**
 * GET /api/admin/conversations
 * List all conversations across all clients
 */
router.get('/conversations', (req, res) => {
    const conversations = getAllConversations();
    const list = Object.values(conversations)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .map(c => ({
            id: c.id,
            phoneNumber: c.phoneNumber,
            clientId: c.clientId,
            status: c.status,
            messageCount: c.messages.length,
            lastMessage: c.messages[c.messages.length - 1]?.content.substring(0, 100),
            leadName: c.leadName,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));

    res.json({ conversations: list, total: list.length });
});

/**
 * GET /api/admin/conversations/:phone
 * Get full conversation with a specific phone number
 */
router.get('/conversations/:phone', (req, res) => {
    const phone = req.params.phone.startsWith('+') ? req.params.phone : '+' + req.params.phone;
    const convo = getConversation(phone);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    res.json(convo);
});

// =============================================
// BOOKINGS
// =============================================

/**
 * GET /api/admin/bookings
 * List all bookings (optionally filter by client)
 */
router.get('/bookings', (req, res) => {
    const { clientId } = req.query;
    const bookingsList = clientId ? getBookings(clientId) : getAllBookings();

    res.json({
        bookings: bookingsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        total: bookingsList.length,
    });
});

// =============================================
// DASHBOARD STATS
// =============================================

/**
 * GET /api/admin/stats
 * Get overview stats for the dashboard
 */
router.get('/stats', (req, res) => {
    const clients = Object.values(getClients());
    const conversations = Object.values(getAllConversations());
    const bookingsList = getAllBookings();

    const totalConversations = conversations.length;
    const activeConversations = conversations.filter(c => c.status === 'active').length;
    const bookedConversations = conversations.filter(c => c.status === 'booked').length;
    const stoppedConversations = conversations.filter(c => c.status === 'stopped').length;

    // Calculate revenue estimate
    const baseFee = clients.length * 297;
    const bookingFee = bookingsList.length * 15;
    const estimatedRevenue = baseFee + bookingFee;

    // Calculate today's activity
    const today = new Date().toISOString().split('T')[0];
    const todayConversations = conversations.filter(c => c.createdAt.startsWith(today)).length;
    const todayBookings = bookingsList.filter(b => b.createdAt.startsWith(today)).length;

    res.json({
        clients: {
            total: clients.length,
            active: clients.filter(c => c.status === 'active').length,
        },
        conversations: {
            total: totalConversations,
            active: activeConversations,
            booked: bookedConversations,
            stopped: stoppedConversations,
            today: todayConversations,
        },
        bookings: {
            total: bookingsList.length,
            today: todayBookings,
        },
        revenue: {
            estimated: estimatedRevenue,
            baseFees: baseFee,
            bookingFees: bookingFee,
        },
    });
});

// =============================================
// TEST / SIMULATE
// =============================================

/**
 * POST /api/admin/simulate
 * Simulate an incoming SMS (for testing without Twilio)
 * 
 * Body: { "phone": "+1234567890", "message": "I was in an accident", "clientId": "..." }
 */
router.post('/simulate', async (req, res) => {
    const { phone, message, clientId } = req.body;

    if (!phone || !message || !clientId) {
        return res.status(400).json({ error: 'phone, message, and clientId are required' });
    }

    try {
        const { generateResponse } = require('../services/ai');
        const result = await generateResponse(phone, message, clientId);

        res.json({
            leadMessage: message,
            aiResponse: result.response,
            shouldStop: result.shouldStop,
            booking: result.booking,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/simulate/new-lead
 * Simulate a new lead coming in (triggers first message)
 */
router.post('/simulate/new-lead', async (req, res) => {
    const { phone, clientId, name } = req.body;

    if (!phone || !clientId) {
        return res.status(400).json({ error: 'phone and clientId are required' });
    }

    try {
        const greeting = await handleNewLead(phone, clientId, { name });
        res.json({ greeting, phone, clientId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
