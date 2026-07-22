import Link from "next/link";
import { Footer } from "./components/footer";
import { HeroFlow } from "./components/hero-flow";
import { IntakeForm } from "./components/intake-form";
import { LiveDemo } from "./components/live-demo";
import { RoiCalculator } from "./components/roi-calculator";
import { SiteHeader } from "./components/site-header";
import { industries } from "./lib/industries";

export default function Home() {
  return (
    <main>
      <SiteHeader />

      {/* Hero Section */}
      <section className="hero shell">
        <div className="hero-copy reveal">
          <p className="eyebrow">
            <i /> AI-POWERED MISSED CALL RECOVERY FOR HOME SERVICES
          </p>
          <h1 className="display">
            Every missed call is <span className="hero-highlight">money lost</span>
            <br />
            <em>to the next guy on Google.</em>
          </h1>
          <p className="lead">
            Homeowners don't leave voicemails. If you don't answer, they call your competitor. 
            Zeem AI texts missed calls in <strong>under 30 seconds</strong> — qualifying the job and booking 
            dispatch appointments 24/7, even while your crew is on a job.
          </p>
          <div className="actions">
            <Link className="button button-primary" href="#live-demo">
              Try the AI Demo <span>💬</span>
            </Link>
            <Link className="text-link" href="#request-demo">
              Start Free 14-Day Pilot <span>→</span>
            </Link>
          </div>

          <dl className="proof">
            <div>
              <dt>&lt;30s</dt>
              <dd>Response time</dd>
            </div>
            <div>
              <dt>82%</dt>
              <dd>Callers skip voicemail</dd>
            </div>
            <div>
              <dt>$0</dt>
              <dd>Upfront setup fee</dd>
            </div>
          </dl>
        </div>

        <div className="reveal delay">
          <HeroFlow />
        </div>
      </section>

      {/* Integration Logos / Software Compatibility Bar */}
      <section className="integration-bar shell">
        <p className="integration-label">SEAMLESS INTEGRATION WITH YOUR EXISTING SOFTWARE PLATFORMS:</p>
        <div className="integration-badges">
          <span className="badge-pill">🛠️ ServiceTitan</span>
          <span className="badge-pill">🏠 Housecall Pro</span>
          <span className="badge-pill">📋 Jobber</span>
          <span className="badge-pill">📅 Google Calendar</span>
          <span className="badge-pill">⚡ Local Service Ads (LSA)</span>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="shell quiet">
        <p className="kicker">THE LEAK YOU CAN’T SEE</p>
        <div>
          <h2 className="display section-title">
            Homeowners don't wait. They call <em>your competitors.</em>
          </h2>
          <p>
            When a homeowner has an emergency leak or a broken AC, they want an immediate answer. 
            If your line is busy or goes to voicemail, 8 out of 10 callers immediately click the next company on Google.
          </p>
        </div>
        <div className="loss-cards">
          <article>
            <span>82%</span>
            <h3>No Voicemail</h3>
            <p>of missed callers hang up without leaving a message and call a competitor.</p>
          </article>
          <article>
            <span>35%</span>
            <h3>Missed Call Rate</h3>
            <p>average missed call rate for local HVAC, plumbing, and electrical contractors.</p>
          </article>
          <article>
            <span>$15K+</span>
            <h3>Monthly Leak</h3>
            <p>in revenue lost to missed calls by the average 3-truck home service operation.</p>
          </article>
        </div>
      </section>

      {/* Interactive Live Demo */}
      <section id="live-demo" className="section shell">
        <div className="section-head">
          <div>
            <p className="kicker">INTERACTIVE LIVE DEMO</p>
            <h2 className="display section-title">
              See the AI in action — <em>right now.</em>
            </h2>
          </div>
          <p>
            This is exactly what your missed callers experience. Select a trade scenario below and watch 
            Zeem AI handle the intake, diagnosis, and dispatch booking automatically.
          </p>
        </div>
        <LiveDemo />
      </section>

      {/* Industry Playbooks */}
      <section className="section industries-section">
        <div className="shell">
          <div className="section-head">
            <div>
              <p className="kicker">TAILORED TRADE PLAYBOOKS</p>
              <h2 className="display section-title">
                Not generic bots.<br />
                <em>Trade-specific dispatchers.</em>
              </h2>
            </div>
            <p>
              Each industry playbook is trained on the exact vocabulary, urgency rules, diagnostic questions, 
              and dispatch fees for your specific trade.
            </p>
          </div>
          <div className="industry-grid">
            {industries.map((i, n) => (
              <Link className="industry-card" key={i.slug} href={`/industries/${i.slug}`}>
                <span>0{n + 1}</span>
                <h3>{i.label}</h3>
                <p>{i.eyebrow}</p>
                <b>View the playbook ↗</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section shell">
        <div className="section-head">
          <div>
            <p className="kicker">FROM MISSED CALL TO BOOKED DISPATCH</p>
            <h2 className="display section-title">
              Live in under 48 hours.<br />
              <em>Works with your current phone.</em>
            </h2>
          </div>
          <p>Zero hardware changes. Simply forward missed calls or unanswered lines to your custom Zeem AI number.</p>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <h3>Tell Us Your Business Rules</h3>
            <p>We configure your trade, service area, dispatch fees ($89–$149), and scheduling rules in 5 minutes.</p>
          </article>
          <article>
            <span>02</span>
            <h3>We Train Your AI Assistant</h3>
            <p>Your AI dispatcher is custom-trained to speak naturally like an experienced, professional receptionist.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Missed Calls Text-Back</h3>
            <p>When you can't answer, Zeem AI texts back in under 30 seconds: "Sorry we missed you! How can we help?"</p>
          </article>
          <article>
            <span>04</span>
            <h3>Jobs Booked on Calendar</h3>
            <p>The AI qualifies the issue, quotes dispatch terms, and books the appointment straight to your schedule.</p>
          </article>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="section roi-section" id="calculator">
        <div className="shell">
          <div className="section-head">
            <div>
              <p className="kicker">CALCULATE YOUR REVENUE LEAK</p>
              <h2 className="display section-title">
                See how much revenue you're <em>leaving on the table.</em>
              </h2>
            </div>
            <p>Adjust the sliders below to calculate your estimated monthly revenue recovery with Zeem AI.</p>
          </div>
          <RoiCalculator />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section shell pricing">
        <div className="section-head">
          <div>
            <p className="kicker">ZERO RISK. PROVE VALUE FIRST.</p>
            <h2 className="display section-title">
              Start with a 14-Day Free Pilot.
            </h2>
          </div>
          <p>No upfront setup fee. No long-term contracts. We set up your number and prove the value on your real missed calls.</p>
        </div>

        <div className="pricing-cards-grid">
          <article className="price-card">
            <div className="price-badge">100% RISK-FREE</div>
            <h3>14-Day Free Pilot</h3>
            <div className="price-amount">
              <strong>$0</strong>
              <span>for 14 days</span>
            </div>
            <ul>
              <li>✓ Custom AI dispatcher for your trade</li>
              <li>✓ Up to 100 missed calls handled</li>
              <li>✓ Instant &lt;30s SMS text-back</li>
              <li>✓ Automated appointment booking</li>
              <li>✓ $0 setup fee & no credit card required</li>
            </ul>
            <Link className="button button-secondary" href="#request-demo">
              Start Free Pilot ↗
            </Link>
          </article>

          <article className="price-card featured">
            <div className="price-badge">FOUNDING PARTNERSHIP</div>
            <h3>Founding Partner Plan</h3>
            <div className="price-amount">
              <strong>$1,497</strong>
              <span>/month</span>
            </div>
            <small className="price-note">Flat monthly rate • Cancel anytime • No per-job fees</small>
            <ul>
              <li>✓ Everything in Free Pilot</li>
              <li>✓ Unlimited missed call handling</li>
              <li>✓ ServiceTitan / Housecall Pro integration</li>
              <li>✓ Custom diagnostic & dispatch rules</li>
              <li>✓ Dispatch fee collection</li>
              <li>✓ Dedicated account manager</li>
            </ul>
            <Link className="button button-primary" href="#request-demo">
              Claim Pilot &amp; Lock Partner Rate ↗
            </Link>
          </article>
        </div>
      </section>

      {/* Request Demo / Onboarding Form */}
      <section id="request-demo" className="section request-section">
        <div className="shell request-grid">
          <div>
            <p className="kicker">YOUR BUSINESS. YOUR WORKFLOW.</p>
            <h2 className="display section-title">Start your free 14-day pilot.</h2>
            <p>
              Tell us a bit about your business. We'll build your custom AI dispatcher and have it ready for you to test 
              within 24 hours.
            </p>
            <dl className="mini-proof">
              <div>
                <dt>01</dt>
                <dd>We review your trade &amp; service area</dd>
              </div>
              <div>
                <dt>02</dt>
                <dd>We configure your custom AI assistant</dd>
              </div>
              <div>
                <dt>03</dt>
                <dd>You test the experience on your phone</dd>
              </div>
            </dl>
          </div>
          <IntakeForm />
        </div>
      </section>

      {/* FAQ */}
      <section className="section shell faq">
        <div>
          <p className="kicker">FREQUENTLY ASKED QUESTIONS</p>
          <h2 className="display section-title">Everything you need to know.</h2>
        </div>
        <div>
          {[
            [
              "Does the AI sound natural and human?",
              "Yes — our AI is specifically trained as a helpful home services dispatcher. It uses natural, empathetic phrasing, quotes your exact dispatch fees, and asks trade-appropriate questions."
            ],
            [
              "How does it connect to my phone system?",
              "We provide a dedicated Zeem phone number. You simply set your existing phone provider (RingCentral, Google Voice, Grasshopper, etc.) to forward unanswered calls to your Zeem number after 3 rings."
            ],
            [
              "What if a caller has a complex or unusual question?",
              "The AI has strict guardrails. If a conversation goes outside its trained scope, it gracefully tells the homeowner: 'I'll have our lead technician call you back directly as soon as possible,' and sends an instant alert to your team."
            ],
            [
              "What happens after the 14-day free pilot?",
              "We review the results together. You'll see the exact number of missed calls handled and revenue recovered. If it earns its place, you continue on our Founding Partner plan. If not, you pay nothing."
            ]
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
