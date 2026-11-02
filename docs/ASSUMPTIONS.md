# Assumptions and open questions

Everything in the master brief was treated as the source of truth. Where it was silent, the choices below were made so that work could continue; each one is cheap to change. Please confirm or correct.

## Open items that need an Owner decision or further build

1. **Live persistence.** The screens currently run on the in-browser store (demo mode). The production Postgres schema, RLS, seed, server permission gates and cron endpoints are ready, but the UI's `StoreApi` still needs a Supabase-backed implementation (same mutations, writing to the tables) plus the Supabase Auth login/invite acceptance screens. This is the first thing to do before real client data goes in; no page has to change because they only talk to `StoreApi`.
2. **First Owner bootstrapping.** Seeded profiles for Ram, Vikas, Tanvi, Tosseeb, Rohit, Shahil and Prathmes exist with placeholder emails (`@orbitcore.in`). Confirm real emails so invites go to the right inboxes.
3. **Company details.** GSTIN, bank account, UPI id, registered address and invoice terms are placeholders in Settings → Company. The invoice/quotation print uses them verbatim.
4. **AI assistant (Phase 3).** Only the `OPENAI_API_KEY` placeholder exists; no assistant UI or server route yet. Confirm which provider and whether client data may leave Supabase.
5. **WhatsApp.** The adapter targets the official Meta Cloud API only (no unofficial automation, per brief). Needs a verified business number and approved templates before it can send.

## Assumptions made

### Team and roles
- Ram Soni and Vikas Rathore are Owners; Tanvi is the only Manager; Tosseeb, Rohit, Shahil and Prathmes are Team. Default assignees by stage: shoot → Tosseeb/Rohit, editing → Prathmes, scheduling/posting → Tanvi, ads → Shahil.
- A person has exactly one role. Owners can also be assignees.
- Deactivated users keep all history and simply disappear from pickers.

### Cycles and health
- A client's cycle starts on `billing_cycle_day` each month; a day > 28 is clamped to the month's last day.
- Promised videos = the plan's `videos_per_cycle`; "delivered" counts **Posted + Approved + Scheduled**. Behind = delivered more than 1 below `expected_by_today`.
- Cold client = 7+ days without any logged activity (any content move, task, request, comment, payment, file). Red thresholds (Behind by 3+, or cold 7+ days, or 2+ overdue P1) are defaults in Settings → Rules and editable by Owners.
- A manual health override needs a reason and an "until" date set by the Owner; after that date the computed health takes over again.

### Requests and SLA
- Working hours Mon–Sat 10:00–19:00 IST are recorded in Settings. The 4-hour triage SLA currently counts clock hours from the time the request was received; making it skip nights and Sundays is a small change in `isRequestOverdueForTriage` once the Owners confirm the exact working calendar.
- Quick-add "Log a call" creates a Request with channel = call so it also enters Tanvi's inbox.

### Content pipeline
- Stages are fixed as in the brief. "Revision requested" sends the item back to **In editing** and increments a revision counter shown on the card.
- Posting an item sets `posted_at`; nothing is auto-fetched from Instagram/Facebook (no official API access assumed).
- Completing a shoot moves its items to **Shot** and creates one "Edit: <title>" task per item for the default editor, due in 3 days.
- Capacity warning threshold in the shoot planner: `weeklyEditCapacity` in Settings → Rules (default 18 items entering editing per week).

### Money
- All amounts are integer paise. GST 18 % default, toggle per document. Invoice series `OM-YYYY-NNN`, quotation series `OMQ-YYYY-NNN`; the year is the calendar year and the sequence counters live in Settings (reset them manually at the start of a financial year if you prefer April numbering).
- Partial payments are allowed; invoice status is recomputed from payments (unpaid / partial / paid / overdue). Renewal reminders fire 7 days before the next cycle.
- Monthly client report and invoice "PDF" use the browser print-to-PDF flow (A4, print stylesheet) rather than a server renderer, to keep hosting free of binaries.

### Sales
- Pipeline stages: New lead → Research → Proposal sent → Follow-up → Negotiation → Won / Lost. Won creates the client, copies research into the plan tab and starts the 9-step onboarding checklist; the client becomes `active` only when all steps are done.
- Referral source is a free text field with suggestions; stats group by exact text.

### Notifications
- In-app notifications are always on. Email digest is one mail per active user at 09:00 IST, only sent if the user has something to act on.
- Mentions (`@name`) in comments notify that person; approvals waiting > 2 days notify Tanvi and the client's Owner.

### Data and privacy
- No client data was invented beyond the seven names given; all seeded clients carry `is_demo = true`, show a "Demo" badge and can be removed in one click.
- Client portal links are unguessable tokens with no login; they show only items awaiting approval and let the client approve or request a revision. Tokens can be regenerated per client.
- File uploads go to a private Supabase bucket; the app serves them via short-lived signed URLs.

## Questions for the Owners

1. Do Managers need to see invoice amounts (currently yes, Money is Owner + Manager) or should Money be Owners only?
2. Should Team members see the client's monthly fee on the Plan tab? (Currently hidden for Team.)
3. Which bank/UPI details and GSTIN go on invoices? Any logo file for the invoice header?
4. Is the 10-items-per-week editing capacity right for Prathmes, or should it be per editor?
5. Should the weekly review PDF be emailed automatically on Monday, or only generated on demand?
6. Do you want the daily digest on WhatsApp as soon as the Cloud API number is approved, or email only?
