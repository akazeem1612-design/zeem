/* ================================================
   ZEEM AI — MAIN JAVASCRIPT
   Interactive Demo, Calculator, Navigation, Animations
   ================================================ */

// =============================================
// DEMO CONVERSATION DATA (Home Services Pivot)
// =============================================
const demoScenarios = {
    'personal-injury': { // Mapping ID to 'hvac' internally for the UI
        firmName: 'Parker HVAC & Plumbing',
        messages: [
            { type: 'outgoing', text: "Hi, I just got home and my AC is blowing warm air. It's 95 degrees in here and I have kids. Can you help?", delay: 0 },
            { type: 'incoming', text: "Hi there! I'm so sorry to hear that — having no AC in this heat is definitely an emergency. I'm the AI assistant for Parker HVAC & Plumbing. Can I ask you a few quick questions to get a tech out to you?", delay: 1500, callout: 1 },
            { type: 'outgoing', text: "Yes please. What do you need to know?", delay: 3000 },
            { type: 'incoming', text: "I understand. Is the outside unit making any strange noises, or is it just blowing warm air from the vents?", delay: 4500, callout: 2 },
            { type: 'outgoing', text: "It's making a loud humming noise but the fan isn't spinning.", delay: 6000 },
            { type: 'incoming', text: "Got it. That sounds like it could be a capacitor or motor issue. To prevent further damage, please turn the system off at the thermostat for now. I can get a technician to your house to diagnose it today. Our standard diagnostic fee is $89. Would you like to see what times we have available?", delay: 7500 },
            { type: 'outgoing', text: "Yes, ASAP please.", delay: 9000 },
            { type: 'incoming', text: "I have a technician in your area who can be there between 2pm and 4pm today, or I have an opening tomorrow morning at 8am. Which works better for you?", delay: 10500, callout: 3 },
            { type: 'outgoing', text: "2pm to 4pm today works!", delay: 12000 },
            { type: 'incoming', text: "Perfect! You're all set for today between 2:00 PM and 4:00 PM. I've booked you in, and our technician, Mike, will text you when he's 15 minutes away. Is there anything else I can help with?", delay: 13500 },
            { type: 'outgoing', text: "No, thank you so much for the quick response!", delay: 15000 },
            { type: 'incoming', text: "You're very welcome! Stay cool, and Mike will see you soon. ❄️", delay: 16000 },
        ]
    },
    'family-law': { // Mapping ID to 'plumbing'
        firmName: 'Parker HVAC & Plumbing',
        messages: [
            { type: 'outgoing', text: "Help! My water heater is leaking all over the garage floor.", delay: 0 },
            { type: 'incoming', text: "Oh no! I'm sorry to hear that. I'm the assistant for Parker HVAC & Plumbing. I can help get a plumber out to you right away. Do you know where the main water shut-off valve is for the heater?", delay: 1500, callout: 1 },
            { type: 'outgoing', text: "I think so. I'm turning it off now.", delay: 3000 },
            { type: 'incoming', text: "Smart move — that will prevent a lot of damage. Is it a gas or electric water heater, and how old is the unit roughly?", delay: 4500, callout: 2 },
            { type: 'outgoing', text: "It's gas. It's about 12 years old.", delay: 6000 },
            { type: 'incoming', text: "Thanks for that info. At 12 years, it might be time for a replacement, but we'll have our plumber take a look first to see if it's repairable. Would you like to schedule a service call for this afternoon?", delay: 7500 },
            { type: 'outgoing', text: "Yes, I need this fixed today if possible.", delay: 9500 },
            { type: 'incoming', text: "I have a plumber available between 3pm and 5pm today. Does that window work for you?", delay: 11000, callout: 3 },
            { type: 'outgoing', text: "Yes, that works perfectly.", delay: 12500 },
            { type: 'incoming', text: "Great! You're booked for 3pm - 5pm today. I'll send a confirmation text to this number. Our plumber will give you an exact quote once they see the unit. Hang in there! 🚰", delay: 14000 },
        ]
    },
    'criminal-defense': { // Mapping ID to 'electrical'
        firmName: 'Parker HVAC & Plumbing',
        messages: [
            { type: 'outgoing', text: "My kitchen lights keep flickering and one of the breakers won't stay reset. I'm worried it's a fire hazard.", delay: 0 },
            { type: 'incoming', text: "I understand your concern — electrical safety is very important. I'm the assistant for Parker HVAC & Plumbing. We have licensed electricians available. Is there any smell of smoke or burning plastic near the panel?", delay: 1500, callout: 1 },
            { type: 'outgoing', text: "No smell, but the panel feels warm to the touch.", delay: 3000 },
            { type: 'incoming', text: "If the panel is warm, that's definitely something we should look at immediately. Please leave that breaker in the OFF position for now. Can I get an electrician out to you to perform a safety inspection?", delay: 4000, callout: 2 },
            { type: 'outgoing', text: "Yes, please. How soon can someone get here?", delay: 5500 },
            { type: 'incoming', text: "We treat warm panels as a priority. I can have a lead electrician at your door in about 90 minutes. Will someone be home to let them in?", delay: 7000 },
            { type: 'outgoing', text: "Yes, I'll be here.", delay: 9000 },
            { type: 'incoming', text: "Excellent. I've dispatched a technician to you. They should arrive by 12:30 PM. I'll send you a tracking link shortly. Please don't try to force the breaker back on until they arrive. Stay safe! ⚡", delay: 10500, callout: 3 },
            { type: 'outgoing', text: "Thanks, I feel much better now.", delay: 12000 },
            { type: 'incoming', text: "You're in good hands. We'll get it sorted out. See you shortly!", delay: 13500 },
        ]
    }
};

