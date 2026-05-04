// ============================================
// ZEEM AI — Merge Enrichment Data (TDLR + GPT-4o)
// Combines all data sources into final enriched CSV
// ============================================

const fs = require('fs');

// TDLR verified license holder data (FREE public records)
const tdlrData = {
    // Batch 1
    'StrikeForce Heating & Air LLC': { owner: 'Tobijah A. Puttrich', title: 'License Holder', source: 'TDLR', license: 'TACLB00040686E' },
    'Cozy-D Heating & A/C LLC': { owner: 'Thomas Wayne Deason', title: 'License Holder', source: 'TDLR', license: 'TACLB00016822E' },
    'Quigley Heating & Air Conditioning': { owner: 'Troy Brandon Quigley', title: 'License Holder', source: 'TDLR', license: 'TACLA00023686E' },
    'Efficient Home Solutions of Dallas': { owner: 'David A. Rivera', title: 'License Holder', source: 'TDLR', license: 'TACLB00037763E' },
    'Airtron Heating & Air Conditioning': { owner: 'Glen R. Pollock', title: 'License Holder', source: 'TDLR', license: 'TACLA00014513E' },
    'Cool Experts AC and Heating': { owner: 'Gustavo Gonzalez', title: 'License Holder', source: 'TDLR', license: 'TACLA00089058E' },
    'K&S Heating & Air': { owner: 'Stephen B. Sheffield', title: 'License Holder', source: 'TDLR', license: 'TACLB00009033E' },
    'Moss Heating Cooling & Plumbing': { owner: 'Graye Eric Roberts', title: 'License Holder', source: 'TDLR', license: 'TACLA00109995E' },
    'Willard Air Conditioning': { owner: 'Randall Lynn Willard', title: 'License Holder', source: 'TDLR', license: 'TACLA00007382E' },
    'Air Patrol A/C': { owner: 'Afshin Shawn Gazor', title: 'License Holder', source: 'TDLR', license: 'TACLB00023526E' },
    // Batch 2
    'Baker Brothers Plumbing Air & Electric': { owner: 'Robert T. Baker', title: 'License Holder', source: 'TDLR', license: 'TACLB00012351E' },
    'Berkeys Plumbing & HVAC': { owner: 'Christopher Michael Lindsey', title: 'License Holder', source: 'TDLR', license: 'TACLB00021319E' },
    'Houk Air Conditioning': { owner: 'Bobby Houk', title: 'License Holder', source: 'TDLR', license: 'TACLB00003010C' },
    'Infinity Air': { owner: 'Chad Anthony Beshea', title: 'License Holder', source: 'TDLR', license: 'TACLB00070616E' },
    'Milestone Home Service Co.': { owner: 'Justin Taylor Robison', title: 'License Holder', source: 'TDLR', license: 'TACLA00132623E' },
    'Rescue Air and Plumbing': { owner: 'Michael G. Hirsh', title: 'License Holder', source: 'TDLR', license: 'TACLB00056156E' },
    'Texas Air Authorities': { owner: 'Ronald Abramski', title: 'License Holder', source: 'TDLR', license: 'TACLA00023517C' },
};

// GPT-4o enrichment data (from earlier run)
const gptData = {
    'billyGO Air Conditioning & Plumbing': { owner: 'Billy Stevens', title: 'Owner' },
    'Baker Brothers Plumbing Air & Electric': { owner: 'Jimmie Dale', title: 'President' },
    'Rescue Air and Plumbing': { owner: 'Josh Campbell', title: 'Owner' },
    'Public Service Plumbers': { owner: 'David Cross', title: 'Owner' },
    'Dallas Plumbing Company': { owner: 'John Downs', title: 'President' },
    'Metro Flow Plumbing': { owner: 'Dina Sanchez', title: 'Owner' },
    'Reeves Family Plumbing': { owner: 'David Reeves', title: 'Owner' },
    'Sirius Plumbing and Air Conditioning': { owner: 'Brent Garrett', title: 'Owner' },
    'James Armstrong Plumbing': { owner: 'James Armstrong', title: 'Owner' },
    'Reliant Plumbing - Dallas': { owner: 'Max Hicks', title: 'Owner' },
    'Legacy Plumbing': { owner: 'Shaun and Challen Kista', title: 'Owners' },
    'Tempo Air': { owner: 'Steve Saunders', title: 'CEO' },
};

