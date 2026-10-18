# Carebridge

A clickable, frontend-only prototype that helps family caregivers explore a nursing home transition. Built with the team's existing React 19 + Vite 8 starter. All people, facilities, distances, inspection information, and staffing figures are fictional examples.

## Open the app locally

Use Node.js 22.12+ and npm, or pnpm.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. If npm is unavailable but pnpm is installed, use `pnpm install --lockfile=false` and `pnpm run dev`. Run commands from this repository's root, not a `frontend/` subfolder. The existing team starter already places the app at the root.

## Explore the demo

Choose **Create a transition plan**, then enter invented details to start a fresh three-step onboarding flow. Each demo email has its own plan and onboarding progress on this browser and origin. Sign in with an existing demo email to resume that plan; unknown emails and duplicate signups show a message instead of opening another plan. Sign out returns to the welcome screen and stays signed out after refresh. Demo passwords are only simulated form inputs: they are not checked, stored, or sent anywhere. This is browser-local account simulation, not secure authentication.

**See an example profile.** opens Maria and Arthur's example without overwriting a saved account. Earlier drafts created before email-based demo plans remain available through **Open the previous unlinked plan on this device**. Those older signups never saved an email, so they cannot be matched to a sign-in email automatically.

Seven main screens connect the journey:

1. Welcome and simulated account creation/sign-in.
2. Your situation: relationship, current living setting, timing, hospital context.
3. Everyday support: mobility, daily activities, memory, communication.
4. Family priorities: location, travel range, monthly out-of-pocket budget, coverage categories, and family support. Set an importance slider (0–100) for each topic: close to family, staffing, inspection information, quality of care, and costs/coverage. The sliders set the match-score weights directly (costs/coverage is not scored because CMS has no cost data), and the same sliders appear on the results tab, where “Update results” re-ranks the homes and reloads them from the API. Rehabilitation, room type, and language/cultural needs use separate questions. Dragging shows a floating block and moving drop gap; mouse, touch grips, arrow buttons, and keyboard Up/Down/Home/End work. Escape cancels a drag. Older ranked drafts become slider values, and removed ranking topics remain noted without guessing answers to the new questions. The budget is optional ($0–$20,000/month in $500 steps) and does not filter facilities or estimate actual prices. Answers appear in the draft/export; the starting-point summary shows the top three priorities.
5. Starting point: editable answers, care-setting discussion prompts, care-team questions.
6. Nursing home exploration: CMS records when available, fictional fallback facilities, filters, sorting, saved shortlist, and detail/inspection/call-question panels. **Compare saved** opens a dialog with horizontally scrollable home columns and a branded PDF download. Both show CMS ratings as filled stars out of five and match scores as proportionate bars out of 100, retaining exact values and accessible labels on screen. Raw counts, distances, and hours remain numeric. PDFs group up to three homes per landscape page and include every saved home, with missing values and fictional records labeled. Component score bars appear only in facility details, not result cards.
7. Transition Plan: personalized checklist, task assignments, documents/packing, family members, editable Know Me profile, and branded PDF downloads.

Large choice controls minimize typing. Keyboard focus, labeled radio groups, dialog focus management, reduced-motion support, and responsive layouts are included. Preferences inform the draft plan; no care level or coverage eligibility is determined. Fictional sample facilities have no match score or best-home ranking; real CMS homes get a 0–100 match score computed from the priority sliders, the person’s needs and the travel range. A chosen facility is a planning reference only, with no booking or admission.

## What is saved

Each demo account saves intake answers, current screen, onboarding progress, shortlist, checked tasks, family assignments, and Know Me content in browser localStorage under a separate `carebridge-demo-plan:` key. The `carebridge-demo-accounts-v1` registry stores demo emails and the active session. The previous unlinked draft remains under `carebridge-prototype-v1`. They survive refresh on the same browser and origin; localhost ports are separate origins. Use only invented data. This is not a secure medical-record system or shared account service.

**Download plan (PDF)** creates a formatted Carebridge report with recorded preferences, ranked priorities, checklist status and assignments, packing progress, saved facilities, and the Know Me profile. **Download Know Me PDF** creates a separate resident profile for review with staff. Reports are generated in the browser with bundled fonts; exporting does not send report data to an external service. PDF generation loads only when a download is requested. Clear site storage to remove the browser draft completely.

## Checks and production build

```sh
npm test
npm run lint
npm run build
npm run preview
```

The tests cover intake-to-checklist personalization, combined facility filters/sorting, preservation of original fixtures, stale local draft recovery, exclusion of account credentials from storage, priority sliders and score weights, migration of earlier ranked answers, and budget persistence/validation. `build` creates an ignored `dist/` folder; `preview` serves that production build. Dependency versions remain in `package-lock.json`.

## Project layout

```text
src/
  App.jsx                    Seven-screen experience and UI state
  styles.css                 Responsive application styling
  components/Welcome.jsx     Landing screen and original SVG illustration
  components/Welcome.css     Landing screen styles
  components/Icon.jsx        Shared SVG icon set
  data/prototype.js          Clearly fictional demo fixtures and copy
  lib/demo-model.js          Personalization adapter, filters, local persistence
  lib/demo-model.test.js     Data and storage regression tests
  lib/plan-document.js       Branded PDF layouts and recorded report content
  lib/plan-document.test.js  PDF content, privacy boundaries, and filename tests
  lib/plan-pdf.js            Lazy browser PDF generation and download
  lib/plan.js                Team starter's checklist personalization
  lib/plan.test.js           Existing checklist regression test
```

## Next integration work

- Confirm the demo state and replace example facility records with verified CMS records, source links, and update dates.
- Connect OCI Generative AI and retrieval through a server-side API. Never place OCI credentials in browser code or `VITE_` variables.
- Verify current Medicare/state coverage content before presenting guidance. Current copy provides questions rather than eligibility advice.
- Design actual account authentication, consent, retention, and family-sharing permissions before using personal information.

This version is for design review. It explains and organizes; family members and care professionals make decisions.

## Backend connection

The app calls the platform API (OCI + MySQL HeatWave, Tennessee CMS data) under `/api`.
- Dev: `npm run dev` proxies `/api` to `API_PROXY_TARGET` (default `http://147.224.195.130:8000`). See `.env.example`.
- If the API is unreachable the app falls back to fictional sample data (badge shows "OFFLINE DEMO DATA").
- Production: serve `dist/` and proxy `/api` to the backend on the same origin (avoids mixed-content issues).
