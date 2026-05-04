// ============================================
// ZEEM AI — Outreach Service
// AI-powered prospect finding, email generation, sending,
// and website scraping for contact info
// ============================================

const { v4: uuidv4 } = require('uuid');

let openai = null;
function getOpenAI() {
    if (!openai) {
        const OpenAI = require('openai');
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
}

/**
 * Generate a personalized cold email for a law firm
 */
async function generateColdEmail(prospect) {
    const ai = getOpenAI();

    const prompt = `You are a cold email copywriter for Zeem AI, an AI-powered lead response service for law firms.

ABOUT ZEEM AI:
- We provide an AI assistant that responds to new leads via SMS in under 5 seconds, 24/7
- It qualifies leads by asking the right questions and books free consultations on the attorney's calendar
- 78% of clients hire the first attorney who responds — we make sure that's YOUR firm
- Pricing: $297/mo, 14-day free trial, $0 setup fee
- The AI handles everything: qualifying, scheduling, follow-up

PROSPECT INFO:
- Firm Name: ${prospect.firmName}
- Attorney Name: ${prospect.contactName || 'the managing partner'}
- Practice Area: ${prospect.practiceArea || 'Personal Injury'}
- City/State: ${prospect.city || 'their area'}
- Website: ${prospect.website || 'N/A'}
- Notes: ${prospect.notes || 'None'}

Write a cold email that:
1. Is SHORT (under 100 words in the body)
2. Opens with something specific about THEIR firm (not generic)
3. Presents ONE clear pain point (slow lead response = lost clients)
4. Mentions ONE impressive stat
5. Ends with a low-commitment CTA (reply for a demo, not "book a call")
6. Sounds human, not salesy. Like a helpful peer, not a vendor.
7. DO NOT use "I hope this email finds you well" or similar clichés

Return a JSON object with these fields:
{
  "subject": "email subject line (under 50 chars, personalized)",
  "body": "the email body in plain text",
  "followUp1": "3-day follow-up email (under 50 words)",
  "followUp2": "7-day follow-up email, different angle (under 50 words)",
  "followUp3": "14-day break-up email (under 40 words)"
}

Return ONLY valid JSON, no markdown.`;

    try {
        const response = await ai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 800,
        });

        const text = response.choices[0].message.content.trim();
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('❌ Email generation error:', error.message);
        return null;
    }
}

/**
 * Send an email via Resend API
 */
async function sendEmail(to, subject, body, fromName = 'Abdul from Zeem AI') {
    const resendKey = process.env.RESEND_API_KEY;

    if (!resendKey || resendKey === 'your_resend_api_key') {
        console.log(`📧 [DEV MODE] Email to ${to}:`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Body: ${body.substring(0, 100)}...`);
        return { id: 'dev-mode', status: 'simulated' };
    }

    try {
        const fromDomain = process.env.RESEND_FROM_DOMAIN || 'onboarding@resend.dev';
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${fromName} <${fromDomain}>`,
                to: [to],
                subject,
                text: body,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Email failed');
        }

        console.log(`📧 Email sent to ${to} | ID: ${result.id}`);
        return { id: result.id, status: 'sent' };
    } catch (error) {
        console.error(`❌ Email error to ${to}:`, error.message);
        throw error;
    }
}

// ============================================
// PROSPECT DISCOVERY
// ============================================

/**
 * Search for law firms using Google Places API (Text Search)
 * Requires GOOGLE_PLACES_API_KEY in env vars
 */
