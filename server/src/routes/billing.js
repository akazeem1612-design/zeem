// ============================================
// ZEEM AI — Stripe Billing Routes
// Handles subscriptions, checkout, and webhooks
// ============================================
const express = require('express');
const router = express.Router();
const { getClient, updateClient, getClients } = require('../config/storage');

let stripe = null;
function getStripe() {
    if (!stripe) {
        const Stripe = require('stripe');
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
}

// ---- Auth middleware ----
function requireAuth(req, res, next) {
    const key = req.headers['x-api-key'] || req.query.apiKey;
    if (key !== (process.env.ADMIN_API_KEY || 'dev-key')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

/**
 * POST /api/billing/create-checkout
 * Create a Stripe Checkout session for a client upgrading from free pilot
 */
router.post('/create-checkout', requireAuth, async (req, res) => {
    const { clientId, plan } = req.body;

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key') {
        return res.json({
            ok: false,
            message: 'Stripe not configured. Set STRIPE_SECRET_KEY in .env',
            devMode: true,
        });
    }

    const client = getClient(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const priceId = plan === 'scale'
        ? process.env.STRIPE_SCALE_PRICE_ID
        : process.env.STRIPE_GROWTH_PRICE_ID;

    if (!priceId) {
        return res.status(400).json({ error: 'No Stripe price ID configured for this plan' });
    }

    try {
        const s = getStripe();

        // Create or retrieve Stripe customer
        let customerId = client.stripeCustomerId;
        if (!customerId) {
            const customer = await s.customers.create({
                email: client.contactEmail,
                name: client.firmName,
                metadata: { clientId: client.id, firmName: client.firmName },
            });
            customerId = customer.id;
            updateClient(clientId, { stripeCustomerId: customerId });
        }

        // Create checkout session
        const session = await s.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${req.protocol}://${req.get('host')}/dashboard?billing=success`,
            cancel_url: `${req.protocol}://${req.get('host')}/dashboard?billing=cancelled`,
            metadata: { clientId: client.id },
        });

        res.json({ ok: true, url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Stripe checkout error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/billing/webhook
 * Stripe webhook handler for subscription events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key') {
        return res.json({ ok: true, devMode: true });
    }

    const s = getStripe();
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = s.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Stripe webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const clientId = session.metadata?.clientId;
            if (clientId) {
                updateClient(clientId, {
                    stripeSubscriptionId: session.subscription,
                    billingStatus: 'active',
                    plan: 'growth', // Default to growth, could read from session
                    pilotEndDate: null, // No longer on pilot
                });
                console.log(`💰 Subscription activated for client ${clientId}`);
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            // Find client by subscription ID
            const clients = getClients();
            const clientEntry = Object.values(clients).find(
                c => c.stripeSubscriptionId === subscription.id
            );
            if (clientEntry) {
                updateClient(clientEntry.id, {
                    billingStatus: 'cancelled',
                    status: 'inactive',
                });
                console.log(`⚠️ Subscription cancelled for ${clientEntry.firmName}`);
            }
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            console.log(`❌ Payment failed for customer ${invoice.customer}`);
            break;
        }

        default:
            console.log(`Unhandled Stripe event: ${event.type}`);
    }

    res.json({ received: true });
});

/**
 * GET /api/billing/status/:clientId
 * Get billing status for a client
 */
router.get('/status/:clientId', requireAuth, async (req, res) => {
    const client = getClient(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const now = new Date();
    const pilotEndDate = client.pilotEndDate ? new Date(client.pilotEndDate) : null;
    const isInPilot = pilotEndDate && now < pilotEndDate;
    const pilotExpired = pilotEndDate && now >= pilotEndDate;

    res.json({
        clientId: client.id,
        firmName: client.firmName,
        plan: client.plan || 'pilot',
        billingStatus: client.billingStatus || (isInPilot ? 'pilot' : 'none'),
        isInPilot,
        pilotExpired,
        pilotEndDate: client.pilotEndDate || null,
        stripeCustomerId: client.stripeCustomerId || null,
        hasSubscription: !!client.stripeSubscriptionId,
    });
});

/**
 * POST /api/billing/start-pilot/:clientId
 * Start a 14-day free pilot for a client
 */
router.post('/start-pilot/:clientId', requireAuth, async (req, res) => {
    const client = getClient(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const pilotEnd = new Date();
    pilotEnd.setDate(pilotEnd.getDate() + 14);

    updateClient(client.id, {
        plan: 'pilot',
        billingStatus: 'pilot',
        pilotStartDate: new Date().toISOString(),
        pilotEndDate: pilotEnd.toISOString(),
        status: 'active',
    });

    console.log(`🆓 Pilot started for ${client.firmName} — ends ${pilotEnd.toISOString()}`);
    res.json({
        ok: true,
        pilotStartDate: new Date().toISOString(),
        pilotEndDate: pilotEnd.toISOString(),
    });
});

module.exports = router;
