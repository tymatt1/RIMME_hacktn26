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

Choose **Explore a sample plan** to load Maria and her grandfather Arthur's journey. Or choose **Start your journey** to try simulated account creation with invented details. The simulation accepts any valid-format email and a made-up password of four or more characters. Neither is saved or transmitted, and no actual account is created. Demo sign-in opens the browser's existing draft; it does not retrieve an account by email.

Seven main screens connect the journey:

1. Welcome and simulated account creation/sign-in.
2. Your situation: relationship, current living setting, timing, hospital context.
3. Everyday support: mobility, daily activities, memory, communication.
4. Family priorities: location, travel range, coverage categories, family support.
5. Starting point: editable answers, care-setting discussion prompts, care-team questions.
6. Nursing home exploration: four fictional facilities, filters, sorting, saved shortlist, side-by-side comparison, detail/inspection/call-question panels.
7. Transition Plan: personalized checklist, task assignments, documents/packing, family members, editable Know Me profile, downloadable JSON.

Large choice controls minimize typing. Keyboard focus, labeled radio groups, dialog focus management, reduced-motion support, and responsive layouts are included. Preferences inform the draft plan; no care level or coverage eligibility is determined. Facility options have no composite match score or best-home ranking. A chosen facility is a planning reference only, with no booking or admission.

## What is saved

Sample intake answers, current screen, shortlist, checked tasks, family assignments, and Know Me content save in this browser's localStorage under `carebridge-prototype-v1`. They survive refresh on the same browser and origin; localhost ports are separate origins. Use only invented data. This is not a secure medical-record system or shared account service.

**Download plan** exports the draft as JSON. The file can be shared manually for review; there is no backend, live AI, invitation system, document upload, or external transmission. Use **Explore a sample plan** from the welcome screen to reset to the sample journey. Clear site storage to remove the browser draft completely.

## Checks and production build

```sh
npm test
npm run lint
npm run build
npm run preview
```

The tests cover intake-to-checklist personalization, combined facility filters/sorting, preservation of original fixtures, stale local draft recovery, and exclusion of account credentials from storage. `build` creates an ignored `dist/` folder; `preview` serves that production build. Dependency versions remain in `package-lock.json`.

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
  lib/plan.js                Team starter's checklist personalization
  lib/plan.test.js           Existing checklist regression test
```

## Next integration work

- Confirm the demo state and replace example facility records with verified CMS records, source links, and update dates.
- Connect OCI Generative AI and retrieval through a server-side API. Never place OCI credentials in browser code or `VITE_` variables.
- Verify current Medicare/state coverage content before presenting guidance. Current copy provides questions rather than eligibility advice.
- Design actual account authentication, consent, retention, and family-sharing permissions before using personal information.

This version is for design review. It explains and organizes; family members and care professionals make decisions.