// Browser research data (from earlier manual searches)
const browserData = {
    'Milestone Home Service Co.': { owner: 'Steve Sanders', title: 'CEO' },
    'Benjamin Franklin Plumbing Dallas': { owner: 'Local Franchise', title: 'Manager' },
    'Roto-Rooter Plumbing': { owner: 'National Franchise', title: 'Branch Manager' },
    'One Hour Air Conditioning': { owner: 'Local Franchise', title: 'Manager' },
    'Benjamin Franklin Plumbing Fort Worth': { owner: 'Local Franchise', title: 'Manager' },
    'Berkeys Plumbing & HVAC': { owner: 'Jeff Cox', title: 'Owner' },
    'AAA AUGER Plumbing Services': { owner: 'David Cross', title: 'President' },
    'Lasiter and Lasiter Plumbing': { owner: 'Lasiter Family', title: 'Owner' },
    'ProServe Plumbing': { owner: 'Kenneth A. Golden', title: 'Owner' },
    'Cody & Sons Custom Air': { owner: 'Cody Family', title: 'Owner' },
    'Arthur Hagar Air Conditioning': { owner: 'Arthur Hagar', title: 'Founder' },
    'Groom & Sons\'': { owner: 'Groom Family', title: 'Owner' },
    'Spearman Brothers': { owner: 'Spearman Family', title: 'Owner' },
    'O\'Neill Plumbing': { owner: "O'Neill Family", title: 'Owner' },
    'Sanders Plumbing': { owner: 'Philip Sanders', title: 'Owner' },
    'Rockwater Plumbing': { owner: 'Unknown', title: '' },
    'Webb Air Heating & Cooling': { owner: 'Webb Family', title: 'Owner' },
};

// Read the current enriched CSV
const csv = fs.readFileSync('../prospects_dfw_100_enriched.csv', 'utf8');
const lines = csv.trim().split('\n');
const header = lines[0] + ',Source,License#';

const updatedRows = [];
let totalWithOwner = 0;
let totalWithEmail = 0;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Parse carefully - business name is in quotes
    const match = line.match(/^(\d+),(.*?),(\".*?\"|[^,]*),(.*?),(.*?),(.*?),(\".*?\"|[^,]*),(.*?),(\".*?\"|[^,]*),(.*?),(.*?)$/);
    
    if (!match) {
        updatedRows.push(line + ',,');
        continue;
    }

    const [, num, category, nameQuoted, phone, rating, reviews, address, website, currentOwner, title, email] = match;
    const name = nameQuoted.replace(/"/g, '');
    const cleanCurrentOwner = currentOwner.replace(/"/g, '');
    
    let finalOwner = cleanCurrentOwner;
    let finalTitle = title;
    let source = '';
    let license = '';

    // Priority 1: TDLR data (highest confidence - government records)
    const tdlrMatch = Object.keys(tdlrData).find(k => name.includes(k) || k.includes(name.substring(0, 10)));
    if (tdlrMatch) {
        finalOwner = tdlrData[tdlrMatch].owner;
        finalTitle = tdlrData[tdlrMatch].title;
        source = 'TDLR';
        license = tdlrData[tdlrMatch].license;
    }
    // Priority 2: GPT data (only if TDLR didn't match)
    else {
        const gptMatch = Object.keys(gptData).find(k => name.includes(k) || k.includes(name.substring(0, 10)));
        if (gptMatch && gptData[gptMatch].owner !== 'Unknown') {
            finalOwner = gptData[gptMatch].owner;
            finalTitle = gptData[gptMatch].title;
            source = 'GPT-4o';
        }
        // Priority 3: Browser research
        else {
            const browserMatch = Object.keys(browserData).find(k => name.includes(k) || k.includes(name.substring(0, 10)));
            if (browserMatch && browserData[browserMatch].owner !== 'Unknown') {
                finalOwner = browserData[browserMatch].owner;
                finalTitle = browserData[browserMatch].title;
                source = 'Web';
            }
        }
    }

    // Generate personalized email if we have an owner name
    let finalEmail = email;
    if (finalOwner && finalOwner !== 'Unknown' && !finalOwner.includes('Family') && !finalOwner.includes('Franchise')) {
        const firstName = finalOwner.split(' ')[0].toLowerCase();
        const domain = website && website !== 'unknown' ? website : '';
        if (domain && domain.length > 3) {
            finalEmail = `${firstName}@${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
        }
    }

    if (finalOwner && finalOwner !== 'Unknown') totalWithOwner++;
    if (finalEmail && finalEmail.length > 5) totalWithEmail++;

    updatedRows.push(`${num},${category},"${name}",${phone},${rating},${reviews},${address},${website},"${finalOwner}",${finalTitle},${finalEmail},${source},${license}`);
}

const output = [header, ...updatedRows].join('\n');
fs.writeFileSync('../prospects_dfw_100_enriched.csv', output);

console.log('==================================================');
console.log('MERGED ENRICHMENT COMPLETE');
console.log('==================================================');
console.log('Total accounts:    ' + updatedRows.length);
console.log('With owner name:   ' + totalWithOwner + '/' + updatedRows.length + ' (' + Math.round(totalWithOwner/updatedRows.length*100) + '%)');
console.log('With email:        ' + totalWithEmail + '/' + updatedRows.length + ' (' + Math.round(totalWithEmail/updatedRows.length*100) + '%)');
console.log('');
console.log('Data Sources:');
console.log('  TDLR (government):  ' + Object.keys(tdlrData).length + ' records');
console.log('  GPT-4o:             ' + Object.keys(gptData).length + ' records');
console.log('  Browser research:   ' + Object.keys(browserData).length + ' records');
console.log('');
console.log('Saved to: prospects_dfw_100_enriched.csv');
