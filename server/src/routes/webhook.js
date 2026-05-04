// ============================================
// ZEEM AI — Twilio Webhook Routes
// Receives incoming SMS messages and triggers AI
// ============================================
const express = require('express');
const router = express.Router();
const { generateResponse, handleNewLead } = require('../services/ai');
const { sendSMS } = require('../services/sms');
const { getClientByPhone, getConversation } = require('../config/storage');

/**
 * POST /api/webhook/sms
 * Twilio sends a POST request here when a text message is received
 * 
 * Twilio sends these fields:
 * - From: sender's phone number
 * - To: your Twilio number
 * - Body: the text message content
 */
router.post('/sms', async (req, res) => {
    const { From: fromNumber, To: toNumber, Body: messageBody } = req.body;

    console.log(`\n📨 INCOMING SMS`);
    console.log(`   From: ${fromNumber}`);
    console.log(`   To:   ${toNumber}`);
    console.log(`   Body: ${messageBody}`);

    // Immediately respond to Twilio (they expect a quick response)
    // We use TwiML empty response — we'll send our reply as a separate message
    res.type('text/xml');
    res.send('<Response></Response>');

    try {
        // 1. Find which client owns this Twilio number
        const client = getClientByPhone(toNumber);
        if (!client) {
            console.log(`⚠️ No client found for number ${toNumber}`);
            return;
        }

        // 2. Generate AI response
        const result = await generateResponse(fromNumber, messageBody, client.id);

        // 3. If AI has a response, send it
        if (result.response && !result.shouldStop) {
            // Add a small delay to feel more human (not instant = robot)
            const delay = Math.random() * 3000 + 2000; // 2-5 seconds
            setTimeout(async () => {
                await sendSMS(fromNumber, result.response, toNumber);
            }, delay);
        }

        // 4. If a booking was made, log it
        if (result.booking) {
            console.log(`🎉 NEW BOOKING: ${result.booking.leadName} → ${client.firmName}`);
            console.log(`   Date: ${result.booking.date} at ${result.booking.time}`);
        }

    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
});

/**
 * POST /api/webhook/new-lead
 * Receives a new lead from Facebook/Google ads or website form
 * Triggers the AI to send the FIRST message to the lead
 * 
 * Expected body:
 * {
 *   "phone": "+1234567890",
 *   "clientId": "uuid-of-client",
 *   "name": "John Doe" (optional),
 *   "email": "john@email.com" (optional),
 *   "source": "facebook" (optional)
 * }
 */
router.post('/new-lead', async (req, res) => {
    const { phone, clientId, name, email, source } = req.body;

    if (!phone || !clientId) {
        return res.status(400).json({ error: 'phone and clientId are required' });
    }

    console.log(`\n🆕 NEW LEAD`);
    console.log(`   Phone: ${phone}`);
    console.log(`   Name:  ${name || 'Unknown'}`);
    console.log(`   Source: ${source || 'Unknown'}`);

    try {
        // Check if we already have a conversation with this number
        const existing = getConversation(phone);
        if (existing) {
            return res.json({
                ok: true,
                message: 'Lead already has an active conversation',
                conversationId: existing.id,
            });
        }

        // Generate the first message
        const greeting = await handleNewLead(phone, clientId, { name, email });

        // Send it via SMS
        const client = require('../config/storage').getClient(clientId);
        await sendSMS(phone, greeting, client.twilioNumber);

        res.json({
            ok: true,
            message: 'First message sent to lead',
            greeting,
        });

    } catch (error) {
        console.error('❌ New lead error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/webhook/facebook
 * Facebook Lead Ads webhook handler
 * Facebook sends lead data here when someone fills out a lead form
 */
router.post('/facebook', async (req, res) => {
    const { entry } = req.body;

    // Facebook verification challenge
    if (req.query['hub.mode'] === 'subscribe') {
        const challenge = req.query['hub.challenge'];
        const token = req.query['hub.verify_token'];
        if (token === process.env.FB_VERIFY_TOKEN) {
            return res.send(challenge);
        }
        return res.status(403).send('Invalid token');
    }

    console.log('📘 Facebook webhook received');

    try {
        if (entry && entry.length > 0) {
            for (const e of entry) {
                if (e.changes) {
                    for (const change of e.changes) {
                        if (change.field === 'leadgen') {
                            const leadId = change.value.leadgen_id;
                            console.log(`   Lead ID: ${leadId}`);
                            // In production, you'd fetch lead details from Facebook Graph API
                            // and then call the /new-lead endpoint
                        }
                    }
                }
            }
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('❌ Facebook webhook error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Facebook webhook verification
router.get('/facebook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === (process.env.FB_VERIFY_TOKEN || 'zeem-ai-verify')) {
        res.send(challenge);
    } else {
        res.status(403).send('Forbidden');
    }
});

module.exports = router;
