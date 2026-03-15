# TEGA.Rw — Project Status

**Last updated:** 2026-03-15

---

## Status

**On Track — MVP deployed to production (Vercel + Render). Staff portal routing and authentication are stable. Core booking, payment, and ticketing flows are live for passengers.**

---

## Key Achievements

### Deployment & Infrastructure
- Staff portal (agency + admin) and passenger app successfully deployed to Vercel; backend deployed to Render with Supabase PostgreSQL
- Resolved critical Vercel build failure caused by stale Tailwind content cache after route group restructuring — fixed via `vercel.json` pre-build cache clear
- Removed stale `frontend/` and `frontend-agency/` duplicate directories (98 files deleted), keeping the codebase clean
- Nginx reverse proxy configured to serve `staff.tega.rw`, `agency.tega.rw`, and `admin.tega.rw` from a single `frontend-admin` upstream

### Staff Portal — Auth & Routing
- Fixed persistent production 404 on admin login: root cause was `app/admin/layout.tsx` returning `null` in App Router; resolved by restructuring admin pages into a `(protected)` route group so the login page is completely outside the admin layout
- Fixed JWT decoding in Vercel edge runtime: replaced `Buffer.from()` with `atob()` + proper base64url padding — middleware now correctly reads roles in production
- Admin dashboard (`/admin`) is now directly accessible; removed the erroneous redirect that was hiding the stats dashboard and sending all users to the bookings page instead
- Login role validation upgraded: wrong-role login now shows a **prominent inline red error banner** (not just a small toast), clears the password field, and directs the user to the correct tab

### Staff Portal — Bug Fixes
- Fixed `getAgencies` SQL: removed a broken `LEFT JOIN users ON u.role='agency'` that had no agency FK, cross-joining all agency users to every agency row and producing wrong `total_users` counts
- Fixed AdminSidebar logo link (`/` → `/admin`) to avoid routing through the login redirect
- Fixed agency layout rendering children for wrong-role users — now shows a spinner while middleware handles the redirect

### Backend
- Full API coverage across 9 modules: Auth, Users, Stations, Routes, Buses, Schedules, Bookings, Payments, Tickets
- Admin module: dashboard stats, revenue reports, agency management (CRUD + activate/deactivate)
- Rate limiting, CORS whitelist, helmet security headers, parameterised SQL queries throughout

---

## Challenges

- **Render free tier cold starts** — backend sleeps after 15 minutes of inactivity; first request after sleep takes ~30 seconds. API calls from both Vercel apps fail silently until the service wakes up
- **Mocked payment providers** — MTN MoMo and Airtel Money integrations are simulated; real sandbox credentials not yet obtained, blocking live payment testing
- **No real SMS gateway** — password reset tokens are currently logged to the server console instead of being delivered via SMS (Africa's Talking not yet configured)
- **No per-agency user linkage in schema** — the `users` table has no `agency_id` column, making it impossible to count staff per agency or scope agency users to their organisation without a schema migration

---

## Next Steps

| Priority | Task | Notes |
|----------|------|-------|
| High | Integrate real MTN MoMo / Airtel Money | Webhook handler already built; need sandbox API keys |
| High | Upgrade Render to a paid tier or add a keep-alive ping | Eliminates cold-start failures in production |
| Medium | Configure Africa's Talking SMS gateway | Replace console.log token with real SMS delivery |
| Medium | Add `agency_id` column to `users` table (migration) | Enables per-agency staff management and correct user counts |
| Medium | Verify `FRONTEND_URL` on Render includes both Vercel URLs | Required for CORS to allow staff portal and passenger app |
| Low | Configure real email delivery (SMTP / SES) | Templates exist; just needs credentials wired in |
| Low | Phone OTP verification on registration | Currently accepts any phone number without verification |
| Low | Set `accessToken` cookie domain to `.tega.rw` | Required for seamless auth across subdomains in self-hosted deployment |

---

## Architecture

Two frontends, not three. Agency and admin portals are merged into a single Next.js app (**Staff Portal** — `frontend-admin/`).

```
backend/              → Node.js/Express API, Supabase PostgreSQL
frontend-passenger/   → Passenger booking app
frontend-admin/       → Staff Portal: agency + admin in one app
  src/app/
    admin/
      login/          → Shared login page (outside admin layout)
      (protected)/    → Route group: all admin pages share AdminSidebar layout
        bookings/, buses/, routes/, schedules/, stations/,
        agencies/, users/, reports/, settings/
    agency/           → Agency section (green sidebar) — role=agency only
```

Next.js App Router route group `(protected)` scopes the admin layout to protected pages only. Edge middleware enforces role boundaries on every request; wrong-role users are redirected to `/admin/login`.

---

## Deployment

| Service | Host | URL |
|---------|------|-----|
| Backend API | Render (free tier) | `https://<project>.onrender.com` |
| Passenger app | Vercel | `https://tega-rwa.vercel.app` |
| Staff Portal (agency + admin) | Vercel | `https://tega-rwa-staffportal.vercel.app` |
| Database | Supabase (PostgreSQL) | Hosted — always on |

> Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake the backend.

---

## Running Locally

```bash
# Docker (recommended)
docker compose up --build -d

# Without Docker
cd backend && npm run dev                        # port 5000
cd frontend-passenger && npm run dev             # port 3000
cd frontend-admin && npm run dev -- -p 3001      # port 3001 (Staff Portal)
```

## Local Access

| App | URL |
|-----|-----|
| Passenger | http://localhost:3000 |
| Staff Portal | http://localhost:3001/admin/login |
| API | http://localhost:5000/api/v1 |
| Swagger | http://localhost:5000/api/docs |
