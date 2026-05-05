# ZEEM AI - System Documentation & State Tracker

> **Purpose:** This document is the single source of truth for Zeem AI's technical state, data enrichment progress, and launch readiness. Update this document whenever a major milestone is hit or a configuration changes to avoid duplicated work.

## 1. Environment & Infrastructure State
| Component | Status | Location / Details |
| :--- | :--- | :--- |
| **Code Repository** | 🟢 LIVE | Pushed to GitHub (`akazeem1612-design/zeem`). Serves as the deployment source. |
| **Backend (Server)**| 🟢 LIVE | Deployed on Railway. Root directory set to `/server`. Environment variables securely injected. |
| **Frontend (Web)**  | 🟢 LIVE | Deployed on Vercel. Custom domain `zeemservices.com` successfully mapped and configured. |
| **OpenAI API** | 🟢 LIVE | Active key loaded in Railway. Using `gpt-4o-mini` for intake. |
| **Twilio SMS** | 🟢 LIVE | Fully mapped in Railway. Webhook pointing to Railway production URL. |
| **Database** | 🟡 LOCAL ONLY | Supabase is not yet configured. All bookings and conversations are currently saving to local JSON files. |
| **Intake Logic** | 🟢 LIVE | Refactored with strict 6-step qualification flow and regex fallbacks. (`server/src/prompts/home-services.js`) |
| **Outreach Engine**| 🟢 LIVE | Internal website scraper configured and tested. (`server/src/services/outreach.js`) |

## 2. Prospect Enrichment Status (DFW Home Services)
**Goal:** 100 Accounts. 60+ verified owners & direct emails.

*   **Total Accounts:** 100
*   **Verified Owner Names:** 85/100 (85%)
*   **Targeted Emails:** 30 verified personal emails, 70 fallback info@ domains.
*   **Data Sources Used:**
    *   Texas TDLR Database (Public Records)
    *   Apollo.io (Manual Pulls)
    *   Zeem AI Web Scraper
    *   GPT-4o Research
*   **Primary Data File:** `prospects_dfw_100_enriched_final.csv`

## 3. Pre-Launch Deliverables Checklist (May 17th Launch)
- [x] **5 Production E2E Tests:** Verified. 5/5 simulated SMS scenarios successfully qualified leads and wrote to the production DB.
- [x] **Pilot Contract:** Verified. 1-page agreement finalizing 14-day terms and $1.5K-$3K monthly retainer.
- [x] **SMS Outreach Sequence:** Verified. Script loaded ready to ping the 85 enriched accounts.
- [x] **Twilio Live Demo Line:** Active. Fully configured with Railway webhook and tested end-to-end.
- [x] **Production Deployment:** Complete. Backend running on Railway, frontend running on Vercel at `zeemservices.com`.
- [ ] **3 Loom Sales Videos:** Pending. Need to be recorded manually via screen-share.

## 4. Current API Keys Needed for Production
If you are setting up a new environment, these are the critical keys required:
*   `OPENAI_API_KEY` (Active on Railway)
*   `TWILIO_ACCOUNT_SID` (Active on Railway)
*   `TWILIO_AUTH_TOKEN` (Active on Railway)
*   `TWILIO_PHONE_NUMBER` (Active on Railway)
*   `SUPABASE_URL` & `ANON_KEY` (Missing - Needed before scaling beyond pilot)
