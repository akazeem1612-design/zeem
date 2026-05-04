// ============================================
// ZEEM AI — SMS Campaign Loader
// Loads the SMS opener into the sequence for accounts with owner names
// ============================================

require('dotenv').config();
const fs = require('fs');
const { sendSMS } = require('./src/services/sms');

async function loadSMSCampaign() {
    console.log('Loading SMS Campaign into Twilio (Dev Mode)...');
    
    // Read the enriched CSV
    const csv = fs.readFileSync('../prospects_dfw_100_enriched_final.csv', 'utf8');
    const lines = csv.trim().split('\n');
    
    let accountsLoaded = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        let match = line.match(/^(\d+),(.*?),(\".*?\"|[^,]*),(.*?),(.*?),(.*?),(\".*?\"|[^,]*),(.*?),(\".*?\"|[^,]*),(.*?),(.*?),(.*?),(.*?)$/);
        
        if (!match) {
            const fallbackMatch = line.match(/^(\d+),(.*?),(\".*?\"|[^,]*),(.*?),(.*?),(.*?),(\".*?\"|[^,]*),(.*?),(\".*?\"|[^,]*),(.*?),(.*)$/);
            if (!fallbackMatch) continue;
            match = [...fallbackMatch, '', ''];
        }
        
        let [, num, category, nameQuoted, phone, rating, reviews, address, website, owner, title, email, source, license] = match;
        
        owner = owner.replace(/^"|"$/g, '');
        const company = nameQuoted.replace(/^"|"$/g, '');
        
        // Only load if we have an owner name and it's not "Unknown"
        if (owner && owner !== 'Unknown' && !owner.includes('Franchise')) {
            const firstName = owner.split(' ')[0];
            const yourName = 'Abdul'; // Use the user's name or Zeem AI rep
            
            const smsBody = `Hi ${firstName}, this is ${yourName} — I work with HVAC companies in DFW on recovering missed service calls. Saw ${company} on Google and had a quick idea. Worth a 5-min chat this week?`;
            
            // Format phone number to E.164 if needed, assuming they are somewhat standard in the CSV
            // In dev mode, sendSMS will just log to the console
            await sendSMS(phone, smsBody);
            accountsLoaded++;
        }
    }
    
    console.log('\n==================================================');
    console.log(`SMS CAMPAIGN LOADED`);
    console.log(`Total accounts loaded for SMS: ${accountsLoaded}`);
    console.log('==================================================');
}

loadSMSCampaign().catch(console.error);
