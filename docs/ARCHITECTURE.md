# Orbit Ops — Architecture note

## Shape of the system

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Browser (PWA)               │        │  Vercel                      │
│  Next.js App Router pages    │ ─────▶ │  Server routes (/api/*)      │
│  StoreProvider (state +      │        │  requirePermission()         │
│  mutations + audit log)      │        │  Cron: 09:00 IST digest,     │
│  selectors → Today, metrics  │        │        Monday full backup    │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │ anon key (RLS)                        │ service_role key
               ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Supabase: Postgres (schema + triggers + RLS) · Auth · Storage        │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼  Resend (email) · WhatsApp Cloud API (phase 3)
```

## Layers

1. **Business rules — `src/lib/business-rules.ts`.** Pure functions with no React or database imports: cycle window from billing day, expected-by-today, Behind, health (green/amber/red, with manual override), priority score, paise ⇄ ₹ with Indian grouping, amount in words (Lakh/Crore), invoice totals with GST, document numbering, the client-spelling guard, profile completeness and the 4-working-hour request SLA. Covered by Vitest (`src/lib/__tests__`). Everything else calls these; nothing re-implements them.

2. **Permissions — `src/lib/rbac.ts`.** One matrix `role → permission[]`. Used in three places so a rule can never drift: the UI (`store.can()` hides nav and buttons), the server (`requirePermission()` in every API route) and the database (RLS policies in the migration use the same semantics via `auth_user_role()`).

3. **State and mutations — `src/lib/store.tsx`.** A single reducer-backed context. Every mutation goes through `commit(patch, log)`, which (a) applies the change, (b) appends an `ActivityLogEntry` (who, what, before/after) and (c) bumps `clients.last_activity_at` for the touched client — so "last activity" is never manual. Deletes set `deleted_at`; `restore` and `permanentDelete` exist only for Owners. Cross-module automations live here too: completing a shoot moves items to **Shot** and spawns editing tasks; approving an item sets the default scheduler; winning a lead creates a client with its onboarding checklist; recording a payment recomputes invoice status; completing a recurring task spawns the next occurrence.

4. **Derived data — `src/lib/selectors.ts`.** `getClientMetrics` (cycle progress, Behind, health, last activity), `buildTodayPriorities` (tasks, actionable content, projects, untriaged requests, lead follow-ups → one list sorted by score) and `editingLoadByWeek` (capacity warning for the shoot planner). Pages never compute these themselves.

5. **UI — `src/app/*` + `src/components/*`.** Mobile-first, 44 px touch targets, calm black/white theme with the only colours being health and status. `AppShell` provides sidebar/bottom nav, ⌘K search, notifications, theme toggle and the global **+ Quick add**. Pages under `/portal` and `/print` render without the shell (client approval portal, A4 invoice/quotation).

6. **Server — `src/app/api/*`.** Thin: resolve the caller's role from the Supabase access token (never from the client), check permission, then act with the service-role client. Cron routes verify `CRON_SECRET`. Notification sending is behind `EmailProvider` / `WhatsAppCloudProvider` interfaces so Resend or Meta can be swapped without touching callers; both simulate (log) when keys are absent.

## Data model (Postgres)

- Every table: `id uuid`, `organization_id`, `created_at/updated_at`, `created_by`, `deleted_at` (soft delete). Money columns are **integer paise**.
- Core: `organizations`, `profiles` (role), `clients` (+ `client_contacts`, `client_social_accounts`, `client_brand_assets`, `client_plans`), `content_items`, `shoots`/`shoot_items`, `tasks`, `requests`, `projects`, `onboarding_steps`, `leads`/`lead_research`/`lead_activities`, `invoices`/`invoice_items`, `quotations`, `payments`, `documents`, `comments`, `activity_log`, `notifications`, `settings`.
- Trigger `fn_record_client_activity()` on the operational tables writes `activity_log` and updates `clients.last_activity_at` — the database enforces the "automatic last activity" rule even for writes that bypass the app.
- RLS: Owners see everything; Managers see everything except `leads*`; Team see clients and the content/tasks/requests assigned to them and nothing in `invoices`, `payments`, `quotations`, `leads`. Helper functions `auth_user_role()` and `auth_profile_id()` are `SECURITY DEFINER` so policies stay cheap.

## Storage modes

| | Demo mode | Supabase mode |
| --- | --- | --- |
| Trigger | no `NEXT_PUBLIC_SUPABASE_*` vars | vars present |
| Identity | user switcher (simulated) | Supabase Auth, invite-only |
| Data | `localStorage` (`orbit-ops-state`) | Postgres with RLS |
| Server permission check | `x-demo-role` header | access token → `profiles.role` |
| Purpose | evaluate every screen with zero setup, UAT, training | production |

The UI talks only to the `StoreApi` interface, so swapping the persistence beneath it (localStorage → Supabase repository that mirrors the same mutations) does not touch any page. That swap is the top item in `docs/ASSUMPTIONS.md`.

## Time, money, language

- All dates are stored as UTC / `date`; displayed as DD/MM/YYYY, 12-hour, Asia/Kolkata. Working hours Mon–Sat 10:00–19:00 drive the request SLA.
- Money: paise integers → `formatPaiseToINR` (₹1,47,000) and `amountInWordsINR` on invoices.
- Fonts: Inter + Noto Sans Devanagari; free-text fields accept Hindi/Hinglish; the spelling guard warns on known wrong spellings of client names and never silently rewrites.

## Jobs

| Job | Schedule (UTC → IST) | Does |
| --- | --- | --- |
| `/api/cron/daily-digest` | `30 3 * * *` → 09:00 IST | Per-user digest: overdue, due today, approvals waiting, cold clients, today's shoot |
| `/api/cron/weekly-export` | `30 22 * * 0` → 04:00 IST Mon | JSON dump of every table to the private `backups` bucket |
