// ============================================
// ZEEM AI — Outreach Routes
// Manages prospect discovery, email campaigns, and tracking
// ============================================
const express = require('express');
const router = express.Router();
const { generateColdEmail, sendEmail, findProspects, enrichProspect, enrichAllProspects } = require('../services/outreach');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const PROSPECTS_FILE = path.join(__dirname, '../../data/prospects.json');

// ---- In-memory prospect store ----
let prospects = [];

function loadProspects() {
    try {
        if (fs.existsSync(PROSPECTS_FILE)) {
            prospects = JSON.parse(fs.readFileSync(PROSPECTS_FILE, 'utf-8'));
        }
    } catch (err) {
        console.error('Error loading prospects:', err.message);
        prospects = [];
    }
    return prospects;
}

function saveProspects() {
    const dir = path.dirname(PROSPECTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROSPECTS_FILE, JSON.stringify(prospects, null, 2), 'utf-8');
}

// Load on startup
loadProspects();

// ---- Auth middleware ----
function requireAuth(req, res, next) {
    const key = req.headers['x-api-key'];
    if (key !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

router.use(requireAuth);

// ========== PROSPECTS ==========

/**
 * GET /api/outreach/prospects
 * List all prospects with optional status filter
 */
router.get('/prospects', (req, res) => {
    const { status, city } = req.query;
    let filtered = [...prospects];
    if (status) filtered = filtered.filter(p => p.status === status);
    if (city) filtered = filtered.filter(p => p.city.toLowerCase().includes(city.toLowerCase()));

    res.json({
        prospects: filtered,
        total: filtered.length,
        stats: {
            new: prospects.filter(p => p.status === 'new').length,
            emailed: prospects.filter(p => p.status === 'emailed').length,
            replied: prospects.filter(p => p.status === 'replied').length,
            interested: prospects.filter(p => p.status === 'interested').length,
            client: prospects.filter(p => p.status === 'client').length,
            rejected: prospects.filter(p => p.status === 'rejected').length,
        }
    });
});

/**
 * POST /api/outreach/find
 * AI-powered prospect discovery — finds law firms in a given city
 */
router.post('/find', async (req, res) => {
    const { city, practiceArea } = req.body;
    if (!city) return res.status(400).json({ error: 'city is required' });

    console.log(`\n🔍 Searching for ${practiceArea || 'personal injury'} lawyers in ${city}...`);

    try {
        const found = await findProspects(city, practiceArea || 'personal injury');

        // Avoid duplicates
        const existingNames = new Set(prospects.map(p => p.firmName.toLowerCase()));
        const newProspects = found.filter(p => !existingNames.has(p.firmName.toLowerCase()));

        prospects.push(...newProspects);
        saveProspects();

        console.log(`✅ Found ${found.length} firms, ${newProspects.length} new`);

        // Auto-enrich: scrape websites for emails and names
        let enriched = 0;
        const toEnrich = newProspects.filter(p => p.website);
        if (toEnrich.length > 0) {
            console.log(`🔍 Auto-enriching ${toEnrich.length} prospects with websites...`);
            const enrichResult = await enrichAllProspects(toEnrich);
            enriched = enrichResult.enriched;
            // Apply enrichment updates back to prospects array
            for (const update of enrichResult.results) {
                const idx = prospects.findIndex(p => p.id === update.id);
                if (idx !== -1) {
                    if (update.contactEmail) prospects[idx].contactEmail = update.contactEmail;
                    if (update.contactName) prospects[idx].contactName = update.contactName;
                }
            }
            saveProspects();
        }

        res.json({
            found: found.length,
            added: newProspects.length,
            duplicatesSkipped: found.length - newProspects.length,
            enriched,
            prospects: newProspects,
        });
    } catch (error) {
        console.error('❌ Prospect search error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/outreach/enrich
 * Auto-enrich all prospects: scrape websites for emails and contact names
 */
router.post('/enrich', async (req, res) => {
    const toEnrich = prospects.filter(p => p.website && (!p.contactEmail || !p.contactName));
    console.log(`\n🔍 Enriching ${toEnrich.length} prospects...`);

    try {
        const result = await enrichAllProspects(toEnrich);

        // Apply updates
        for (const update of result.results) {
            const idx = prospects.findIndex(p => p.id === update.id);
            if (idx !== -1) {
                if (update.contactEmail) prospects[idx].contactEmail = update.contactEmail;
                if (update.contactName) prospects[idx].contactName = update.contactName;
            }
        }
        saveProspects();

        res.json({ ok: true, enriched: result.enriched, total: toEnrich.length });
    } catch (error) {
        console.error('❌ Enrichment error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/outreach/add
 * Manually add a prospect
 */
router.post('/add', (req, res) => {
    const { firmName, contactName, contactEmail, phone, city, website, practiceArea, notes } = req.body;
    if (!firmName) return res.status(400).json({ error: 'firmName is required' });

    const prospect = {
        id: uuidv4(),
        firmName,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        phone: phone || null,
        city: city || null,
        website: website || null,
        practiceArea: practiceArea || 'personal-injury',
        status: 'new',
        emailsSent: 0,
        lastEmailDate: null,
        notes: notes || '',
        source: 'manual',
        generatedEmail: null,
        emailHistory: [],
        createdAt: new Date().toISOString(),
    };

    prospects.push(prospect);
    saveProspects();

    res.json({ ok: true, prospect });
});

/**
 * PUT /api/outreach/prospects/:id
 * Update a prospect (email, status, notes, etc.)
 */
router.put('/prospects/:id', (req, res) => {
    const idx = prospects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Prospect not found' });

    prospects[idx] = { ...prospects[idx], ...req.body };
    saveProspects();

    res.json({ ok: true, prospect: prospects[idx] });
});

/**
 * DELETE /api/outreach/prospects/:id
 */
router.delete('/prospects/:id', (req, res) => {
    const idx = prospects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Prospect not found' });

    prospects.splice(idx, 1);
    saveProspects();

    res.json({ ok: true });
});

// ========== EMAIL CAMPAIGNS ==========

/**
 * POST /api/outreach/generate-email/:id
 * Use AI to generate a personalized cold email for a prospect
 */
router.post('/generate-email/:id', async (req, res) => {
    const prospect = prospects.find(p => p.id === req.params.id);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    console.log(`\n✍️ Generating email for ${prospect.firmName}...`);

    try {
        const email = await generateColdEmail(prospect);
        if (!email) return res.status(500).json({ error: 'Failed to generate email' });

        // Save generated email to prospect
        prospect.generatedEmail = email;
        saveProspects();

        res.json({ ok: true, email });
    } catch (error) {
        console.error('❌ Email generation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/outreach/generate-emails
 * Batch generate emails for all prospects that don't have one
 */
router.post('/generate-emails', async (req, res) => {
    const needsEmail = prospects.filter(p => !p.generatedEmail && p.status === 'new');
    console.log(`\n✍️ Batch generating ${needsEmail.length} emails...`);

    let generated = 0;
    let errors = 0;

    for (const prospect of needsEmail) {
        try {
            const email = await generateColdEmail(prospect);
            if (email) {
                prospect.generatedEmail = email;
                generated++;
            } else {
                errors++;
            }
            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            errors++;
        }
    }

    saveProspects();
    res.json({ ok: true, generated, errors, total: needsEmail.length });
});

/**
 * POST /api/outreach/send-email/:id
 * Send the generated email to a prospect
 */
router.post('/send-email/:id', async (req, res) => {
    const prospect = prospects.find(p => p.id === req.params.id);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
    if (!prospect.contactEmail) return res.status(400).json({ error: 'Prospect has no email address' });
    if (!prospect.generatedEmail) return res.status(400).json({ error: 'No email generated yet — generate one first' });

    try {
        const { subject, body } = prospect.generatedEmail;
        const result = await sendEmail(prospect.contactEmail, subject, body);

        prospect.status = 'emailed';
        prospect.emailsSent++;
        prospect.lastEmailDate = new Date().toISOString();
        prospect.emailHistory = prospect.emailHistory || [];
        prospect.emailHistory.push({
            type: 'initial',
            subject,
            sentAt: new Date().toISOString(),
            messageId: result.id,
        });
        saveProspects();

        res.json({ ok: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/outreach/send-batch
 * Send emails to all prospects with generated emails that haven't been emailed yet
 */
router.post('/send-batch', async (req, res) => {
    const ready = prospects.filter(p =>
        p.status === 'new' &&
        p.generatedEmail &&
        p.contactEmail
    );

    const limit = parseInt(req.query.limit) || 10; // Max per batch
    const batch = ready.slice(0, limit);

    console.log(`\n📨 Sending batch of ${batch.length} emails...`);

    let sent = 0;
    let errors = 0;

    for (const prospect of batch) {
        try {
            const { subject, body } = prospect.generatedEmail;
            const result = await sendEmail(prospect.contactEmail, subject, body);

            prospect.status = 'emailed';
            prospect.emailsSent++;
            prospect.lastEmailDate = new Date().toISOString();
            prospect.emailHistory = prospect.emailHistory || [];
            prospect.emailHistory.push({
                type: 'initial',
                subject,
                sentAt: new Date().toISOString(),
                messageId: result.id,
            });
            sent++;

            // Delay between sends (avoid spam filters)
            await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
            errors++;
        }
    }

    saveProspects();
    res.json({ ok: true, sent, errors, remaining: ready.length - sent });
});

// ========== OUTREACH STATS ==========

/**
 * GET /api/outreach/stats
 */
router.get('/stats', (req, res) => {
    const total = prospects.length;
    const byStatus = {
        new: prospects.filter(p => p.status === 'new').length,
        emailed: prospects.filter(p => p.status === 'emailed').length,
        replied: prospects.filter(p => p.status === 'replied').length,
        interested: prospects.filter(p => p.status === 'interested').length,
        client: prospects.filter(p => p.status === 'client').length,
        rejected: prospects.filter(p => p.status === 'rejected').length,
    };
    const withEmail = prospects.filter(p => p.contactEmail).length;
    const withGeneratedEmail = prospects.filter(p => p.generatedEmail).length;
    const totalEmailsSent = prospects.reduce((sum, p) => sum + (p.emailsSent || 0), 0);

    res.json({
        total,
        byStatus,
        withEmail,
        withGeneratedEmail,
        totalEmailsSent,
        pipeline: {
            readyToGenerate: byStatus.new - withGeneratedEmail,
            readyToSend: prospects.filter(p => p.status === 'new' && p.generatedEmail && p.contactEmail).length,
        }
    });
});

module.exports = router;
