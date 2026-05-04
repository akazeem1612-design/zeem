// ============================================
// ZEEM AI — Self-Contained Zeem Scraper
// Runs the built-in website scraper against all 100 prospects
// ============================================

const fs = require('fs');

async function scrapeWebsiteForEmail(websiteUrl) {
    if (!websiteUrl) return null;
    let url = websiteUrl;
    if (!url.startsWith('http')) url = 'https://' + url;

    const pagesToCheck = [
        url,
        url.replace(/\/$/, '') + '/contact',
        url.replace(/\/$/, '') + '/about'
    ];

    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = new Set();

    for (const pageUrl of pagesToCheck) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(pageUrl, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                redirect: 'follow'
            });
            clearTimeout(timeout);
            if (!response.ok) continue;
            const html = await response.text();

            const matches = html.match(emailRegex) || [];
            matches.forEach(email => {
                const lower = email.toLowerCase();
                if (!lower.includes('example.com') && !lower.includes('wixpress') && !lower.endsWith('.png') && !lower.endsWith('.js')) {
                    foundEmails.add(lower);
                }
            });
            if (foundEmails.size > 0) break;
        } catch (err) {
            continue;
        }
    }

    const emails = [...foundEmails];
    if (emails.length === 0) return null;
    emails.sort((a, b) => {
        const aScore = a.startsWith('info@') ? 2 : a.startsWith('contact@') ? 2 : 1;
        const bScore = b.startsWith('info@') ? 2 : b.startsWith('contact@') ? 2 : 1;
        return aScore - bScore;
    });
    return emails[0];
}

async function scrapeWebsiteForName(websiteUrl) {
    if (!websiteUrl) return null;
    let url = websiteUrl;
    if (!url.startsWith('http')) url = 'https://' + url;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            redirect: 'follow'
        });
        clearTimeout(timeout);
        if (!response.ok) return null;
        const html = await response.text();
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleTag && titleTag[1]) {
            const parts = titleTag[1].split(/[|–—-]/);
            if (parts.length > 1) {
                const possibleName = parts[parts.length - 1].trim();
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

async function main() {
    console.log('Starting Zeem AI built-in scraper...');
    const csv = fs.readFileSync('../prospects_dfw_100_enriched.csv', 'utf8');
    const lines = csv.trim().split('\n');
    const header = lines[0];
    
    let foundEmails = 0;
    let foundNames = 0;
    const updatedRows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        let match = line.match(/^(\d+),(.*?),(\".*?\"|[^,]*),(.*?),(.*?),(.*?),(\".*?\"|[^,]*),(.*?),(\".*?\"|[^,]*),(.*?),(.*?),(.*?),(.*?)$/);
        
        if (!match) {
            const fallbackMatch = line.match(/^(\d+),(.*?),(\".*?\"|[^,]*),(.*?),(.*?),(.*?),(\".*?\"|[^,]*),(.*?),(\".*?\"|[^,]*),(.*?),(.*)$/);
            if (!fallbackMatch) {
                updatedRows.push(line);
                continue;
            }
            match = [...fallbackMatch, '', ''];
        }
        
        let [, num, category, nameQuoted, phone, rating, reviews, address, website, owner, title, email, source, license] = match;
        owner = owner.replace(/^"|"$/g, '');
        
        if (website && website !== 'unknown') {
            const isGenericEmail = email.startsWith('info@') || email.startsWith('service@') || email === '';
            if (isGenericEmail || !email) {
                const scrapedEmail = await scrapeWebsiteForEmail(website);
                if (scrapedEmail) {
                    console.log(`[${num}/100] ${website} -> 📧 ${scrapedEmail}`);
                    email = scrapedEmail;
                    foundEmails++;
                    if (!source) source = 'Zeem Scraper';
                    else source += ' + Zeem Scraper';
                }
            }
            if (owner === 'Unknown' || !owner) {
                const scrapedName = await scrapeWebsiteForName(website);
                if (scrapedName) {
                    console.log(`[${num}/100] ${website} -> 👤 ${scrapedName}`);
                    owner = scrapedName;
                    title = 'Owner/Partner';
                    foundNames++;
                    if (!source) source = 'Zeem Scraper';
                    else source += ' + Zeem Scraper';
                }
            }
        }
        updatedRows.push(`${num},${category},${nameQuoted},${phone},${rating},${reviews},${address},${website},"${owner}",${title},${email},${source || ''},${license || ''}`);
    }
    
    fs.writeFileSync('../prospects_dfw_100_enriched_final.csv', [header, ...updatedRows].join('\n'));
    console.log('\\n==================================================');
    console.log('ZEEM SCRAPER COMPLETE');
    console.log('==================================================');
    console.log(`Scraped ${foundEmails} new valid emails from websites.`);
    console.log(`Scraped ${foundNames} new names from websites.`);
}

main().catch(console.error);
