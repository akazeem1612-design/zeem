// ============================================
// ZEEM AI — Pilot Signup Routes
// Handles form submissions from the landing page
// ============================================
const express = require('express');
const router = express.Router();
const { createClient } = require('../config/storage');
const { notifyAdminOfNewPilot, sendPilotWelcomeEmail } = require('../services/notifications');
const fs = require('fs');
const path = require('path');

const LEADS_FILE = path.join(__dirname, '../../data/leads.json');

/**
 * POST /api/pilot/signup
 * Handles the "Start Free Pilot" form submission from the landing page
 */
router.post('/signup', async (req, res) => {
    const { firmName, practiceArea, contactName, contactPhone, contactEmail, monthlyLeads } = req.body;

    // Validate required fields
    if (!firmName || !practiceArea || !contactName || !contactEmail) {
        return res.status(400).json({
            error: 'Missing required fields',
            required: ['firmName', 'practiceArea', 'contactName', 'contactEmail'],
        });
    }

    const formData = {
        firmName,
        practiceArea,
        contactName,
        contactPhone: contactPhone || null,
        contactEmail,
        monthlyLeads: monthlyLeads || 'unknown',
        submittedAt: new Date().toISOString(),
        source: 'landing-page',
        status: 'new',
    };

    console.log(`\n🚀 NEW PILOT SIGNUP`);
    console.log(`   Firm: ${firmName}`);
    console.log(`   Contact: ${contactName} (${contactEmail})`);
    console.log(`   Practice Area: ${practiceArea}`);
    console.log(`   Monthly Leads: ${monthlyLeads}`);

    // 1. Save to leads file (persistent record)
    try {
        let leads = [];
        if (fs.existsSync(LEADS_FILE)) {
            leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
        }

        // Check for duplicate email
        const existing = leads.find(l => l.contactEmail === contactEmail);
        if (existing) {
            return res.json({
                ok: true,
                message: 'You\'ve already signed up! We\'ll be in touch soon.',
                duplicate: true,
            });
        }

        leads.push(formData);
        const dir = path.dirname(LEADS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
        console.log(`   ✅ Lead saved to ${LEADS_FILE}`);
    } catch (err) {
        console.error(`   ⚠️ Failed to save lead: ${err.message}`);
    }

    // 2. Notify admin (you) via email
    notifyAdminOfNewPilot(formData).catch(err => {
        console.error('Admin notification failed:', err.message);
    });

    // 3. Send welcome email to the firm
    sendPilotWelcomeEmail(formData).catch(err => {
        console.error('Welcome email failed:', err.message);
    });

    // 4. Respond to the frontend
    res.json({
        ok: true,
        message: 'Welcome to Zeem AI! We\'ll reach out within 24 hours to set up your custom AI agent.',
        firmName,
    });
});

/**
 * GET /api/pilot/leads
 * Admin-only: view all pilot signups
 */
router.get('/leads', (req, res) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const validKey = process.env.ADMIN_API_KEY || 'dev-key';

    if (apiKey !== validKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        let leads = [];
        if (fs.existsSync(LEADS_FILE)) {
            leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
        }
        res.json({ leads, total: leads.length });
    } catch (err) {
        res.json({ leads: [], total: 0 });
    }
});

module.exports = router;
