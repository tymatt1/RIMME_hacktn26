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

Eight main screens connect the journey:

1. Welcome and simulated account creation/sign-in.
2. Your situation: relationship, current living setting, timing, hospital context.
3. Everyday support: mobility, daily activities, memory, communication.
4. Family priorities: location, travel range, monthly out-of-pocket budget, coverage categories, and family support. Set an importance slider (0–100) for each topic: close to family, staffing, inspection information, quality of care, and costs/coverage. The sliders set the match-score weights directly (costs/coverage is not scored because CMS has no cost data), and the same sliders appear on the results tab, where “Update results” re-ranks the homes and reloads them from the API. Rehabilitation, room type, and language/cultural needs use separate questions. Dragging shows a floating block and moving drop gap; mouse, touch grips, arrow buttons, and keyboard Up/Down/Home/End work. Escape cancels a drag. Older ranked drafts become slider values, and removed ranking topics remain noted without guessing answers to the new questions. The budget is optional ($0–$20,000/month in $500 steps) and does not filter facilities or estimate actual prices. Answers appear in the draft/export; the starting-point summary shows the top three priorities.
5. Know Me: optional routines, interests, comforts, and notes that help staff get to know the person. It is the last intake step, and also appears in **My preferences**. The AI draft of the profile is made later from the Downloads tab, because it needs the saved plan.
6. Starting point: editable answers, care-setting discussion prompts, care-team questions.
7. Nursing home exploration: CMS records when available, fictional fallback facilities, filters, sorting, saved shortlist, and detail/inspection/call-question panels. **Compare saved** opens a dialog with horizontally scrollable home columns and a branded PDF download. Both show CMS ratings as filled stars out of five and match scores as proportionate bars out of 100, retaining exact values and accessible labels on screen. Raw counts, distances, and hours remain numeric. PDFs group up to three homes per landscape page and include every saved home, with missing values and fictional records labeled. Component score bars appear only in facility details, not result cards.
8. Transition Plan: personalized checklist, task assignments, documents/packing, family members with contact details (name, relationship, phone, email) and optional invitations, a Downloads tab with the whole move-in packet, and branded PDF downloads.

Large choice controls minimize typing. Keyboard focus, labeled radio groups, dialog focus management, reduced-motion support, and responsive layouts are included. Preferences inform the draft plan; no care level or coverage eligibility is determined. Fictional sample facilities have no match score or best-home ranking; real CMS homes get a 0–100 match score computed from the priority sliders, the person’s needs and the travel range. A chosen facility is a planning reference only, with no booking or admission.

## What is saved

**Contact details and family accounts (demo).** Account sign-up asks for an optional phone number. On the Family tab, **Add family member** takes a name, relationship, phone and email, and a checkbox for whether the person goes on the nursing-home sheet. People with no phone or email are never listed there. **Also invite them to Carebridge** (or **Invite** on a listed person) makes a link and an 8-character code. The invited person opens the link, or chooses **Join a family plan** on the home screen, and registers with their own name, email, phone and relationship. Their account is then linked to the plan and both accounts read and write the same plan. A person who has an account keeps their phone and relationship on that account, and edits made on the Family tab are saved there. Everyone else’s details are stored with the plan. In browser-only mode everything is simulated: invites live in the `carebridge-demo-accounts-v1` registry next to the accounts, so **an invite only works on the device and browser that created it**. With server accounts (see “Accounts” below) invites work from any device. The link carries only the random code, and contact details are never sent to the API or the AI.

Each demo account saves intake answers, current screen, onboarding progress, shortlist, checked tasks, family assignments, and Know Me content in browser localStorage under a separate `carebridge-demo-plan:` key. The `carebridge-demo-accounts-v1` registry stores demo emails and the active session. The previous unlinked draft remains under `carebridge-prototype-v1`. They survive refresh on the same browser and origin; localhost ports are separate origins. Use only invented data. This is not a secure medical-record system or shared account service.

