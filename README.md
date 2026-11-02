# Orbit Ops

Internal operations app for **Orbit Media by Orbitcore** (Orai, Uttar Pradesh). One calm place to see what must be done today, which client is falling behind, and what the business is owed — for Owners, the Manager and the production Team, on phone and laptop.

- **Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Supabase (Postgres + Auth + Storage + RLS), Vercel (hosting + Cron), Resend (email), Zod, Vitest.
- **Status:** every module in the master brief is built and usable out of the box in **demo mode** (no accounts or keys needed, data stays in the browser). The Supabase schema, RLS policies, seed, server-side permission gates and cron endpoints are included for production. See [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) for what is still open.

---

## 1. Try it in two minutes (demo mode)

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No login is needed. Use the **user switcher** at the bottom of the sidebar to act as Ram Soni (Owner), Tanvi (Manager) or a Team member and watch the UI change what it shows. Demo clients are clearly labelled and can be deleted in one click from **Settings → Data → Delete all demo data**.

Useful commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest unit tests for the Section 8 business rules |
| `npm run lint` | ESLint (Next.js + TypeScript rules) |

---

## 2. Deploy for real (step by step, no coding needed)

You need three free accounts: **GitHub** (code), **Supabase** (database + login), **Vercel** (hosting). Budget ~30 minutes.

### Step A — Supabase project

1. Go to <https://supabase.com> → **New project**. Name it `orbit-ops`, pick region **Mumbai (ap-south-1)**, set a strong database password and keep it safe.
2. When the project is ready open **SQL Editor → New query**. Paste the contents of `supabase/migrations/001_initial_schema.sql` and press **Run**. This creates every table, index, trigger and Row-Level-Security policy.
3. New query again: paste `supabase/seed.sql` and **Run**. This creates the organisation, default settings (GST 18 %, health thresholds, priority weights), the seven team profiles and three package templates. It does **not** create any client data.
4. Open **Project Settings → API** and copy three values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret — never put it in the browser or in chat)
5. **Authentication → Providers**: keep **Email** on, turn **"Allow new users to sign up" OFF**. Orbit Ops is invite-only.
6. **Authentication → URL configuration**: after Step C, set *Site URL* to your Vercel URL (e.g. `https://orbit-ops.vercel.app`) and add it to *Redirect URLs*.
7. **Storage → New bucket** twice: `client-files` (private; brand assets, logos, documents) and `backups` (private; weekly JSON backups).

### Step B — Resend (email, optional but recommended)

1. Create an account at <https://resend.com>, add and verify your domain (e.g. `orbitcore.in`).
2. **API Keys → Create** → copy as `RESEND_API_KEY`.
3. Set `EMAIL_FROM="Orbit Ops <ops@orbitcore.in>"` (must be on the verified domain).

Without this key the app still works; the 9 AM digest and invites are logged on the server instead of being emailed.

### Step C — Vercel

1. Push this repository to GitHub (already done if you are reading it there).
2. Go to <https://vercel.com> → **Add New → Project** → import the `orbit-ops` repository. Framework is auto-detected as Next.js. Do not change the build command.
3. Before pressing Deploy, open **Environment Variables** and add every variable from the table in section 3. Tick *Production* and *Preview*.
4. Press **Deploy**. In ~2 minutes you get a URL like `https://orbit-ops.vercel.app`.
5. **Cron jobs** are read from `vercel.json` automatically:
   - `/api/cron/daily-digest` at `30 3 * * *` UTC = **09:00 IST** every day
   - `/api/cron/weekly-export` at `30 22 * * 0` UTC = **04:00 IST Monday** (weekly full backup)
   Vercel sends `Authorization: Bearer <CRON_SECRET>`; set `CRON_SECRET` to any long random string.
6. (Optional) **Settings → Domains** → add `ops.orbitcore.in` and follow the DNS instructions.

### Step D — Invite the team

1. Open the deployed app, go to **Settings → Users** as an Owner.
2. Enter name, email, role (Owner / Manager / Team) and speciality → **Send invite**. The server calls Supabase `inviteUserByEmail`; the person receives a magic link, sets a password and lands in the app with the right role.
3. Roles can be changed or a user deactivated from the same screen. Nothing is ever hard-deleted; deactivated users disappear from assignee lists but their history stays.

> First Owner: in Supabase **Authentication → Users → Invite user**, invite `ram@…`; then in **Table editor → profiles** set `auth_user_id` on Ram's seeded row to the new user's UUID. From then on all invites are done inside the app.

