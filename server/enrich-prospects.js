// ============================================
// ZEEM AI — Enrichment v3 (GPT-4o, aggressive)
// ============================================

require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const csv = fs.readFileSync('../prospects_dfw_100.csv', 'utf8');
const lines = csv.trim().split('\n');
const rows = lines.slice(1).map(line => {
    const parts = line.split(',');
    return { num: parts[0], category: parts[1], name: parts[2], phone: parts[3], rating: parts[4], reviews: parts[5], address: parts[6], website: parts[7] || '' };
});

console.log('Loaded ' + rows.length + ' prospects.');

async function enrichBatch(batch, batchNum) {
    const list = batch.map((r, i) => `${i+1}. "${r.name}" | ${r.address} | ${r.phone} | Web: ${r.website || '?'}`).join('\n');

    const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
            role: 'system',
            content: `You are a business intelligence researcher specializing in DFW-area home services companies. 

IMPORTANT: Many of these are well-known, established companies with decades of history. Their owners appear in BBB listings, Angi profiles, Google Business profiles, Texas Secretary of State filings, and local news articles.

For EACH company, provide:
1. owner_name: The real owner, president, or GM. These are real businesses — most have publicly available ownership info. USE YOUR KNOWLEDGE. Common patterns:
   - Family businesses often have the family name (e.g., "Quigley Heating" is likely owned by someone named Quigley)
   - "Baker Brothers" was founded by the Baker family
   - Check your knowledge of TX SOS filings, BBB profiles, news articles
   - If truly unknown after considering all sources, say "Unknown"
2. title: Their title (Owner, President, GM, etc.)
3. email: Best contact email. Use the company domain if known.
4. website: Company website domain

Return JSON: {"results": [{"company":"name","owner_name":"name","title":"title","email":"email","website":"domain"}, ...]}`
        }, {
            role: 'user',
            content: `Research these ${batch.length} DFW companies:\n\n${list}`
        }],
        temperature: 0.4,
        max_tokens: 4000,
    });

    const raw = resp.choices[0].message.content;
    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON');
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.results || [];
    } catch (e) {
        console.log('  Parse error batch ' + batchNum);
        return [];
    }
}

async function main() {
    const allEnriched = [];

    for (let i = 0; i < rows.length; i += 25) {
        const batchNum = Math.floor(i / 25) + 1;
        const batch = rows.slice(i, i + 25);
        console.log('Batch ' + batchNum + '/4 (' + (i+1) + '-' + Math.min(i+25, rows.length) + ')...');
        
        try {
            const results = await enrichBatch(batch, batchNum);
            console.log('  Results: ' + results.length);
            
            for (let j = 0; j < batch.length; j++) {
                const orig = batch[j];
                const e = results[j] || {};
                const ownerName = e.owner_name || e.owner || 'Unknown';
                allEnriched.push({
                    ...orig,
                    owner_name: ownerName,
                    title: e.title || '',
                    email: e.email || '',
                    enriched_website: e.website || orig.website || '',
                });
            }
            
            const found = results.filter(r => {
                const name = r.owner_name || r.owner || '';
                return name && name !== 'Unknown' && name.length > 2;
            }).length;
            console.log('  Owners found: ' + found + '/' + batch.length);
        } catch (err) {
            console.log('  ERROR: ' + err.message);
            batch.forEach(orig => allEnriched.push({ ...orig, owner_name: 'Unknown', title: '', email: '', enriched_website: '' }));
        }
    }

    // Write CSV
    const hdr = '#,Category,Business Name,Phone,Rating,Reviews,Address/City,Website,Owner/Manager,Title,Email';
    const csvRows = allEnriched.map(r => 
        [r.num, r.category, '"' + r.name + '"', r.phone, r.rating, r.reviews, '"' + r.address + '"', r.enriched_website, '"' + r.owner_name + '"', r.title, r.email].join(',')
    );
    fs.writeFileSync('../prospects_dfw_100_enriched.csv', [hdr, ...csvRows].join('\n'));

    const withOwner = allEnriched.filter(r => r.owner_name && r.owner_name !== 'Unknown' && r.owner_name.length > 2).length;
    const withEmail = allEnriched.filter(r => r.email && r.email.length > 3).length;

    console.log('\n==================================================');
    console.log('ENRICHMENT COMPLETE');
    console.log('==================================================');
    console.log('Total:       ' + allEnriched.length);
    console.log('With owner:  ' + withOwner + '/' + allEnriched.length + ' (' + Math.round(withOwner/allEnriched.length*100) + '%)');
    console.log('With email:  ' + withEmail + '/' + allEnriched.length + ' (' + Math.round(withEmail/allEnriched.length*100) + '%)');
    console.log('\nSaved to: prospects_dfw_100_enriched.csv');
}

main().catch(err => console.log('FATAL: ' + err.message));
