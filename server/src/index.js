// ============================================
// ZEEM AI — Main Server Entry Point
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const calendarRoutes = require('./routes/calendar');
const outreachRoutes = require('./routes/outreach');
const pilotRoutes = require('./routes/pilot');
const billingRoutes = require('./routes/billing');
const { initStorage } = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
// Stripe webhook needs raw body
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
// Twilio sends form-encoded data for webhooks
app.use('/api/webhook', express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// ---- Serve static files ----
// Admin Dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));
// Client Portal
app.use('/portal', express.static(path.join(__dirname, '../dashboard/portal')));
// Shared dashboard CSS (portal references ../css/)
app.use('/portal/css', express.static(path.join(__dirname, '../dashboard/css')));

// Landing page (only if the files exist — they won't on Railway)
const landingPageRoot = path.join(__dirname, '../../');
const fs = require('fs');
if (fs.existsSync(path.join(landingPageRoot, 'index.html'))) {
    app.use('/css', express.static(path.join(landingPageRoot, 'css')));
    app.use('/js', express.static(path.join(landingPageRoot, 'js')));
    app.use('/assets', express.static(path.join(landingPageRoot, 'assets')));
    app.get('/', (req, res) => res.sendFile(path.join(landingPageRoot, 'index.html')));
} else {
    // On Railway, root redirects to dashboard
    app.get('/', (req, res) => res.redirect('/dashboard'));
}

// ---- API Routes ----
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/pilot', pilotRoutes);
app.use('/api/billing', billingRoutes);

// ---- Health Check ----
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'zeem-ai',
        timestamp: new Date().toISOString(),
        clients: Object.keys(require('./config/storage').getClients()).length
    });
});

// ---- Start Server ----
async function start() {
    console.log('Initializing storage...');
    await initStorage();
    console.log('Storage ready.');

    // Bind to 0.0.0.0 — required for Railway/Docker
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`⚡ ZEEM AI SERVER running on port ${PORT}`);
        console.log(`   Dashboard:  /dashboard`);
        console.log(`   Portal:     /portal`);
        console.log(`   Health:     /api/health`);
        console.log(`   Webhook:    /api/webhook/sms`);
        console.log(`   Outreach:   /api/outreach`);
        console.log(`   Pilot:      /api/pilot/signup`);
        console.log(`   Billing:    /api/billing`);
    });
}

start().catch(err => {
    console.error('FATAL STARTUP ERROR:', err);
    process.exit(1);
});
