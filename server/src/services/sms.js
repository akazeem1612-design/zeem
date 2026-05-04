// ============================================
// ZEEM AI — SMS Service (Twilio)
// Handles sending and receiving text messages
// ============================================

let twilioClient = null;

function getTwilio() {
    if (!twilioClient) {
        const twilio = require('twilio');
        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
    }
    return twilioClient;
}

/**
 * Send an SMS message via Twilio
 * @param {string} to - Recipient phone number (E.164 format: +1234567890)
 * @param {string} body - Message text
 * @param {string} from - Sender phone number (your Twilio number)
 */
async function sendSMS(to, body, from) {
    // In development without Twilio, just log
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_account_sid') {
        console.log(`📱 [DEV MODE] SMS to ${to}: ${body}`);
        return { sid: 'dev-mode', status: 'sent' };
    }

    try {
        const client = getTwilio();
        const message = await client.messages.create({
            body,
            to,
            from: from || process.env.TWILIO_PHONE_NUMBER,
        });

        console.log(`📱 SMS sent to ${to} | SID: ${message.sid}`);
        return { sid: message.sid, status: message.status };

    } catch (error) {
        console.error(`❌ SMS Error to ${to}:`, error.message);
        throw error;
    }
}

/**
 * Validate Twilio webhook signature (security)
 * Prevents anyone from faking incoming messages
 */
function validateTwilioWebhook(req) {
    if (!process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN === 'your_twilio_auth_token') {
        return true; // Skip validation in dev mode
    }

    const twilio = require('twilio');
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    return twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        req.body
    );
}

module.exports = {
    sendSMS,
    validateTwilioWebhook,
};
