"use client";
import { useState, useEffect, useRef } from "react";

interface Message {
  type: "outgoing" | "incoming";
  text: string;
  delay: number;
  callout?: number;
}

interface Scenario {
  id: string;
  name: string;
  sub: string;
  icon: string;
  messages: Message[];
}

const scenarios: Scenario[] = [
  {
    id: "hvac",
    name: "HVAC Emergency",
    sub: "AC blowing warm air in summer",
    icon: "❄️",
    messages: [
      { type: "outgoing", text: "Hi, I just got home and my AC is blowing warm air. It's 95 degrees in here and I have kids. Can you help?", delay: 0 },
      { type: "incoming", text: "Hi there! I'm so sorry to hear that — having no AC in this heat is definitely an emergency. I'm the AI assistant for Parker HVAC & Plumbing. Can I ask a few quick questions to get a tech out to you?", delay: 1200, callout: 1 },
      { type: "outgoing", text: "Yes please. What do you need to know?", delay: 2800 },
      { type: "incoming", text: "Is the outside unit making any strange noises, or is it just blowing warm air from the vents?", delay: 4200, callout: 2 },
      { type: "outgoing", text: "It's making a loud humming noise but the fan isn't spinning.", delay: 5800 },
      { type: "incoming", text: "Got it. That sounds like it could be a capacitor or motor issue. Please turn the system off at the thermostat for now. Our standard diagnostic fee is $89. Would you like to see available times today?", delay: 7200 },
      { type: "outgoing", text: "Yes, ASAP please.", delay: 8600 },
      { type: "incoming", text: "I have a technician available between 2pm and 4pm today. Does that work for you?", delay: 10000, callout: 3 },
      { type: "outgoing", text: "2pm to 4pm today works!", delay: 11400 },
      { type: "incoming", text: "Perfect! You're booked for 2:00 PM - 4:00 PM today. Technician Mike will text when 15 mins away. ❄️", delay: 12800 },
    ]
  },
  {
    id: "plumbing",
    name: "Plumbing Issue",
    sub: "Water heater leaking in garage",
    icon: "🚰",
    messages: [
      { type: "outgoing", text: "Help! My water heater is leaking all over the garage floor.", delay: 0 },
      { type: "incoming", text: "Oh no! I'm sorry to hear that. I can help get a plumber out to you right away. Do you know where the main water shut-off valve is for the heater?", delay: 1200, callout: 1 },
      { type: "outgoing", text: "I think so. I'm turning it off now.", delay: 2800 },
      { type: "incoming", text: "Smart move — that will prevent a lot of water damage. Is it a gas or electric water heater, and roughly how old is it?", delay: 4200, callout: 2 },
      { type: "outgoing", text: "It's gas. About 12 years old.", delay: 5800 },
      { type: "incoming", text: "Thanks! At 12 years, it might need replacement, but our plumber will diagnose it first. I have a plumber available between 3pm and 5pm today. Shall I book it?", delay: 7200, callout: 3 },
      { type: "outgoing", text: "Yes, that works perfectly.", delay: 8600 },
      { type: "incoming", text: "Great! You're booked for 3pm - 5pm today. Confirmation text sent! 🚰", delay: 10000 },
    ]
  },
  {
    id: "electrical",
    name: "Electrical Service",
    sub: "Breaker keeps tripping",
    icon: "⚡",
    messages: [
      { type: "outgoing", text: "My kitchen lights keep flickering and one of the breakers won't stay reset. I'm worried it's a fire hazard.", delay: 0 },
      { type: "incoming", text: "I understand — electrical safety is top priority. We have licensed electricians available. Is there any smell of smoke or burning plastic near the panel?", delay: 1200, callout: 1 },
      { type: "outgoing", text: "No smell, but the panel feels warm to the touch.", delay: 2800 },
      { type: "incoming", text: "Please leave that breaker in the OFF position. Warm panels are a priority. Can I get an electrician out for a safety inspection in about 90 minutes?", delay: 4200, callout: 2 },
      { type: "outgoing", text: "Yes, please. I'll be home.", delay: 5800 },
      { type: "incoming", text: "Dispatched! Technician arriving by 12:30 PM. Tracking link sent to your phone. Stay safe! ⚡", delay: 7200, callout: 3 },
    ]
  }
];

