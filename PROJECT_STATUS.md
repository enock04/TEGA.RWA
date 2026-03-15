Status: Running in Docker — All four containers healthy (backend + 3 frontend apps). Backend Phases 1–6 complete; frontend split into three isolated Next.js apps with role-based JWT middleware; Docker deployment working.

**📖 See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete installation and configuration instructions.**

## Running the App

```bash
docker compose up --build
```

| Service | URL | Role |
|---------|-----|------|
| Passenger app | http://localhost:3000 | Public / passengers |
| Agency portal | http://localhost:3001 | Agency staff |
| Admin panel | http://localhost:3002 | Admins |
| Backend API | http://localhost:5000/api/v1 | — |
| API Docs (Swagger) | http://localhost:5000/api/v1/docs | — |

All services start automatically. Schema and seed data are applied on first boot.

## Key Achievements

- Project directory structure established for both backend (Node.js/Express) and frontend (Next.js)
- Backend configuration complete: PostgreSQL connection pool, Swagger/OpenAPI setup, Winston logger, standardized response helpers
- Middleware layer implemented: JWT authentication, role-based access control (passenger / agency / admin), request validation, and global error handling
- Phase 1 (Auth & Users): Registration, login, token refresh, password change, and profile endpoints fully implemented with input validation and bcrypt password hashing
- Phase 2 (Search & Transport): Stations, Routes, Buses, and Schedules modules complete with full CRUD and the core bus search endpoint (search by departure station, destination, and travel date)
- Phase 3 (Bookings): Seat booking with PostgreSQL row-level locking, 15-minute expiry, cancellation with seat restoration, and admin booking list
- Phase 4 (Payments): Full payment lifecycle — initiate, confirm, and webhook handler for MTN MoMo and Airtel Money (mock); booking auto-confirmed on payment success
- Phase 5 (Tickets): Real ticket routes wired — GET /tickets/:bookingId, GET /tickets/number/:ticketNumber, POST /tickets/validate/:ticketNumber; tickets auto-issued on payment confirmation
- Phase 6 (Admin Dashboard API): dashboard stats, revenue reports, daily/route breakdowns; agency management endpoints stubbed (503)
- Frontend Split (March 2026): Monolith split into three isolated Next.js apps — frontend-passenger/, frontend-agency/, frontend-admin/ — each with its own Dockerfile and Docker Compose service
- Role-Based JWT Middleware: Each app enforces its own role boundary by decoding the JWT payload from the accessToken cookie (no client-side cookie race); agency and admin users are blocked from passenger routes and vice versa
- Mobile App Redesign: Phone-frame shell (max-width 430px), sticky AppHeader with backHref support, fixed BottomNav, rounded-2xl inputs/buttons/cards across all pages
- Auth Gate: Root page (/) is branded splash screen — unauthenticated users see Sign In / Create Account; authenticated users auto-redirected to /dashboard
- App Rename: All references updated from IBTRS → TEGA.Rw across frontend, backend, docker-compose, env files
- Docker Deployment: Full stack containerised — Supabase PostgreSQL, Node.js backend, three Next.js standalone frontends; all containers healthy and communicating

## Known Remaining Issues

- MTN MoMo and Airtel Money providers are mocked — real sandbox credentials required before live payment testing
- Agency management endpoints (POST/GET/PUT/PATCH /admin/agencies) — fully implemented
- SMS (password reset OTP) is mocked — real SMS gateway credentials needed
- Email delivery is mocked — real SMTP/SES credentials needed
- HTTPS not configured — nginx reverse proxy or Caddy needed before production

## Progress

[x] Phase 1 — Auth & Users
[x] Phase 2 — Search & Transport (Stations, Routes, Buses, Schedules)
[x] Phase 3 — Bookings (seat selection, expiry, cancellation)
[x] Phase 4 — Payments (MTN MoMo, Airtel Money, webhook)
[x] Phase 5 — Tickets API (real routes wired, auto-issued on payment)
[x] Phase 6 — Admin Dashboard API (stats, revenue reports, route reports)
[x] Frontend — Three isolated Next.js apps (passenger / agency / admin)
[x] Role-Based Isolation — JWT middleware enforces role boundaries in each app
[x] Mobile App Redesign — Phone frame, BottomNav, AppHeader, all pages rewritten
[x] Auth Gate — Splash screen at /, auth redirects for authenticated users
[x] App Rename — IBTRS → TEGA.Rw across all files
[x] Infrastructure — Docker Compose with backend + 3 frontend containers; fully working

[x] Agency Management API
    - GET/POST /admin/agencies, GET/PUT /admin/agencies/:id, PATCH /admin/agencies/:id/status
    - Admin UI page at /admin/agencies with create, inline-edit, activate/deactivate

[ ] Real Payment Integration
    - Obtain MTN MoMo and Airtel Money sandbox credentials
    - Replace mock payment service with live API calls

[ ] Production Hardening
    - HTTPS via nginx/Caddy reverse proxy
    - Real SMS gateway (Africa's Talking or similar)
    - Real email provider (SES / SendGrid)
    - Environment-specific secrets management
