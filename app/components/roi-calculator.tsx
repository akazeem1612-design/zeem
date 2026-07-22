"use client";
import { useState, useMemo } from "react";

export function RoiCalculator() {
  const [missedCalls, setMissedCalls] = useState<number>(50);
  const [jobValue, setJobValue] = useState<number>(1500);
  const [closeRate, setCloseRate] = useState<number>(25);

  const { revenueLost, revenueGained, recoveredJobs, roiMultiplier } = useMemo(() => {
    const bookingRate = 0.25; // 25% of callers would book if answered
    const rateFraction = closeRate / 100;

    const jobsLost = Math.round(missedCalls * bookingRate * rateFraction);
    const lost = jobsLost * jobValue;

    // AI captures ~85% of missed calls instantly
    const jobsGained = Math.round(missedCalls * 0.85 * bookingRate * rateFraction);
    const gained = jobsGained * jobValue;

    const monthlyCost = 1497;
    const roi = monthlyCost > 0 ? Math.max(1, Math.round(gained / monthlyCost)) : 0;

    return {
      revenueLost: lost,
      revenueGained: gained,
      recoveredJobs: jobsGained,
      roiMultiplier: roi,
    };
  }, [missedCalls, jobValue, closeRate]);

  return (
    <div className="roi-calculator-wrapper">
      <div className="roi-sliders-pane">
        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="missedCalls">Monthly Missed Calls</label>
            <span className="slider-val">{missedCalls} calls/mo</span>
          </div>
          <input
            id="missedCalls"
            type="range"
            min="10"
            max="200"
            step="5"
            value={missedCalls}
            onChange={(e) => setMissedCalls(Number(e.target.value))}
            className="styled-range"
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="jobValue">Average Job Value ($)</label>
            <span className="slider-val">${jobValue.toLocaleString()}</span>
          </div>
          <input
            id="jobValue"
            type="range"
            min="250"
            max="15000"
            step="250"
            value={jobValue}
            onChange={(e) => setJobValue(Number(e.target.value))}
            className="styled-range"
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="closeRate">Close Rate on Answered Calls (%)</label>
            <span className="slider-val">{closeRate}% close rate</span>
          </div>
          <input
            id="closeRate"
            type="range"
            min="10"
            max="80"
            step="5"
            value={closeRate}
            onChange={(e) => setCloseRate(Number(e.target.value))}
            className="styled-range"
          />
        </div>
      </div>

      <div className="roi-cards-pane">
        <div className="roi-result-card card-lost">
          <div className="result-tag">ESTIMATED REVENUE LOST / MONTH</div>
          <div className="result-amount">${revenueLost.toLocaleString()}</div>
          <p className="result-subtext">From missed callers who hung up and called a competitor on Google.</p>
        </div>

        <div className="roi-result-card card-gained">
          <div className="result-tag">RECOVERED REVENUE WITH ZEEM AI</div>
          <div className="result-amount">${revenueGained.toLocaleString()}</div>
          <p className="result-subtext">Estimated ~{recoveredJobs} additional booked jobs/month recovered automatically.</p>
        </div>

        <div className="roi-multiplier-badge">
          <span>Projected ROI with Zeem AI:</span>
          <strong>{roiMultiplier}x Return</strong>
        </div>
      </div>
    </div>
  );
}
