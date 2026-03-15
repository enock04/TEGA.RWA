# TEGA.Rw — Project Status

**Last updated:** 2026-03-15
**Status:** MVP Feature-Complete — Deployed to Render + Vercel

---

## Deployment

| Service | Host | URL |
|---------|------|-----|
| Backend API | Render (free tier) | `https://<project>.onrender.com` |
| Passenger app | Vercel | `https://<project>.vercel.app` |
| Staff Portal (agency + admin) | Vercel | `https://<project>.vercel.app` |
| Database | Supabase (PostgreSQL) | Hosted — always on |

> Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake the backend.

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

Next.js App Router route group `(protected)` scopes the admin layout to protected pages only — the login page is excluded, eliminating the need for `isLoginPage` hacks. Edge middleware enforces role boundaries on every request; wrong-role users are redirected to `/admin/login`.

---

## Completed Work

### Backend (Phases 1–6)

- [x] **Phase 1 — Auth & Users:** Register, login, token refresh, password change, forgot/reset password, account lockout (5 attempts → 15 min), profile update
- [x] **Phase 2 — Transport:** Stations, Routes, Buses, Schedules — full CRUD; bus search endpoint (departure, destination, date)
- [x] **Phase 3 — Bookings:** Per-seat selection with row locking, 15-minute expiry, batch multi-passenger booking, cancellation with seat restoration
- [x] **Phase 4 — Payments:** MTN MoMo + Airtel Money (mocked), webhook handler, booking auto-confirmed on payment success
- [x] **Phase 5 — Tickets:** Unique ticket numbers (TKT-YYYYMMDD-XXXX), QR codes, ticket validation endpoint
- [x] **Phase 6 — Admin Dashboard:** System-wide stats, revenue reports, route breakdowns, daily breakdowns
- [x] **Agency Management API:** GET/POST `/admin/agencies`, GET/PUT `/admin/agencies/:id`, PATCH `/admin/agencies/:id/status`

### Passenger Frontend (`frontend-passenger/`)

- [x] Mobile-first design (max-width 430px phone frame), sticky AppHeader, fixed BottomNav
- [x] Splash screen at `/` — unauthenticated: Sign In / Create Account; authenticated: redirect to dashboard
- [x] Auth gate: JWT decoded from cookie, role-checked at edge middleware
- [x] Search — departure, destination, date, passenger count; sort by time/price
- [x] Multi-passenger booking — visual 2×2 seat map, per-passenger name/phone/disability flag, up to 8 passengers
- [x] Payment — MTN MoMo / Airtel Money, auto-polls every 5s, manual confirm fallback
- [x] Digital e-ticket with QR code and print button
- [x] Passenger dashboard — booking history, status filter, action buttons (Pay, Ticket, Cancel)
- [x] Profile — edit name/email, change password
- [x] Forgot/reset password via phone number
- [x] i18n — English, French, Kinyarwanda

### Staff Portal (`frontend-admin/`)

- [x] Unified login at `/admin/login` — role selector (Agency green / Admin purple), routes to correct portal on login
- [x] **Role validation on login** — agency credentials rejected when Admin tab selected, and vice versa
- [x] **Agency section** (`/agency/*`) — dashboard, fleet management, schedules, bookings, reports, settings
- [x] **Admin section** (`/admin/*`) — dashboard, agencies, buses, routes, schedules, bookings, stations, users, reports, settings
- [x] Edge middleware — JWT decoded via `atob()` (Vercel edge runtime compatible), protects `/agency/*` and `/admin/*`, enforces correct role per section
- [x] Route group `(protected)` — admin layout wraps only protected pages; login page excluded entirely
- [x] Responsive — hamburger drawer on mobile, fixed sidebar on desktop
- [x] Agency management page — create, edit, activate/deactivate agencies with pagination and search
- [x] i18n — English, French, Kinyarwanda

### Infrastructure

- [x] Docker Compose — backend + 2 frontend containers (passenger + staff portal)
- [x] Production Docker Compose — nginx reverse proxy, `expose` instead of `ports`, env_file
- [x] Dockerfiles use multi-stage build (`deps → builder → runner`) with `next start`; no standalone output required
- [x] Nginx merges `staff.tega.rw`, `agency.tega.rw`, `admin.tega.rw` into single `frontend-admin` upstream
- [x] Deployed backend to Render with Supabase PostgreSQL
- [x] Deployed frontends to Vercel with `NEXT_PUBLIC_API_URL` environment variable
- [x] `vercel.json` in `frontend-admin/` clears `.next/cache` before each build (prevents stale Tailwind content paths)
- [x] CSP headers include `https://*.onrender.com` for Vercel→Render API calls
- [x] Security headers on all frontends: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [x] Removed stale `frontend/` and `frontend-agency/` directories (superseded by split architecture)

---

## Pending / Known Issues

| Item | Priority | Notes |
|------|----------|-------|
| Real MTN MoMo / Airtel Money | High | Obtain sandbox credentials; webhook handler already built |
| Real SMS (Africa's Talking) | Medium | Password reset token currently logged to console |
| Real email delivery | Low | Templates ready; needs SMTP/SES credentials |
| Phone OTP verification on registration | Low | Currently accepts any phone number |
| HTTPS in self-hosted production | Medium | Nginx config provided in `nginx/nginx.conf`; needs Let's Encrypt certs |
| Shared cookie domain for multi-subdomain | Low | Set `accessToken` cookie domain to `.tega.rw` in production |

---

## Running Locally

```bash
# Docker (recommended)
docker compose up --build -d

# Without Docker
cd backend && npm run dev          # port 5000
cd frontend-passenger && npm run dev              # port 3000
cd frontend-admin && npm run dev -- -p 3001       # port 3001 (Staff Portal)
```

## Local Access

| App | URL |
|-----|-----|
| Passenger | http://localhost:3000 |
| Staff Portal | http://localhost:3001/admin/login |
| API | http://localhost:5000/api/v1 |
| Swagger | http://localhost:5000/api/docs |
