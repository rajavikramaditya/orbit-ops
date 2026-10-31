# Office Task Manager

Multi-login web app for office team - Task & Project Management with roles (Admin, Manager, Employee).

## Features

- **Multi-login**: Different accounts for team members
- **Roles**:
  - **Admin**: Full access, create tasks, see all
  - **Manager**: Create & assign tasks, see all
  - **Employee**: See only assigned tasks, update progress
- Task assignment with deadlines
- Progress tracking (0-100%)
- Status: Pending / In Progress / Completed
- Dashboard with stats

## Demo Accounts

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Admin    | admin@office.com      | admin123  |
| Manager  | manager@office.com    | manager123|
| Employee | employee@office.com   | emp123    |
| Employee2| employee2@office.com  | emp123    |

## Tech Stack (Recommended 2026)

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Auth (Production)**: Supabase Auth or Clerk (easy multi-user + roles)
- **Database (Production)**: Supabase (PostgreSQL) or PlanetScale
- **Hosting**: Vercel

This prototype uses localStorage for demo so you can test multi-login in browser.

## How to Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Next Steps for Production

1. Replace localStorage with Supabase:
   - User authentication
   - Real database for tasks
   - Row Level Security for roles

2. Add more features:
   - Team management
   - Notifications
   - File attachments
   - Reports

3. Deploy on Vercel

## Hindi Summary

Yeh Office team ke liye Task Management web app hai jisme multiple logins hain. Admin aur Manager tasks create kar sakte hain, Employee apne tasks update kar sakta hai.

Demo accounts se login karke test karein.