// =============================================
// DOM ELEMENTS
// =============================================
const chatArea = document.getElementById('chatArea');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const startDemoBtn = document.getElementById('startDemo');
const resetDemoBtn = document.getElementById('resetDemo');
const scenarioBtns = document.querySelectorAll('.scenario-btn');
const callouts = [
    document.getElementById('callout1'),
    document.getElementById('callout2'),
    document.getElementById('callout3')
];

let currentScenario = 'personal-injury';
let demoRunning = false;
let demoTimeouts = [];

// =============================================
// DEMO FUNCTIONS
// =============================================
function selectScenario(scenario) {
    currentScenario = scenario;
    scenarioBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scenario === scenario);
    });
}

function clearChat() {
    const dateEl = chatArea.querySelector('.chat-date');
    chatArea.innerHTML = '';
    if (dateEl) chatArea.appendChild(dateEl);
    else {
        const d = document.createElement('div');
        d.className = 'chat-date';
        d.textContent = 'Today';
        chatArea.appendChild(d);
    }
    callouts.forEach(c => c.style.display = 'none');
}

function addTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.id = 'typingIndicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatArea.appendChild(typing);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function removeTypingIndicator() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

function addMessage(text, type) {
    removeTypingIndicator();
    const msg = document.createElement('div');
    msg.className = `chat-message ${type}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msg.innerHTML = `${text}<span class="msg-time">${timeStr}</span>`;
    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function showCallout(num) {
    if (callouts[num - 1]) {
        callouts[num - 1].style.display = 'flex';
    }
}

function startDemo() {
    if (demoRunning) return;
    demoRunning = true;

    clearChat();
    startDemoBtn.style.display = 'none';
    resetDemoBtn.style.display = 'inline-flex';

    const scenario = demoScenarios[currentScenario];
    const messages = scenario.messages;

    messages.forEach((msg, i) => {
        const timeout = setTimeout(() => {
            if (msg.type === 'incoming') {
                addTypingIndicator();
                const typingTimeout = setTimeout(() => {
                    addMessage(msg.text, msg.type);
                    if (msg.callout) showCallout(msg.callout);
                }, 1200);
                demoTimeouts.push(typingTimeout);
            } else {
                addMessage(msg.text, msg.type);
            }

            // Enable input after demo
            if (i === messages.length - 1) {
                const endTimeout = setTimeout(() => {
                    demoRunning = false;
                }, 1500);
                demoTimeouts.push(endTimeout);
            }
        }, msg.delay);
        demoTimeouts.push(timeout);
    });
}

function resetDemo() {
    demoTimeouts.forEach(t => clearTimeout(t));
    demoTimeouts = [];
    demoRunning = false;
    clearChat();
    startDemoBtn.style.display = 'inline-flex';
    resetDemoBtn.style.display = 'none';
}

// Scenario button listeners
scenarioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (demoRunning) {
            resetDemo();
        }
        selectScenario(btn.dataset.scenario);
    });
});

startDemoBtn.addEventListener('click', startDemo);
resetDemoBtn.addEventListener('click', resetDemo);

// =============================================
// CALCULATOR (Home Services Optimized)
// =============================================
const calcLeads = document.getElementById('calcLeads');
const calcValue = document.getElementById('calcValue');
const calcTime = document.getElementById('calcTime');
const calcLeadsValue = document.getElementById('calcLeadsValue');
const calcValueValue = document.getElementById('calcValueValue');
const calcTimeValue = document.getElementById('calcTimeValue');
const calcLost = document.getElementById('calcLost');
const calcGained = document.getElementById('calcGained');
const calcROI = document.getElementById('calcROI');

function updateCalculator() {
    const missedCalls = parseInt(calcLeads.value);
    const jobValue = parseInt(calcValue.value);
    const closeRate = parseInt(calcTime.value) / 100; // Used to be response time, now close rate %

    calcLeadsValue.textContent = `${missedCalls} calls/mo`;
    calcValueValue.textContent = `$${jobValue.toLocaleString()}`;
    calcTimeValue.textContent = `${Math.round(closeRate * 100)}% close rate`;

    // 82% of missed callers don't leave a voicemail and call a competitor
    // We assume 25% of those *would* have booked if you answered
    const bookingRate = 0.25; 

    const jobsLost = Math.round(missedCalls * bookingRate * closeRate);
    const revenueLost = jobsLost * jobValue;

    // AI captures ~85% of missed calls instantly
    const recoveredJobs = Math.round(missedCalls * 0.85 * bookingRate * closeRate);
    const revenueGained = recoveredJobs * jobValue;

    const monthlyCost = 297 + (recoveredJobs * 15);
    const roi = monthlyCost > 0 ? Math.round(revenueGained / monthlyCost) : 0;

    calcLost.textContent = `$${revenueLost.toLocaleString()}`;
    calcGained.textContent = `$${revenueGained.toLocaleString()}`;
    calcROI.textContent = `${roi}x`;
}

calcLeads.addEventListener('input', updateCalculator);
calcValue.addEventListener('input', updateCalculator);
calcTime.addEventListener('input', updateCalculator);

// Initial calculation
updateCalculator();

// =============================================
// NAVIGATION
// =============================================
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile toggle
const mobileToggle = document.getElementById('mobileToggle');
const navLinksArr = document.getElementById('navLinks');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        navLinksArr.classList.toggle('open');
    });
}

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            e.preventDefault();
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
            if (navLinksArr) navLinksArr.classList.remove('open');
        }
    });
});

// =============================================
// FAQ ACCORDION
// =============================================
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const wasOpen = item.classList.contains('open');

        // Close all
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

        // Open clicked if it wasn't open
        if (!wasOpen) {
            item.classList.add('open');
        }
    });
});

// =============================================
// FORM SUBMISSION
// =============================================
const startForm = document.getElementById('startForm');

if (startForm) {
    startForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            firmName: document.getElementById('firmName').value,
            practiceArea: document.getElementById('practiceArea').value,
            contactName: document.getElementById('contactName').value,
            contactPhone: document.getElementById('contactPhone').value,
            contactEmail: document.getElementById('contactEmail').value,
        };

        // Show loading state
        const submitBtn = startForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/pilot/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (response.ok && result.ok) {
                // Show success state
                startForm.innerHTML = `
                    <div class="form-success">
                        <div class="success-icon">🎉</div>
                        <h3>You're In!</h3>
                        <p>We'll reach out within 24 hours to set up your custom AI dispatcher for <strong>${formData.firmName}</strong>. Check your email for a confirmation and next steps.</p>
                    </div>
                `;
            } else {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                alert(result.error || 'Something went wrong. Please try again.');
            }
        } catch (err) {
            console.error('Form submission error:', err);
            // Fallback success for demo/offline
            startForm.innerHTML = `
                <div class="form-success">
                    <div class="success-icon">🎉</div>
                    <h3>You're In!</h3>
                    <p>We'll reach out within 24 hours to set up your custom AI dispatcher. Check your email for next steps.</p>
                </div>
            `;
        }
    });
}

// =============================================
// SCROLL ANIMATIONS
// =============================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Animate sections on scroll
document.querySelectorAll('.problem-card, .step-card, .result-card, .pricing-card, .faq-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// Add animate-in class styles
const styleEl = document.createElement('style');
styleEl.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(styleEl);

// =============================================
// STAT COUNTER ANIMATION
// =============================================
const statNumbers = document.querySelectorAll('.stat-number[data-count]');

const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const targetValue = parseInt(el.dataset.count);
            let current = 0;
            const duration = 1500;
            const stepValue = targetValue / (duration / 16);

            const counter = setInterval(() => {
                current += stepValue;
                if (current >= targetValue) {
                    current = targetValue;
                    clearInterval(counter);
                }
                el.textContent = Math.round(current);
            }, 16);

            statObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

statNumbers.forEach(el => statObserver.observe(el));
