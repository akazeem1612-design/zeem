export function HeroFlow() {
  return (
    <div className="flow-card" aria-label="Live Lead Orchestration Demo">
      <div className="flow-card-header">
        <div className="flow-status-live">
          <span className="live-pulse" />
          <span>LIVE LEAD ORCHESTRATION</span>
        </div>
        <div className="flow-timer-badge">
          <span className="live-dot" /> LIVE • 00:18
        </div>
      </div>

      <div className="flow-card-body">
        {/* Left Side: SMS Conversation */}
        <div className="flow-chat-column">
          <div className="flow-msg user-msg">
            <span className="flow-msg-tag">INCOMING LEAD • SMS</span>
            <p>Hi, I’d like to schedule a service consultation.</p>
            <time>10:32 AM</time>
          </div>

          <div className="flow-msg agent-msg">
            <span className="flow-msg-tag agent-tag">ZEEM AI DISPATCHER</span>
            <p>Happy to help! I can get a tech to you today. What issue are you experiencing?</p>
            <time>10:32 AM • ✓✓</time>
          </div>

          <div className="flow-badge-qualified">
            <div className="badge-icon">✓</div>
            <div>
              <strong>Qualified Lead</strong>
              <small>Trade &amp; service fit confirmed</small>
            </div>
          </div>

          <div className="flow-msg user-msg">
            <p>Thursday at 2 PM works great.</p>
            <time>10:35 AM</time>
          </div>
        </div>

        {/* Right Side: Appointment Confirmation Card */}
        <div className="flow-booking-column">
          <div className="booking-card-inner">
            <div className="booking-icon-circle">✓</div>
            <span className="booking-eyebrow">APPOINTMENT CONFIRMED</span>
            <h3 className="booking-title">Dispatch Scheduled</h3>
            <div className="booking-details-list">
              <div className="booking-detail-row">
                <span>Date</span>
                <strong>Thursday, May 22</strong>
              </div>
              <div className="booking-detail-row">
                <span>Time</span>
                <strong>2:00 PM</strong>
              </div>
              <div className="booking-detail-row">
                <span>Status</span>
                <strong className="status-success">Added to Calendar</strong>
              </div>
            </div>
            <div className="booking-sync-badge">
              <span>⚡ Synced to ServiceTitan &amp; Google Calendar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