async function findProspects(city, practiceArea = 'personal injury') {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const query = `${practiceArea} lawyer ${city}`;

    if (!apiKey) {
        console.log(`🔍 [NO API KEY] Using AI-powered search for: "${query}"`);
        return await aiFindProspects(city, practiceArea);
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error('Google Places error:', data.status, data.error_message);
            return await aiFindProspects(city, practiceArea);
        }

        const prospects = [];

        for (const place of data.results.slice(0, 20)) {
            // Get details (website, phone) via Place Details API
            let website = null;
            let phone = null;

            if (place.place_id) {
                try {
                    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website,formatted_phone_number&key=${apiKey}`;
                    const detailRes = await fetch(detailUrl);
                    const detailData = await detailRes.json();
                    if (detailData.result) {
                        website = detailData.result.website || null;
                        phone = detailData.result.formatted_phone_number || null;
                    }
                } catch (e) {
                    // Skip detail fetch errors
                }
            }

            prospects.push({
                id: uuidv4(),
                firmName: place.name,
                address: place.formatted_address,
                rating: place.rating || null,
                totalReviews: place.user_ratings_total || 0,
                city,
                practiceArea,
                contactName: null,
                contactEmail: null,
                website,
                phone,
                status: 'new',
                emailsSent: 0,
                lastEmailDate: null,
                notes: `${place.rating ? place.rating + '★' : 'No rating'} | ${place.user_ratings_total || 0} reviews`,
                source: 'google-places',
                createdAt: new Date().toISOString(),
            });
        }

        return prospects;
    } catch (error) {
        console.error('❌ Places search error:', error.message);
        return await aiFindProspects(city, practiceArea);
    }
}

/**
 * AI-powered prospect discovery (fallback when no Google Places API key)
 * Uses OpenAI to generate realistic, research-backed prospect suggestions
 */
async function aiFindProspects(city, practiceArea = 'personal injury') {
    const ai = getOpenAI();

    const prompt = `You are a business research assistant. Find real ${practiceArea} law firms in ${city}.

Search your knowledge for ACTUAL law firms that exist in ${city} specializing in ${practiceArea} law.

Return a JSON array of 10-15 firms. For each firm include:
{
  "firmName": "exact firm name",
  "contactName": "managing partner or lead attorney name if you know it, or null",
  "website": "firm website URL if you know it, or null",
  "phone": "phone number if you know it, or null", 
  "rating": estimated Google rating (4.0-5.0) or null,
  "reviews": estimated number of Google reviews or 0,
  "address": "street address or just the city",
  "notes": "brief note about the firm (size, specialization, notable cases)"
}

IMPORTANT: Only include firms you are confident actually exist. Do NOT make up fictional firms.
If you don't know enough real firms, return fewer results rather than fake ones.

Return ONLY a valid JSON array, no markdown, no explanation.`;

    try {
        const response = await ai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 2000,
        });

        const text = response.choices[0].message.content.trim();
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const firms = JSON.parse(cleaned);

        return firms.map(firm => ({
            id: uuidv4(),
            firmName: firm.firmName,
            address: firm.address || city,
            rating: firm.rating || null,
            totalReviews: firm.reviews || 0,
            city,
            practiceArea,
            contactName: firm.contactName || null,
            contactEmail: null,
            website: firm.website || null,
            phone: firm.phone || null,
            status: 'new',
            emailsSent: 0,
            lastEmailDate: null,
            notes: firm.notes || '',
            source: 'ai-research',
            createdAt: new Date().toISOString(),
        }));
    } catch (error) {
        console.error('❌ AI prospect search error:', error.message);
        return [];
    }
}

// ============================================
// WEBSITE SCRAPING & ENRICHMENT
// ============================================

/**
 * Scrape a law firm's website for contact email addresses
 * Uses simple HTTP fetch + regex — no headless browser needed
 */
async function scrapeWebsiteForEmail(websiteUrl) {
    if (!websiteUrl) return null;

    // Normalize URL
    let url = websiteUrl;
    if (!url.startsWith('http')) url = 'https://' + url;

    const pagesToCheck = [
        url,
        url.replace(/\/$/, '') + '/contact',
        url.replace(/\/$/, '') + '/contact-us',
        url.replace(/\/$/, '') + '/about',
        url.replace(/\/$/, '') + '/about-us',
    ];

    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = new Set();

    for (const pageUrl of pagesToCheck) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(pageUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; ZeemAI/1.0; research bot)',
                },
                redirect: 'follow',
            });
            clearTimeout(timeout);

            if (!response.ok) continue;

            const html = await response.text();

            // Extract emails from HTML
            const matches = html.match(emailRegex) || [];
            matches.forEach(email => {
                const lower = email.toLowerCase();
                // Filter out common non-contact emails
                if (!lower.includes('example.com') &&
                    !lower.includes('sentry.io') &&
                    !lower.includes('wixpress') &&
                    !lower.includes('.png') &&
                    !lower.includes('.jpg') &&
                    !lower.includes('.css') &&
                    !lower.includes('.js') &&
                    !lower.endsWith('.webp') &&
                    !lower.includes('wordpress') &&
                    !lower.includes('schema.org') &&
                    !lower.includes('googleapis') &&
                    !lower.includes('gravatar') &&
                    !lower.includes('w3.org')) {
                    foundEmails.add(lower);
                }
            });

            // Also try to extract from mailto: links
            const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
            const mailtoMatches = html.match(mailtoRegex) || [];
            mailtoMatches.forEach(match => {
                const email = match.replace('mailto:', '').toLowerCase();
                foundEmails.add(email);
            });

            // If we found emails, no need to check more pages
            if (foundEmails.size > 0) break;
        } catch (err) {
            // Timeout or network error — skip this page
            continue;
        }
    }

    // Prioritize: info@, contact@, attorney name emails over generic ones
    const emails = [...foundEmails];
    if (emails.length === 0) return null;

    // Sort: personal emails first, then info/contact, then others
    emails.sort((a, b) => {
        const aScore = a.startsWith('info@') ? 2 : a.startsWith('contact@') ? 2 : 1;
        const bScore = b.startsWith('info@') ? 2 : b.startsWith('contact@') ? 2 : 1;
        return aScore - bScore;
    });

    return emails[0]; // Return the best email
}

/**
 * Scrape a website for the attorney/partner name
 */
async function scrapeWebsiteForName(websiteUrl) {
    if (!websiteUrl) return null;

    let url = websiteUrl;
    if (!url.startsWith('http')) url = 'https://' + url;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZeemAI/1.0; research bot)' },
            redirect: 'follow',
        });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const html = await response.text();

        // Try to extract from common patterns
        // Look for "Attorney Name" or "Founder" or "Managing Partner" patterns
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleTag && titleTag[1]) {
            // Many law firm titles are "Firm Name | Attorney Name"
            const parts = titleTag[1].split(/[|–—-]/);
            if (parts.length > 1) {
                const possibleName = parts[parts.length - 1].trim();
                // Check if it looks like a person name (2-3 words, capitalized)
                if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(possibleName) && possibleName.length < 40) {
                    return possibleName;
                }
            }
        }

        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Auto-enrich a single prospect: scrape website for email and name
 */
async function enrichProspect(prospect) {
    const updates = {};

    if (prospect.website) {
        if (!prospect.contactEmail) {
            const email = await scrapeWebsiteForEmail(prospect.website);
            if (email) {
                updates.contactEmail = email;
                console.log(`   📧 Found email: ${email}`);
            }
        }

        if (!prospect.contactName) {
            const name = await scrapeWebsiteForName(prospect.website);
            if (name) {
                updates.contactName = name;
                console.log(`   👤 Found name: ${name}`);
            }
        }
    }

    return updates;
}

/**
 * Auto-enrich all prospects that need it
 */
async function enrichAllProspects(prospects) {
    let enriched = 0;
    const results = [];

    for (const prospect of prospects) {
        if (prospect.website && (!prospect.contactEmail || !prospect.contactName)) {
            console.log(`🔍 Enriching: ${prospect.firmName} (${prospect.website})`);
            const updates = await enrichProspect(prospect);

            if (Object.keys(updates).length > 0) {
                enriched++;
                results.push({ id: prospect.id, ...updates });
            }

            // Small delay to be polite to websites
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    return { enriched, results };
}

module.exports = {
    generateColdEmail,
    sendEmail,
    findProspects,
    enrichProspect,
    enrichAllProspects,
    scrapeWebsiteForEmail,
};
