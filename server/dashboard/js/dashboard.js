// ============================================
// ZEEM AI — Dashboard JavaScript
// Connects to the admin API and renders data
// ============================================

const API_BASE = '/api/admin';
const API_KEY = 'dev-key'; // Change this in production

const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
};

// =============================================
// NAVIGATION
// =============================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;

        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');

        // Load data for the view
        if (view === 'overview') loadOverview();
        if (view === 'conversations') loadConversations();
        if (view === 'bookings') loadBookings();
        if (view === 'clients') loadClients();
        if (view === 'simulate') loadSimulateView();
        if (view === 'outreach') loadOutreach();
    });
});

// =============================================
// OVERVIEW
// =============================================
async function loadOverview() {
    try {
        const res = await fetch(`${API_BASE}/stats`, { headers });
        const data = await res.json();

        document.getElementById('statClients').textContent = data.clients.total;
        document.getElementById('statBookings').textContent = data.bookings.total;
        document.getElementById('statConversations').textContent = data.conversations.total;
        document.getElementById('statRevenue').textContent = `$${data.revenue.estimated.toLocaleString()}`;

        // Load recent activity
        loadRecentActivity();
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

async function loadRecentActivity() {
    try {
        const [convosRes, bookingsRes] = await Promise.all([
            fetch(`${API_BASE}/conversations`, { headers }),
            fetch(`${API_BASE}/bookings`, { headers }),
        ]);

        const convos = await convosRes.json();
        const bookings = await bookingsRes.json();

        const activityEl = document.getElementById('recentActivity');
        const items = [];

        // Add conversations
        convos.conversations.slice(0, 5).forEach(c => {
            items.push({
                icon: c.status === 'booked' ? '📅' : c.status === 'stopped' ? '🛑' : '💬',
                title: `${c.phoneNumber} — ${c.status}`,
                detail: c.lastMessage || 'No messages',
                time: new Date(c.updatedAt).toLocaleString(),
                date: new Date(c.updatedAt),
            });
        });

        // Add bookings
        bookings.bookings.slice(0, 5).forEach(b => {
            items.push({
                icon: '🎉',
                title: `Booking: ${b.leadName}`,
                detail: `${b.date} at ${b.time}`,
                time: new Date(b.createdAt).toLocaleString(),
                date: new Date(b.createdAt),
            });
        });

        // Sort by date
        items.sort((a, b) => b.date - a.date);

        if (items.length === 0) {
            activityEl.innerHTML = '<div class="empty-state">No activity yet. Test the AI to see data here!</div>';
            return;
        }

        activityEl.innerHTML = items.slice(0, 10).map(item => `
            <div class="activity-item">
                <span class="activity-icon">${item.icon}</span>
                <div class="activity-info">
                    <strong>${item.title}</strong>
                    <small>${item.detail}</small>
                </div>
                <span class="activity-time">${item.time}</span>
            </div>
        `).join('');

    } catch (err) {
        console.error('Failed to load activity:', err);
    }
}

// =============================================
// CONVERSATIONS
// =============================================
async function loadConversations() {
    try {
        const res = await fetch(`${API_BASE}/conversations`, { headers });
        const data = await res.json();

        const el = document.getElementById('conversationsList');

        if (data.conversations.length === 0) {
            el.innerHTML = '<div class="empty-state">No conversations yet. Use the "Test AI" tab to simulate one!</div>';
            return;
        }

        el.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Messages</th>
                        <th>Last Message</th>
                        <th>Updated</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${data.conversations.map(c => `
                        <tr>
                            <td><strong>${c.phoneNumber}</strong></td>
                            <td><span class="status-badge status-${c.status}">${c.status}</span></td>
                            <td>${c.messageCount}</td>
                            <td>${(c.lastMessage || '').substring(0, 60)}...</td>
                            <td>${new Date(c.updatedAt).toLocaleString()}</td>
                            <td><button class="link-btn" onclick="viewConversation('${c.phoneNumber}')">View</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Failed to load conversations:', err);
    }
}

async function viewConversation(phone) {
    try {
        const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(phone)}`, { headers });
        const convo = await res.json();

        document.getElementById('convoModalTitle').textContent = `Conversation with ${phone}`;
        document.getElementById('convoModalMessages').innerHTML = convo.messages.map(m => `
            <div class="replay-msg ${m.role}">
                ${m.content}
                <div class="replay-time">${new Date(m.timestamp).toLocaleTimeString()}</div>
            </div>
        `).join('');

        document.getElementById('convoModal').style.display = 'flex';
    } catch (err) {
        console.error('Failed to load conversation:', err);
    }
}

// =============================================
// BOOKINGS
// =============================================
async function loadBookings() {
    try {
        const res = await fetch(`${API_BASE}/bookings`, { headers });
        const data = await res.json();

        const el = document.getElementById('bookingsList');

        if (data.bookings.length === 0) {
            el.innerHTML = '<div class="empty-state">No bookings yet.</div>';
            return;
        }

        el.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Lead</th>
                        <th>Phone</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Practice Area</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.bookings.map(b => `
                        <tr>
                            <td><strong>${b.leadName}</strong></td>
                            <td>${b.leadPhone}</td>
                            <td>${b.date}</td>
                            <td>${b.time}</td>
                            <td>${b.practiceArea}</td>
                            <td><span class="status-badge status-booked">${b.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Failed to load bookings:', err);
    }
}

// =============================================
// CLIENTS
// =============================================
async function loadClients() {
    try {
        const res = await fetch(`${API_BASE}/clients`, { headers });
        const data = await res.json();

        const el = document.getElementById('clientsList');

        if (data.clients.length === 0) {
            el.innerHTML = '<div class="empty-state">No clients yet.</div>';
            return;
        }

        el.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Firm Name</th>
                        <th>Practice Area</th>
                        <th>Contact</th>
                        <th>Convos</th>
                        <th>Bookings</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.clients.map(c => `
                        <tr>
                            <td><strong>${c.firmName}</strong></td>
                            <td>${c.practiceArea.replace('-', ' ')}</td>
                            <td>${c.contactName}</td>
                            <td>${c.stats.totalConversations}</td>
                            <td>${c.stats.totalBookings}</td>
                            <td><span class="status-badge status-active">${c.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Failed to load clients:', err);
    }
}

// =============================================
// SIMULATE / TEST AI
// =============================================
let simClientId = null;

async function loadSimulateView() {
    try {
        const res = await fetch(`${API_BASE}/clients`, { headers });
        const data = await res.json();

        const select = document.getElementById('simClient');
        select.innerHTML = data.clients.map(c =>
            `<option value="${c.id}">${c.firmName} (${c.practiceArea})</option>`
        ).join('');

        if (data.clients.length > 0) {
            simClientId = data.clients[0].id;
        }

        select.addEventListener('change', () => {
            simClientId = select.value;
        });
    } catch (err) {
        console.error('Failed to load clients for simulate:', err);
    }
}

// Simulate new lead
document.getElementById('simNewLead').addEventListener('click', async () => {
    if (!simClientId) return alert('Select a client first');

    const phone = document.getElementById('simPhone').value;
    const messagesEl = document.getElementById('simMessages');
    messagesEl.innerHTML = '<div class="empty-state">Sending first message...</div>';

    try {
        const res = await fetch(`${API_BASE}/simulate/new-lead`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ phone, clientId: simClientId, name: 'Test Lead' }),
        });
        const data = await res.json();

        messagesEl.innerHTML = `
            <div class="replay-msg assistant">${data.greeting}</div>
        `;
    } catch (err) {
        messagesEl.innerHTML = `<div class="empty-state" style="color:var(--red)">Error: ${err.message}</div>`;
    }
});

// Send simulated message
async function sendSimMessage() {
    if (!simClientId) return alert('Select a client first');

    const input = document.getElementById('simInput');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    const phone = document.getElementById('simPhone').value;
    const messagesEl = document.getElementById('simMessages');

    // Add user message
    const emptyState = messagesEl.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    messagesEl.innerHTML += `<div class="replay-msg user">${message}</div>`;
    messagesEl.innerHTML += `<div class="replay-msg assistant" id="typing" style="opacity:.5">Thinking...</div>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
        const res = await fetch(`${API_BASE}/simulate`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ phone, message, clientId: simClientId }),
        });
        const data = await res.json();

        const typing = document.getElementById('typing');
        if (typing) typing.remove();

        if (data.aiResponse) {
            messagesEl.innerHTML += `<div class="replay-msg assistant">${data.aiResponse}</div>`;
        }
        if (data.booking) {
            messagesEl.innerHTML += `<div class="replay-msg assistant" style="background:rgba(34,197,94,.15);color:var(--green)">📅 BOOKING CREATED: ${data.booking.date} at ${data.booking.time}</div>`;
        }

        messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch (err) {
        const typing = document.getElementById('typing');
        if (typing) typing.remove();
        messagesEl.innerHTML += `<div class="empty-state" style="color:var(--red)">Error: ${err.message}</div>`;
    }
}

document.getElementById('simSend').addEventListener('click', sendSimMessage);
document.getElementById('simInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendSimMessage();
});

// Reset simulation
document.getElementById('simReset').addEventListener('click', () => {
    document.getElementById('simMessages').innerHTML = '<div class="empty-state">Conversation reset. Start fresh!</div>';
    document.getElementById('simPhone').value = '+1555' + Math.floor(1000000 + Math.random() * 9000000);
});

// =============================================
// OUTREACH
// =============================================
const OUTREACH_API = '/api/outreach';
let allProspects = [];
let currentFilter = 'all';
let currentEmailProspectId = null;

async function loadOutreach() {
    await loadOutreachStats();
    await loadProspects();
}

async function loadOutreachStats() {
    try {
        const res = await fetch(`${OUTREACH_API}/stats`, { headers });
        const data = await res.json();

        document.getElementById('outTotal').textContent = data.total;
        document.getElementById('outSent').textContent = data.totalEmailsSent;
        document.getElementById('outReplied').textContent = data.byStatus.replied;
        document.getElementById('outInterested').textContent = data.byStatus.interested;

        // Update pipeline bar
        const total = data.total || 1;
        const segments = [
            { el: 'pipeNew', val: data.byStatus.new },
            { el: 'pipeEmailed', val: data.byStatus.emailed },
            { el: 'pipeReplied', val: data.byStatus.replied },
            { el: 'pipeInterested', val: data.byStatus.interested },
            { el: 'pipeClient', val: data.byStatus.client },
        ];

        segments.forEach(s => {
            const el = document.getElementById(s.el);
            el.textContent = s.val;
            el.style.flex = s.val > 0 ? Math.max(s.val / total, 0.08) : 0;
        });
    } catch (err) {
        console.error('Failed to load outreach stats:', err);
    }
}

async function loadProspects(filter) {
    try {
        const url = filter && filter !== 'all'
            ? `${OUTREACH_API}/prospects?status=${filter}`
            : `${OUTREACH_API}/prospects`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        allProspects = data.prospects;
        renderProspects(allProspects);
    } catch (err) {
        console.error('Failed to load prospects:', err);
    }
}

function renderProspects(prospects) {
    const el = document.getElementById('prospectsList');

    if (prospects.length === 0) {
        el.innerHTML = '<div class="empty-state">No prospects found. Use "Find Prospects" to discover law firms!</div>';
        return;
    }

    el.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Firm</th>
                    <th>Contact</th>
                    <th>City</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Emails</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${prospects.map(p => `
                    <tr>
                        <td>
                            <strong>${p.firmName}</strong>
                            ${p.website ? `<br><small style="color:var(--text3)">${p.website}</small>` : ''}
                        </td>
                        <td>
                            ${p.contactName || '<span style="color:var(--text3)">—</span>'}
                            ${p.contactEmail ? `<br><small style="color:var(--text3)">${p.contactEmail}</small>` : ''}
                        </td>
                        <td>${p.city || '—'}</td>
                        <td>${p.rating ? p.rating + '★' : '—'}</td>
                        <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                        <td>${p.emailsSent || 0}</td>
                        <td>
                            <div class="prospect-actions">
                                ${!p.generatedEmail
            ? `<button class="btn btn-primary" onclick="generateEmail('${p.id}')" title="Generate AI email">✍️</button>`
            : `<button class="btn btn-outline" onclick="previewEmail('${p.id}')" title="View email">👁</button>`
        }
                                <button class="btn btn-outline" onclick="editProspect('${p.id}')" title="Edit">✏️</button>
                                <button class="btn btn-outline" onclick="deleteProspect('${p.id}')" title="Delete" style="color:var(--red)">🗑</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Find Prospects
document.getElementById('outFindBtn').addEventListener('click', async () => {
    const city = document.getElementById('outCity').value.trim();
    if (!city) return alert('Enter a city name (e.g. "Houston, TX")');

    const btn = document.getElementById('outFindBtn');
    btn.textContent = '🔍 Searching...';
    btn.disabled = true;
    showOutreachStatus(`Searching for personal injury lawyers in ${city}...`);

    try {
        const res = await fetch(`${OUTREACH_API}/find`, {
            method: 'POST', headers,
            body: JSON.stringify({ city }),
        });
        const data = await res.json();
        showOutreachStatus(`✅ Found ${data.found} firms, ${data.added} new added (${data.duplicatesSkipped} duplicates skipped)`);
        await loadOutreach();
    } catch (err) {
        showOutreachStatus(`❌ Error: ${err.message}`, true);
    } finally {
        btn.textContent = '🔍 Find Prospects';
        btn.disabled = false;
    }
});

// Generate All Emails
document.getElementById('outGenAllBtn').addEventListener('click', async () => {
    const btn = document.getElementById('outGenAllBtn');
    btn.textContent = '✍️ Generating...';
    btn.disabled = true;
    showOutreachStatus('AI is writing personalized emails for all new prospects...');

    try {
        const res = await fetch(`${OUTREACH_API}/generate-emails`, {
            method: 'POST', headers,
        });
        const data = await res.json();
        showOutreachStatus(`✅ Generated ${data.generated} emails (${data.errors} errors)`);
        await loadProspects(currentFilter);
    } catch (err) {
        showOutreachStatus(`❌ Error: ${err.message}`, true);
    } finally {
        btn.textContent = '✍️ Generate All Emails';
        btn.disabled = false;
    }
});

// Enrich All (scrape websites for emails/names)
document.getElementById('outEnrichBtn').addEventListener('click', async () => {
    const btn = document.getElementById('outEnrichBtn');
    btn.textContent = '🔎 Scraping...';
    btn.disabled = true;
    showOutreachStatus('AI is scraping prospect websites for emails and contact names...');

    try {
        const res = await fetch(`${OUTREACH_API}/enrich`, {
            method: 'POST', headers,
        });
        const data = await res.json();
        showOutreachStatus(`✅ Enriched ${data.enriched} out of ${data.total} prospects with emails/names`);
        await loadOutreach();
    } catch (err) {
        showOutreachStatus(`❌ Error: ${err.message}`, true);
    } finally {
        btn.textContent = '🔎 Enrich All';
        btn.disabled = false;
    }
});

// Send Batch
document.getElementById('outSendBatchBtn').addEventListener('click', async () => {
    if (!confirm('Send emails to all prospects with generated emails? (max 10 per batch)')) return;

    const btn = document.getElementById('outSendBatchBtn');
    btn.textContent = '📨 Sending...';
    btn.disabled = true;
    showOutreachStatus('Sending email batch...');

    try {
        const res = await fetch(`${OUTREACH_API}/send-batch?limit=10`, {
            method: 'POST', headers,
        });
        const data = await res.json();
        showOutreachStatus(`✅ Sent ${data.sent} emails (${data.remaining} remaining in queue)`);
        await loadOutreach();
    } catch (err) {
        showOutreachStatus(`❌ Error: ${err.message}`, true);
    } finally {
        btn.textContent = '📨 Send Batch';
        btn.disabled = false;
    }
});

// Generate single email
async function generateEmail(prospectId) {
    showOutreachStatus('✍️ AI is writing a personalized email...');
    try {
        const res = await fetch(`${OUTREACH_API}/generate-email/${prospectId}`, {
            method: 'POST', headers,
        });
        const data = await res.json();
        if (data.ok) {
            showOutreachStatus('✅ Email generated! Click 👁 to preview.');
            await loadProspects(currentFilter);
        }
    } catch (err) {
        showOutreachStatus(`❌ Error: ${err.message}`, true);
    }
}

// Preview email
function previewEmail(prospectId) {
    const prospect = allProspects.find(p => p.id === prospectId);
    if (!prospect || !prospect.generatedEmail) return;

    currentEmailProspectId = prospectId;
    const email = prospect.generatedEmail;

    document.getElementById('emailModalTitle').textContent = `Email to ${prospect.firmName}`;
    document.getElementById('emailSubject').textContent = email.subject;
    document.getElementById('emailTo').textContent = prospect.contactEmail || 'No email set';
    document.getElementById('emailBody').textContent = email.body;
    document.getElementById('followUp1').textContent = email.followUp1 || '—';
    document.getElementById('followUp2').textContent = email.followUp2 || '—';
    document.getElementById('followUp3').textContent = email.followUp3 || '—';

    document.getElementById('emailSendBtn').disabled = !prospect.contactEmail;
    document.getElementById('emailModal').style.display = 'flex';
}

// Send email from modal
document.getElementById('emailSendBtn').addEventListener('click', async () => {
    if (!currentEmailProspectId) return;

    const btn = document.getElementById('emailSendBtn');
    btn.textContent = '📨 Sending...';
    btn.disabled = true;

    try {
        const res = await fetch(`${OUTREACH_API}/send-email/${currentEmailProspectId}`, {
            method: 'POST', headers,
        });
        const data = await res.json();
        if (data.ok) {
            showOutreachStatus('✅ Email sent!');
            document.getElementById('emailModal').style.display = 'none';
            await loadOutreach();
        }
    } catch (err) {
        showOutreachStatus(`❌ Send error: ${err.message}`, true);
    } finally {
        btn.textContent = '📨 Send This Email';
        btn.disabled = false;
    }
});

// Edit prospect (quick inline)
async function editProspect(prospectId) {
    const prospect = allProspects.find(p => p.id === prospectId);
    if (!prospect) return;

    const name = prompt('Contact name:', prospect.contactName || '');
    if (name === null) return;
    const email = prompt('Contact email:', prospect.contactEmail || '');
    if (email === null) return;

    try {
        await fetch(`${OUTREACH_API}/prospects/${prospectId}`, {
            method: 'PUT', headers,
            body: JSON.stringify({ contactName: name, contactEmail: email }),
        });
        showOutreachStatus('✅ Prospect updated');
        await loadProspects(currentFilter);
    } catch (err) {
        showOutreachStatus(`❌ Error: ${err.message}`, true);
    }
}

// Delete prospect
async function deleteProspect(prospectId) {
    if (!confirm('Delete this prospect?')) return;
    try {
        await fetch(`${OUTREACH_API}/prospects/${prospectId}`, {
            method: 'DELETE', headers,
        });
        showOutreachStatus('Prospect deleted');
        await loadOutreach();
    } catch (err) {
        showOutreachStatus(`❌ Error: ${err.message}`, true);
    }
}

// Add Prospect Modal
document.getElementById('outAddBtn').addEventListener('click', () => {
    document.getElementById('addProspectModal').style.display = 'flex';
});

document.getElementById('addProspectSaveBtn').addEventListener('click', async () => {
    const firmName = document.getElementById('addFirmName').value.trim();
    if (!firmName) return alert('Firm name is required');

    try {
        await fetch(`${OUTREACH_API}/add`, {
            method: 'POST', headers,
            body: JSON.stringify({
                firmName,
                contactName: document.getElementById('addContactName').value.trim() || null,
                contactEmail: document.getElementById('addEmail').value.trim() || null,
                phone: document.getElementById('addPhone').value.trim() || null,
                city: document.getElementById('addCity').value.trim() || null,
                website: document.getElementById('addWebsite').value.trim() || null,
            }),
        });
        document.getElementById('addProspectModal').style.display = 'none';
        showOutreachStatus('✅ Prospect added!');
        // Clear form
        ['addFirmName', 'addContactName', 'addEmail', 'addPhone', 'addCity', 'addWebsite'].forEach(id => {
            document.getElementById(id).value = '';
        });
        await loadOutreach();
    } catch (err) {
        showOutreachStatus(`❌ Error: ${err.message}`, true);
    }
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        loadProspects(currentFilter);
    });
});

function showOutreachStatus(msg, isError = false) {
    const el = document.getElementById('outActionStatus');
    el.style.display = 'block';
    el.textContent = msg;
    el.style.background = isError ? 'rgba(239,68,68,.1)' : 'rgba(124,92,252,.1)';
    el.style.color = isError ? 'var(--red)' : 'var(--accent2)';
    setTimeout(() => { el.style.display = 'none'; }, 8000);
}

// =============================================
// INITIAL LOAD
// =============================================
loadOverview();
