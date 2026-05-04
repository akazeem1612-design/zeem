// ============================================
// ZEEM AI — Notification Service
// Sends alerts to attorneys when bookings/leads come in
// Sends confirmation emails to pilots who sign up
// ============================================

const { sendSMS } = require('./sms');

/**
 * Notify the attorney when a new booking is created
 * Sends both SMS (if Twilio configured) and console log
 */
async function notifyAttorneyOfBooking(client, booking) {
    const message = `🎉 New Consultation Booked!\n\n` +
        `Lead: ${booking.leadName}\n` +
        `Phone: ${booking.leadPhone}\n` +
        `Date: ${booking.date} at ${booking.time}\n` +
        `Area: ${booking.practiceArea || client.practiceArea}\n` +
        `\nNotes: ${(booking.notes || '').substring(0, 200)}\n` +
        `\n— Zeem AI`;

    console.log(`\n📣 ATTORNEY NOTIFICATION for ${client.firmName}`);
    console.log(`   ${message.replace(/\n/g, '\n   ')}`);

    // Send SMS to the attorney if their phone is configured
    if (client.contactPhone && client.contactPhone !== '+15551234567') {
        try {
            await sendSMS(client.contactPhone, message, client.twilioNumber);
            console.log(`   ✅ SMS notification sent to attorney at ${client.contactPhone}`);
        } catch (err) {
            console.error(`   ⚠️ Failed to SMS attorney: ${err.message}`);
        }
    }

    // Send email notification if Resend is configured
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && resendKey !== 'your_resend_api_key' && client.contactEmail) {
        try {
            const fromDomain = process.env.RESEND_FROM_DOMAIN || 'onboarding@resend.dev';
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: `Zeem AI <${fromDomain}>`,
                    to: [client.contactEmail],
                    subject: `📅 New Booking: ${booking.leadName} — ${booking.date} at ${booking.time}`,
                    text: message,
                }),
            });
            console.log(`   ✅ Email notification sent to ${client.contactEmail}`);
        } catch (err) {
            console.error(`   ⚠️ Failed to email attorney: ${err.message}`);
        }
    }
}

/**
 * Notify YOU (admin) when a new pilot signs up from the landing page
 */
async function notifyAdminOfNewPilot(formData) {
    const message = `🆕 NEW PILOT SIGNUP!\n\n` +
        `Firm: ${formData.firmName}\n` +
        `Contact: ${formData.contactName}\n` +
        `Email: ${formData.contactEmail}\n` +
        `Phone: ${formData.contactPhone}\n` +
        `Practice Area: ${formData.practiceArea}\n` +
        `Monthly Leads: ${formData.monthlyLeads}\n` +
        `\nSubmitted: ${new Date().toISOString()}`;

    console.log(`\n🚨🚨🚨 NEW PILOT SIGNUP 🚨🚨🚨`);
    console.log(message);

    // Email yourself
    const resendKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

    if (resendKey && resendKey !== 'your_resend_api_key' && adminEmail) {
        try {
            const fromDomain = process.env.RESEND_FROM_DOMAIN || 'onboarding@resend.dev';
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: `Zeem AI Leads <${fromDomain}>`,
                    to: [adminEmail],
                    subject: `🚨 New Pilot: ${formData.firmName} — ${formData.practiceArea}`,
                    text: message,
                }),
            });
            console.log(`   ✅ Admin notification sent to ${adminEmail}`);
        } catch (err) {
            console.error(`   ⚠️ Failed to send admin notification: ${err.message}`);
        }
    }
}

/**
 * Send a welcome email to the new pilot
 */
async function sendPilotWelcomeEmail(formData) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey === 'your_resend_api_key') {
        console.log(`📧 [DEV MODE] Would send welcome email to ${formData.contactEmail}`);
        return;
    }

    const body = `Hi ${formData.contactName.split(' ')[0]},\n\n` +
        `Thank you for signing up for a free Zeem AI pilot! We're excited to set up your custom AI intake agent for ${formData.firmName}.\n\n` +
        `Here's what happens next:\n` +
        `1. Within 24 hours, we'll reach out to learn more about your practice\n` +
        `2. We'll build your custom AI agent (takes 24-48 hours)\n` +
        `3. Your agent goes live — responding to your leads in under 30 seconds, 24/7\n\n` +
        `During the 14-day pilot, we'll handle up to 50 of your leads at absolutely no cost. You'll get a full performance report showing exactly how many consultations were booked.\n\n` +
        `In the meantime, feel free to reply to this email with any questions.\n\n` +
        `Best,\nAbdul from Zeem AI\n` +
        `info@zeem-ai.com`;

    try {
        const fromDomain = process.env.RESEND_FROM_DOMAIN || 'onboarding@resend.dev';
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `Abdul from Zeem AI <${fromDomain}>`,
                to: [formData.contactEmail],
                subject: `Welcome to Zeem AI — Your free pilot starts now 🚀`,
                text: body,
            }),
        });
        console.log(`   ✅ Welcome email sent to ${formData.contactEmail}`);
    } catch (err) {
        console.error(`   ⚠️ Failed to send welcome email: ${err.message}`);
    }
}

module.exports = {
    notifyAttorneyOfBooking,
    notifyAdminOfNewPilot,
    sendPilotWelcomeEmail,
};
