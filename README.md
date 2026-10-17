# Nursing home transition platform

React + Vite starter for the RIMME hackathon team. The product name and demo state are still undecided.

## Run locally

Use Node.js 22.12+ (Node 24 LTS recommended) and npm.

```sh
npm install
npm run dev
```

Open the local URL Vite prints, usually http://localhost:5173.

```sh
npm run lint
npm test
npm run build
npm run preview
```

`build` creates `dist/`; `preview` serves that production build locally.

## What works

- Three connected views: needs intake, facility comparison, and transition plan.
- Intake answers personalize checklist tasks and tour questions.
- Shortlist fictional facilities, check off tasks, edit a Know Me profile, and download a JSON plan.
- Responsive layout, labeled native controls, keyboard focus, and a skip link.

All data is synthetic. State lives in memory and resets on refresh. The starter does not call an AI service or store health records. Facility figures are explicitly fictional and must not be presented as CMS data. No care level, facility ranking, or coverage eligibility is inferred.

## Where to work

```text
src/
  App.jsx             Three-stage interface and session state
  styles.css          Responsive styling
  data/demo.js        Synthetic intake and facility fixtures
  lib/plan.js         Intake-to-checklist rules
  lib/plan.test.js    Personalization regression test
  main.jsx            React entry point
```

## Next integration steps

1. Choose a demo state and region. Replace fixtures with CMS records, source links, and update dates.
2. Add a server-side API for OCI Generative AI and grounded retrieval. Keep OCI credentials on the server; anything prefixed `VITE_` is public browser code.
3. Add source-backed explanations and draft inspection summaries with human review. Verify changing coverage rules against official sources before adding them.
4. Connect profile drafting and shared plans after the basic journey works. Decide on consent, access controls, and retention before handling personal data.

Dependencies are locked by `package-lock.json`; teammates can use `npm ci` for a reproducible install. Do not commit `.env` files or credentials.
