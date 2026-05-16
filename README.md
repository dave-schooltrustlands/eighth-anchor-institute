# Eighth Anchor Institute

Site source for **eighthanchor.org** — The Eighth Anchor Institute for Intergenerational Trust Design.

## What this repo ships

EAI v1 (per `EAI_v1_Handoff_2026-05-16.md` / Synthesis_v5):

- **Homepage at `/`** — thesis-first, five bands: thesis hero, why this exists, Institute Grounds Plan (schematic future campuses), founding texts, recruitment.
- **School Trust Campus page at `/campus/school-trust/`** — literal Grounds Plan with four buildings (Library, ASTL National, OASTL, ORWW) + three reserved chapter plots.
- Legend + governance note shared across both pages.

## Stack

- Astro 5 (static output)
- Tailwind CSS
- IBM Plex Mono / Inter / Cormorant Garamond
- Deployed via Cloudflare Pages

## Develop

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # ./dist
npm run preview
npm run smoke    # local smoke tests against ./dist
```

Live smoke (after deploy):

```sh
node scripts/smoke-test-eai-v1.mjs --live
# Or against a custom origin:
EAI_SMOKE_URL=https://eighthanchor.org node scripts/smoke-test-eai-v1.mjs --live
```

## Governance

Campus maps in this repo show intellectual and operating relationships. They do not imply legal merger or control among independent organizations.