**Download full plan** (plan page header and Downloads tab) saves the whole move-in packet as separate PDF files, one after another: the transition plan, a **Resident information for the nursing home** sheet to hand to a home, the Know Me profile, a printable move-in checklist and packing list, questions to ask, and the nursing home comparison (only when two or more homes are saved). Each file also has its own Download button. The handoff sheet repeats what the family recorded, leaves blanks for medical details the app never collects, and leaves out the family’s budget and priorities. Chrome may ask to allow multiple downloads.

The transition plan PDF is a formatted Carebridge report with recorded preferences, ranked priorities, checklist status and assignments, packing progress, saved facilities, and the Know Me profile. **Download Know Me PDF** creates a separate resident profile for review with staff. Reports are generated in the browser with bundled fonts; exporting does not send report data to an external service. PDF generation loads only when a download is requested. Clear site storage to remove the browser draft completely.

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
  components/FamilyUI.jsx    Family list, add/edit member form, invite and join screens
  data/prototype.js          Clearly fictional demo fixtures and copy
  lib/demo-model.js          Personalization adapter, filters, local persistence
  lib/demo-model.test.js     Data and storage regression tests
  lib/plan-document.js       Branded PDF layouts and recorded report content
  lib/plan-document.test.js  PDF content, privacy boundaries, and filename tests
  lib/family.js              Contact details, family list, invite codes and links
  lib/family.test.js         Contact, invite code and handoff-list tests
  lib/packet-meta.js         The list of packet files and when each is available
  lib/packet-documents.js    Handoff, checklist and questions PDFs, and the packet file list
  lib/packet-documents.test.js  Packet content, privacy, ordering and filename tests
  lib/plan-pdf.js            Lazy browser PDF generation and download, including the bundle
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
- Production (Vercel): `vercel.json` forwards `/api/*` to the API's HTTPS address (`https://147-224-195-130.sslip.io`), so the browser only ever talks to the website's own address. That keeps the sign-in cookie same-site and avoids mixed-content blocking.
- Dev: `npm run dev` proxies `/api` to `API_PROXY_TARGET` (default `https://147-224-195-130.sslip.io`). See `.env.example`. To work against your own copy of the backend, set it to `http://127.0.0.1:8000` and start the API with `CB_ALLOW_HTTP=1` (see `ACCOUNTS.md` in the backend).
- If the API is unreachable the app falls back to fictional sample data (badge shows "OFFLINE DEMO DATA").

## Accounts: on the server, or only in this browser

On start the app asks the API whether accounts are available (`GET /api/auth/me`, 4 second limit).
- **Server accounts** (the normal case): sign-up, sign-in, the family plan and invites live in the backend's encrypted accounts database (see the backend's `ACCOUNTS.md`). The same plan opens on every phone and computer. Passwords need at least 10 characters, and the prototype has no password reset. The sign-in is an HttpOnly cookie, so no secret is ever in browser storage. The plan is saved a moment after every change, checked for other people's changes every 15 seconds and when the tab regains focus, and changes made on two devices at once are merged (`src/lib/plan-merge.js`, `src/lib/plan-sync.js`). Which screen a device is on is kept on that device only. A small notice in the header shows when saving is in progress, offline or failed. Only the person who started the plan can invite family; anyone can delete their own account (an owner's deletion removes the plan for everyone).
- **Browser-only demo accounts** (the original behaviour, described above): used automatically when the account service answers anything other than a clean "not signed in", for example when the backend is old, switched off or unreachable. Nothing is shared between devices in this mode.

Code: `src/lib/cloud.js` (API client), `src/lib/account-store.js` (one interface over both modes), `src/lib/plan-merge.js` and `src/lib/plan-sync.js` (sync), `src/App.jsx` (`App` decides the mode, `Planner` is the app). `VITE_SYNC_POLL_MS` shortens the polling interval for tests.
