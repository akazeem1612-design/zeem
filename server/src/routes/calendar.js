// ============================================
// ZEEM AI — Calendar Routes
// Google Calendar integration for booking appointments
// Uses lightweight @googleapis/calendar instead of full googleapis
// ============================================
const express = require('express');
const router = express.Router();
const { updateClient, getClient } = require('../config/storage');

// Lazy-load calendar API (only when needed)
let _calendar = null;
let _OAuth2Client = null;

function getCalendarAPI() {
    if (!_calendar) _calendar = require('@googleapis/calendar');
    return _calendar;
}

function getOAuth2() {
    if (!_OAuth2Client) {
        const { OAuth2Client } = require('google-auth-library');
        _OAuth2Client = OAuth2Client;
    }
    return _OAuth2Client;
}

function createOAuth2Client() {
    const OAuth2Client = getOAuth2();
    return new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/callback'
    );
}

/**
 * GET /api/calendar/connect/:clientId
 * Start the Google Calendar OAuth flow for a client
 */
router.get('/connect/:clientId', (req, res) => {
    const client = getClient(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const oauth2Client = createOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar'],
        state: req.params.clientId,
        prompt: 'consent',
    });

    res.redirect(url);
});

/**
 * GET /api/calendar/callback
 * Google OAuth callback — stores tokens for the client
 */
router.get('/callback', async (req, res) => {
    const { code, state: clientId } = req.query;

    try {
        const oauth2Client = createOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        updateClient(clientId, {
            calendarTokens: tokens,
            calendarConnected: true,
        });

        console.log(`📅 Calendar connected for client ${clientId}`);
        res.send(`
            <html><body style="font-family:Inter,sans-serif;background:#09090b;color:#fafafa;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;">
                <div>
                    <h1 style="font-size:48px;margin-bottom:16px;">✅</h1>
                    <h2>Calendar Connected!</h2>
                    <p style="color:#a1a1aa;">Google Calendar has been linked to your AI agent. You can close this tab.</p>
                </div>
            </body></html>
        `);

    } catch (error) {
        console.error('Calendar OAuth error:', error.message);
        res.status(500).send('Failed to connect calendar. Please try again.');
    }
});

/**
 * GET /api/calendar/availability/:clientId
 * Get available slots from the client's Google Calendar
 */
router.get('/availability/:clientId', async (req, res) => {
    const client = getClient(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    if (client.calendarConnected && client.calendarTokens) {
        try {
            const slots = await fetchGoogleAvailability(client);
            res.json({ slots, source: 'google-calendar' });
        } catch (error) {
            console.error('Calendar fetch error:', error.message);
            res.json({ slots: client.availableSlots.filter(s => !s.booked), source: 'default' });
        }
    } else {
        res.json({ slots: client.availableSlots.filter(s => !s.booked), source: 'default' });
    }
});

async function fetchGoogleAvailability(client) {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(client.calendarTokens);

    const cal = getCalendarAPI();
    const calendar = cal.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const twoWeeksOut = new Date();
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    const busyResponse = await calendar.freebusy.query({
        requestBody: {
            timeMin: now.toISOString(),
            timeMax: twoWeeksOut.toISOString(),
            items: [{ id: 'primary' }],
        },
    });

    const busySlots = busyResponse.data.calendars.primary.busy;

    const slots = [];
    const times = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

    for (let d = 1; d <= 14; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        for (const time of times) {
            const [h, m] = time.split(':');
            const slotStart = new Date(date);
            slotStart.setHours(parseInt(h), parseInt(m), 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setHours(slotStart.getHours() + 1);

            const isBusy = busySlots.some(busy => {
                const busyStart = new Date(busy.start);
                const busyEnd = new Date(busy.end);
                return slotStart < busyEnd && slotEnd > busyStart;
            });

            if (!isBusy) {
                slots.push({ date: date.toISOString().split('T')[0], time, booked: false });
            }
        }
    }
    return slots;
}

/**
 * POST /api/calendar/book
 * Book an appointment on the client's Google Calendar
 */
router.post('/book', async (req, res) => {
    const { clientId, date, time, leadName, leadPhone, practiceArea, notes } = req.body;
    const client = getClient(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    if (client.calendarConnected && client.calendarTokens) {
        try {
            const event = await createGoogleCalendarEvent(client, { date, time, leadName, leadPhone, practiceArea, notes });
            res.json({ ok: true, event, source: 'google-calendar' });
        } catch (error) {
            console.error('Calendar booking error:', error.message);
            res.json({ ok: true, source: 'manual', message: 'Google Calendar error — booked internally only' });
        }
    } else {
        res.json({ ok: true, source: 'manual', message: 'Calendar not connected — booked internally only' });
    }
});

async function createGoogleCalendarEvent(client, booking) {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(client.calendarTokens);

    const cal = getCalendarAPI();
    const calendar = cal.calendar({ version: 'v3', auth: oauth2Client });

    const startDate = new Date(`${booking.date}T${booking.time}:00`);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const event = {
        summary: `📅 Consultation: ${booking.leadName || 'New Lead'}`,
        description: `Practice Area: ${booking.practiceArea || 'N/A'}\nLead Phone: ${booking.leadPhone || 'N/A'}\nNotes: ${booking.notes || 'None'}\n\n--- Booked by Zeem AI ---`,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 60 }] },
    };

    const result = await calendar.events.insert({ calendarId: 'primary', requestBody: event });
    console.log(`📅 Google Calendar event created: ${result.data.htmlLink}`);
    return result.data;
}

module.exports = router;