---

## 3. Environment variables

| Variable | Required | Where it is used |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Browser + server Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Browser Supabase client (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Server only: invites, cron jobs, permission checks |
| `CRON_SECRET` | Production | Protects `/api/cron/*` |
| `RESEND_API_KEY` | Optional | Daily digest, invite emails |
| `EMAIL_FROM` | Optional | From address, default `Orbit Ops <ops@orbitcore.in>` |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | Phase 3 | Official WhatsApp Business Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | Phase 3 | Official WhatsApp Business Cloud API |
| `OPENAI_API_KEY` | Phase 3 | AI assistant (server-side only, not yet wired) |

Copy `.env.example` to `.env.local` for local development. **If the Supabase variables are absent the app runs in demo mode** (browser storage, user switcher instead of login).

---

## 4. Importing existing data (CSV)

Settings → **Data** has two importers with downloadable templates.

**Clients** (`clients.csv`): `official_name, display_name, aliases, wrong_spellings, status, engagement_type, industry, city, address, maps_url, gst_no, website, tagline, language_pref, onboarded_on, owner, package, videos_per_cycle, monthly_fee_rupees, cycle_day, gst_applicable`.
Multiple aliases / wrong spellings are separated with `|`. `owner` is the Owner's first name (Ram / Vikas). Example row:
`Haven Solutions,Haven Solutions,Jagannath Modular Furniture Door,Heaven Solutions|Hevan Solutions,active,retainer,Furniture,Orai,Kalpi Road,,,,"Modular furniture, modern homes",Hinglish,2026-08-01,Vikas,12 videos / month,12,35000,5,yes`

**Tasks** (`tasks.csv`): `title, client, assignee, priority, due_on (YYYY-MM-DD), description, estimated_hours`.

Rules: UTF-8, first row is the header, money in rupees (converted to paise on import), task client names are matched against official name, aliases and known wrong spellings; rows that cannot be matched are reported and skipped, never guessed. Imported clients are *not* marked as demo data.

---

## 5. Backups and data ownership

- **Automatic:** Supabase keeps daily database backups (Pro plan: 7 days point-in-time). Dashboard → Database → Backups.
- **Weekly backup:** the Monday cron dumps every table to `weekly/orbit-ops-backup-YYYY-MM-DD.json` in the private `backups` bucket.
- **On demand:** Reports → **Exports** downloads any table as CSV (UTF-8 with BOM, opens correctly in Excel).
- **Files:** all uploads live in your own Supabase Storage bucket; nothing is stored with third parties.
- **Trash:** every delete is a soft delete. Owners restore from **Trash** or permanently delete; permanent deletion is logged in the Audit log.

---

## 6. What is where

```
src/app/                  routes (Today, clients, requests, content, shoots, tasks, projects,
                          sales, money, team, reports, audit, trash, settings, portal, print)
src/app/api/              server routes: money, sales, invite, cron/daily-digest, cron/weekly-export
src/components/           UI primitives, AppShell, QuickAdd, GlobalSearch, Notifications, Comments…
src/lib/business-rules.ts Section 8 rules: cycle maths, health, priority score, ₹ formatting, words
src/lib/rbac.ts           permission matrix (used by UI, server routes and mirrored in RLS)
src/lib/store.tsx         application state + every mutation with audit logging & soft delete
src/lib/selectors.ts      derived data: client metrics, Today priorities, editing load
src/lib/demo-data.ts      clearly-labelled demo dataset (deletable in one click)
src/lib/notifications.ts  Resend + WhatsApp Cloud API adapters (simulated without keys)
supabase/migrations/      001_initial_schema.sql — tables, triggers, indexes, RLS
supabase/seed.sql         organisation, settings, team profiles, package templates
docs/ARCHITECTURE.md      how the pieces fit together
docs/ASSUMPTIONS.md       assumptions made and questions for the Owners
```

---

## 7. Security model in one paragraph

Invite-only Supabase Auth. Each user has exactly one role (Owner, Manager, Team). The permission matrix in `src/lib/rbac.ts` hides UI a role cannot use, `requirePermission()` rejects API calls on the server (a Team user calling `/api/money` directly gets **403**), and the same rules are enforced a third time inside Postgres with Row-Level-Security so a leaked anon key still cannot read Sales or Money. The `service_role` key only ever lives on the server. Every create/update/delete/restore writes an Audit log row with who, what, when and the before/after values.
