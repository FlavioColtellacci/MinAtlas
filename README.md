# MinAtlas

MinAtlas is a premium, map-first mining intelligence web application focused on the Australian mining sector.

It transforms public mining datasets into a fast, modern, visually refined product experience designed for:

- mining professionals
- FIFO workers researching mine sites
- exploration and geology users
- mining-focused investors

## Website Overview

MinAtlas is built to make discovery, filtering, and contextual mine-site research dramatically easier than legacy GIS interfaces.

The current product direction emphasizes:

- full-screen, map-dominant UI
- lightweight frosted-glass interface elements
- restrained visual language and typography-led hierarchy
- performance-first interaction patterns

## Core Pages and Experience

- `/` - landing page with product positioning and CTA into the atlas.
- `/map` - core interactive map experience for mine-site exploration.
- `/data` - supporting data-focused narrative and product context.
- `/product` - product positioning and feature communication.

## Data, Privacy, and Security

- Data comes from publicly available government sources and is normalized for application use.
- No credentials, tokens, or private keys are documented in this README.
- Runtime secrets are managed only through local environment files and deployment environment variables.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Mapbox GL + react-map-gl
- deck.gl
- Supabase (Postgres + PostGIS)
- TanStack Query
- shadcn/ui + Radix UI

## Repository Structure

This repository currently contains the app in:

- `minatlas/` — web application source code

## Local Development

From the repository root:

```bash
cd minatlas
npm install
npm run dev
```

Create `minatlas/.env.local` with your own values:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Website Configuration (Production)

### Domain and Canonical Host

- Primary domain: `https://minatlas.app`
- Vercel default domain: `https://minatlas.vercel.app` (redirects to canonical host)

### Environment Variables (Vercel)

Set these in Vercel Project Settings -> Environment Variables (at least for Production):

```env
NEXT_PUBLIC_MAPBOX_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Notes:

- `NEXT_PUBLIC_*` variables are exposed to browser code and are appropriate for public client keys.
- Never add service-role or secret keys to `NEXT_PUBLIC_*`.

### Analytics and Search Integrations

- Google Analytics (GA4) is loaded globally in `minatlas/src/app/layout.tsx`.
- AdSense account verification meta tag is defined in `minatlas/src/app/layout.tsx`.
- Search Console HTML verification file is served from:
  - `minatlas/public/google2f74e2ce075c9b6c.html`
  - Public URL: `https://minatlas.app/google2f74e2ce075c9b6c.html`

## Deployment Workflow

1. Commit and push changes to `main`.
2. Vercel builds and deploys the latest `main` commit.
3. Verify critical checks after deploy:
   - home page loads on `https://minatlas.app`
   - GA tag appears and events show in GA4 Realtime
   - Search Console verification file is reachable
   - AdSense verification meta is present in page source

## Operational Notes

- Keep local tooling artifacts out of source control (`.cursor/` is ignored).
- Keep local env files local-only (`.env*.local` ignored in app workspace).
- Prefer small, focused commits for deploy-critical changes.

## Ownership and License

This project is proprietary and not open source.

Use, copying, modification, distribution, sublicensing, and commercial exploitation are not permitted without explicit written permission from the copyright holder.

See `LICENSE` for full terms.