# Orbit Ops

**Internal operations for Orbit Ops.**

Orbit Ops is the single place where the team answers one question every morning:

> What must we do today, and which client is falling behind?

It is built for a content-led marketing agency that delivers a fixed number of videos per client every month. Everything in the product exists to protect that delivery promise and the client relationship.

---

## Vision

Most agencies run on WhatsApp groups, scattered sheets, and memory. Orbit Ops replaces that with a clear, shared operating picture:

- Which clients are healthy and which need attention today
- What content is in the pipeline and who owns it
- What requests came in and whether they have been turned into work
- How much revenue has been collected and what has been spent on each client
- Who on the team is carrying the load

The system is intentionally simple. It does not try to be a full project-management suite. It exists to make the daily rhythm of a small, high-touch agency visible and reliable.

---

## How the team uses it

1. **Morning** — Open Today. See open tasks, clients that are behind on their monthly video count, and clients that have gone quiet.
2. **During the day** — Log client requests as they arrive. Move content through the pipeline. Assign tasks.
3. **Client detail** — Check cycle progress, update status, record payments and expenses (admin), and review recent activity.
4. **End of cycle** — Review Revenue for totals and per-client profitability. Move churned clients to Bin.

---

## Sections

| Section   | Purpose                                      |
|-----------|----------------------------------------------|
| Today     | Daily priority view and delivery scorecard   |
| Clients   | Client list, health, onboard date, Bin       |
| Revenue   | Received, spent, profit (active clients)     |
| Requests  | Inbox of client asks                         |
| Content   | Video pipeline (idea → posted)               |
| Tasks     | Non-video work                               |
| Team      | People and roles                             |
| Attendance| Check-in / history (role-aware)              |
| Readme    | This document                                |

---

## Client health

Health is a simple signal, not a scorecard.

- **On track** — Recent activity and delivery on pace
- **Watch** — Activity slowing or delivery lagging
- **At risk** — No recent activity or significantly behind on the monthly promise

Churned clients move to Bin and leave the active list.

---

## Sign-in (current model)

One login page (CloudGate). Choose **Owner / Manager / Team**, enter your **first name** (as on the Team roster) and **password**, then sign in. When Neon is configured, the same form also asks for the team access key — there is no second “role gate” page.

**Log out** returns to that page (keeps the access key). **Switch Account** also clears the access key.

- **Owner** — Full access including payments, expenses, revenue and attendance admin. Password is the Owner money PIN (Settings / first bootstrap). First name must match an Owner on the roster (e.g. Vikram).
- **Manager** — Ops edits + attendance control (view everyone, correct entries). No revenue. First name must match a Manager on the roster. Password: personal hash on the member when set; otherwise legacy Manager password `8423095693`.
- **Team** — Read-only ops (no PII). Attendance: self check-in/out for today only. First name must match an Editor/Shooter/Designer. Password: personal hash when set; otherwise Team default `246810` (or Settings Team default hash).

Payments stay behind the Owner password on the server. Prefer setting a personal login password per person on the Team page.

---

## What this is not

- Not a client portal
- Not a full CRM or accounting system
- Not a creative asset library

Those can be connected later. Orbit Ops stays focused on operations: delivery, requests, tasks, and the money attached to each client.

---

## Current state

Each client's month opens on their own date, and pendency is paced across that cycle rather than the calendar month.

Records are stored in Neon Postgres when the deployment has a database. The browser keeps a local copy and asks for a team access key. Payments, expenses and the Owner PIN are stored apart from the shared document and are only returned to a request that presents the current PIN. Five wrong PIN tries close payments for 15 minutes. Without `DATABASE_URL` and `ORBIT_ACCESS_KEY` the app keeps using this browser only, so a deploy is safe before the store exists.

Design is intentionally restrained — black, white, and clear type — so it feels like office software rather than a marketing site.

## Daily tools on Today

- **Payments due** (Owner): clients with fee still pending this cycle, with a one-tap WhatsApp reminder.
- **Stuck in pipeline**: content sitting 3+ days in one stage.
- **Team load**: open and overdue work per person.
- **Summary**: copies a short WhatsApp-ready status.
- **Backup reminder**: while there is no database, data lives in one browser. Today warns when a backup is 7+ days old.

## Database

On the Vercel project, create a **Neon Postgres** store (Storage → Neon) and add one secret:

| Name | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Set automatically when the Neon store is connected to this project. Use the pooled URL. |
| `ORBIT_ACCESS_KEY` | A password you choose, at least 8 characters. Add it under Settings → Environment Variables for Production. The app asks for it once per browser. |

Redeploy after both are present. Open the browser that already has the clients and press **Save to database**. Set an Owner PIN before that if payments should move too; without a PIN the server stores the work and leaves payments on that browser. Other devices enter the same access key and then the Owner PIN to see payments.

---

Orbit Ops · Orai · orbitcore.in