export function LiveDemo() {
  const [activeId, setActiveId] = useState<string>("hvac");
  const [displayedMessages, setDisplayedMessages] = useState<(Message & { timeStr: string })[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeCallouts, setActiveCallouts] = useState<number[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const activeScenario = scenarios.find((s) => s.id === activeId) || scenarios[0];

  const clearTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  const resetDemo = () => {
    clearTimeouts();
    setIsPlaying(false);
    setIsTyping(false);
    setDisplayedMessages([]);
    setActiveCallouts([]);
  };

  const changeScenario = (id: string) => {
    resetDemo();
    setActiveId(id);
  };

  const startDemo = () => {
    resetDemo();
    setIsPlaying(true);

    const msgs = activeScenario.messages;
    const now = new Date();

    msgs.forEach((msg, idx) => {
      const timeStr = new Date(now.getTime() + idx * 30000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (msg.type === "outgoing") {
        const t = setTimeout(() => {
          setIsTyping(false);
          setDisplayedMessages((prev) => [...prev, { ...msg, timeStr }]);
        }, msg.delay);
        timeoutsRef.current.push(t);
      } else {
        // incoming message typing simulation
        const tTyping = setTimeout(() => {
          setIsTyping(true);
        }, msg.delay - 600 > 0 ? msg.delay - 600 : 200);
        timeoutsRef.current.push(tTyping);

        const tMsg = setTimeout(() => {
          setIsTyping(false);
          setDisplayedMessages((prev) => [...prev, { ...msg, timeStr }]);
          if (msg.callout) {
            setActiveCallouts((prev) => Array.from(new Set([...prev, msg.callout!])));
          }
        }, msg.delay);
        timeoutsRef.current.push(tMsg);
      }

      if (idx === msgs.length - 1) {
        const tEnd = setTimeout(() => {
          setIsPlaying(false);
        }, msg.delay + 1000);
        timeoutsRef.current.push(tEnd);
      }
    });
  };

  useEffect(() => {
    return () => clearTimeouts();
  }, []);

  return (
    <div className="demo-interactive-container">
      <div className="demo-scenarios-selector">
        <span className="selector-title">Select Missed Call Scenario:</span>
        <div className="scenario-buttons">
          {scenarios.map((s) => (
            <button
              key={s.id}
              className={`scenario-card-btn ${activeId === s.id ? "active" : ""}`}
              onClick={() => changeScenario(s.id)}
            >
              <span className="scenario-icon">{s.icon}</span>
              <div className="scenario-meta">
                <strong>{s.name}</strong>
                <small>{s.sub}</small>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="demo-stage-grid">
        {/* iPhone Frame */}
        <div className="iphone-mockup">
          <div className="iphone-frame">
            <div className="iphone-notch"></div>
            <div className="iphone-header">
              <div className="iphone-avatar">ZA</div>
              <div className="iphone-header-details">
                <div className="iphone-header-name">Parker HVAC & Plumbing</div>
                <div className="iphone-header-status">
                  <span className="online-dot"></span> Online • Replies in &lt;30s
                </div>
              </div>
            </div>

            <div className="iphone-chat-body">
              <div className="iphone-chat-date">Today • Missed Call Text-Back</div>

              {displayedMessages.length === 0 && !isTyping && (
                <div className="iphone-empty-prompt">
                  <p>Click <strong>▶ Start Demo Conversation</strong> to watch Zeem AI handle a missed call in real-time.</p>
                </div>
              )}

              {displayedMessages.map((msg, i) => (
                <div key={i} className={`sms-bubble ${msg.type}`}>
                  <p>{msg.text}</p>
                  <span className="sms-time">{msg.timeStr}</span>
                </div>
              ))}

              {isTyping && (
                <div className="sms-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>

            <div className="iphone-input-bar">
              <input type="text" placeholder="Type a message..." disabled />
              <button disabled className="iphone-send-btn">
                ↗
              </button>
            </div>
          </div>

          <div className="demo-action-toolbar">
            {!isPlaying ? (
              <button className="button button-primary button-lg" onClick={startDemo}>
                ▶ Start Demo Conversation
              </button>
            ) : (
              <button className="button button-secondary button-lg" onClick={resetDemo}>
                ↻ Reset Demo
              </button>
            )}
          </div>
        </div>

        {/* Live Callouts */}
        <div className="demo-callouts-panel">
          <h3>AI Capabilities Demonstrated</h3>

          <div className={`capability-card ${activeCallouts.includes(1) ? "active" : ""}`}>
            <div className="capability-icon">⚡</div>
            <div className="capability-content">
              <strong>Instant SMS Text-Back (&lt;30 Secs)</strong>
              <p>Reaches missed callers before they click off to your competitor on Google.</p>
            </div>
          </div>

          <div className={`capability-card ${activeCallouts.includes(2) ? "active" : ""}`}>
            <div className="capability-icon">🧠</div>
            <div className="capability-content">
              <strong>Natural Trade Qualification</strong>
              <p>Asks exact diagnostic questions, safety precautions, and quotes dispatch fees.</p>
            </div>
          </div>

          <div className={`capability-card ${activeCallouts.includes(3) ? "active" : ""}`}>
            <div className="capability-icon">📅</div>
            <div className="capability-content">
              <strong>Automated Calendar Booking</strong>
              <p>Integrates directly into ServiceTitan, Housecall Pro, or Google Calendar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
