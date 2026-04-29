# MinAtlas

MinAtlas is a premium, map-first mining intelligence web application focused on the Australian mining sector.

It transforms public mining datasets into a fast, modern, visually refined product experience designed for:

- mining professionals
- FIFO workers researching mine sites
- exploration and geology users
- mining-focused investors

## Product Summary

MinAtlas is built to make discovery, filtering, and contextual mine-site research dramatically easier than legacy GIS interfaces.

The current product direction emphasizes:

- full-screen, map-dominant UI
- lightweight frosted-glass interface elements
- restrained visual language and typography-led hierarchy
- performance-first interaction patterns

## Data and Security

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

## Ownership and License

This project is proprietary and not open source.

Use, copying, modification, distribution, sublicensing, and commercial exploitation are not permitted without explicit written permission from the copyright holder.

See `LICENSE` for full terms.