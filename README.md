# Orbit Ops

Internal operations web app for **Orbit Media by Orbitcore**.

> The single question the home screen must answer in 5 seconds: **What must we do today, and which client is falling behind?**

## Phase 1 (this version)

- Today screen with priority list, health colours, cold clients
- Clients list with progress bars, last activity, health
- Navigation (mobile bottom bar + desktop sidebar)
- Placeholder pages for Requests, Content, Tasks, Settings
- Mobile-first, black/white design, Inter font
- Ready for Supabase (schema coming next)

## Tech

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- Lucide icons
- Deployed on Vercel

## Run locally

```bash
npm install
npm run dev
```

## Assumptions

- Demo data is hardcoded for now (real clients from brief/website).
- Auth and roles will come with Supabase in the next phase.
- Money, invoices, shoot planner, sales pipeline are Phase 2.
- Hindi/Hinglish support is planned (Unicode ready).

## Next

1. Supabase project + schema + RLS
2. Real auth (invite-only)
3. Content pipeline Kanban
4. Requests inbox with triage
5. Activity log + automatic last activity

Built from the Orbit Ops Master Brief.
