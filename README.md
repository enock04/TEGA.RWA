# TEGA.Rw — Rwanda Bus Ticketing Platform

A mobile-first web application that enables passengers to search, book, and pay for inter-provincial bus seats across Rwanda. Supports MTN MoMo, Airtel Money, digital QR-code tickets, a unified staff portal for agency and admin users, and a full system administration panel.

---

## Project Status

**Current phase:** MVP — Feature Complete
**Last updated:** March 2026

| Area | Status | Notes |
|------|--------|-------|
| Passenger app | ✅ Live | Search, multi-passenger booking, payment, tickets, dashboard |
| Staff Portal | ✅ Live | Single app for both agency and admin users, role-based routing |
| Backend API | ✅ Live | REST API with JWT auth, role guards, rate limiting |
| Deployed to cloud | ✅ Live | Backend → Render · Frontends → Vercel |
| Agency management API | ✅ Complete | Full CRUD + activate/deactivate via admin panel |
| Multi-passenger booking | ✅ Complete | 1–8 passengers, per-seat selection, batch atomic booking |
| Role-based isolation | ✅ Complete | JWT middleware enforces role per portal section |
| Mobile money payment | ⚠️ Mocked | Flow and UI complete; real MTN MoMo / Airtel integration pending |
| SMS (password reset) | ⚠️ Mocked | Token logged to console; Africa's Talking integration pending |
| Email delivery | ⚠️ Mocked | Templates ready; SMTP credentials needed |
| Phone OTP verification | ❌ Not started | Registration accepts any phone without verification |
| HTTPS | ❌ Not configured | Must be handled at reverse proxy / load balancer in production |

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [User Roles & Access](#user-roles--access)
- [Passenger App](#passenger-app)
- [Staff Portal](#staff-portal)
- [How It Works](#how-it-works)
- [Feature Checklist](#feature-checklist)
- [Security](#security)
- [Backend API Reference](#backend-api-reference)
- [Test Data & Seed](#test-data--seed)
- [Development (without Docker)](#development-without-docker)
- [Rebuilding after changes](#rebuilding-after-changes)
- [Known Limitations](#known-limitations)

---

## Architecture

```
TEGA.RWA/
├── backend/              Node.js / Express REST API
├── frontend-passenger/   Passenger-facing Next.js app
└── frontend-admin/       Staff Portal — agency + admin (unified)
```

**Two frontends, not three.** The agency and admin portals are merged into a single Next.js app (`frontend-admin`) called the **Staff Portal**. A single login page (`/admin/login`) asks the user to select their role before signing in. After login, the JWT role determines which portal section they land in:

- `agency` → `/agency/*` — green sidebar, fleet and booking management
- `admin` → `/admin/*` — purple sidebar, system-wide management

Next.js middleware (edge runtime) enforces this boundary on every request — wrong-role users are redirected to login regardless of how they navigate.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| State | Zustand (with localStorage + cookie persistence) |
| Forms | React Hook Form + Zod |
| HTTP | Axios with auto token-refresh interceptor |
| i18n | react-i18next (English, French, Kinyarwanda) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 15 (hosted on Supabase) |
| Auth | JWT — access token (1 h) + refresh token (30 d) |
| QR Codes | `qrcode` npm package |
| Containerisation | Docker + Docker Compose |
| Cloud hosting | Render (backend) · Vercel (frontends) |

---

## Quick Start

### Prerequisites
- Docker Desktop installed and running

### Start everything locally

```bash
git clone <repo-url>
cd TEGA.RWA
docker compose up -d --build
```

### Local URLs

| App | URL | For |
|-----|-----|-----|
| Passenger | http://localhost:3000 | Customers buying tickets |
| Staff Portal | http://localhost:3001 | Agency staff and system admins |
| API | http://localhost:5000/api/v1 | — |
| API Docs | http://localhost:5000/api/docs | Swagger UI |

---

## Deployment

The system is deployed on free-tier cloud services:

| Service | Host | Notes |
|---------|------|-------|
| Backend API | [Render](https://render.com) | Free tier — sleeps after 15 min idle; first request after sleep takes ~30 s |
| Passenger app | [Vercel](https://vercel.com) | Always on |
| Staff Portal | [Vercel](https://vercel.com) | Always on |
| Database | [Supabase](https://supabase.com) | Hosted PostgreSQL — always on |

### Environment variables required on Vercel

For both frontend projects, set:

```
NEXT_PUBLIC_API_URL=https://<your-render-backend>.onrender.com/api/v1
```

### Environment variables required on Render

See `.env.production.example` in the repo root for the full list. Key variables:

```
DATABASE_URL=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://your-passenger.vercel.app,https://your-staff.vercel.app
```

---

## User Roles & Access

| Role | Login | Portal |
|------|-------|--------|
| `passenger` | `/auth/login` (passenger app) | Passenger app |
| `agency` | `/admin/login` (Staff Portal) — select "Agency" | `/agency/*` |
| `admin` | `/admin/login` (Staff Portal) — select "Admin" | `/admin/*` |

Role boundaries are enforced in two independent layers:
1. **Next.js middleware (edge)** — decodes JWT on every request; wrong-role users redirected to login
2. **Backend API** — verifies JWT signature and checks `authorize('admin', 'agency')` on every protected route

Default role on registration is `passenger`. Agency and admin accounts must be created via Admin → Users or seeded directly in the database.

---

## Passenger App

| Route | Description |
|-------|-------------|
| `/` | Home — personalised greeting, popular routes |
| `/search` | Search buses by route and date, sort by time or price |
| `/booking/[scheduleId]` | Select 1–8 seats, enter per-passenger details |
| `/booking/summary/[bookingId]` | Booking confirmation with group summary |
| `/payment/[bookingId]` | Mobile money payment with auto-polling |
| `/ticket/[bookingId]` | Digital e-ticket with QR code |
| `/dashboard` | Personal booking history with status filters |
| `/profile` | Edit profile and change password |
| `/auth/login` | Passenger login |
| `/auth/register` | New account registration |
| `/auth/forgot-password` | Password reset via phone number |

---

## Staff Portal

One app, two portal sections. Login at `/admin/login`, select your role.

### Agency section (`/agency/*`) — green sidebar

All routes require `role = agency`.

| Route | Description |
|-------|-------------|
| `/agency` | Dashboard — revenue, booking stats, top routes |
| `/agency/buses` | Fleet management — add and edit buses |
| `/agency/schedules` | Departure schedules — create, edit, cancel |
| `/agency/bookings` | Passenger bookings on agency schedules, filters + pagination |
| `/agency/reports` | Revenue and booking reports with date range filter |
| `/agency/settings` | Profile and password management |

### Admin section (`/admin/*`) — purple sidebar

All routes require `role = admin`.

| Route | Description |
|-------|-------------|
| `/admin` | System-wide dashboard — revenue, KPIs, recent bookings |
| `/admin/agencies` | Agency CRUD — create, edit, activate/deactivate |
| `/admin/buses` | Manage all buses across all agencies |
| `/admin/routes` | Manage bus routes between stations |
| `/admin/schedules` | Manage all departure schedules |
| `/admin/bookings` | View all bookings system-wide with filters |
| `/admin/stations` | Create, edit, delete stations |
| `/admin/users` | User management — roles, activate/deactivate, create agents |
| `/admin/reports` | Revenue by route, daily breakdown, date filter |
| `/admin/settings` | Admin profile and password |
| `/admin/login` | Staff Portal login (shared entry point) |

---

## How It Works

### Passenger Booking Flow

```
1. SEARCH
   Choose departure, destination, date, number of passengers
   → results sorted by time or price

2. SEAT SELECTION
   Visual bus layout (2×2 grid) with colour-coded seats
   Booked seats disabled; selected seats highlighted per passenger
   Up to 8 passengers per booking — each gets their own seat and form

3. BOOKING CREATED  (POST /bookings/batch)
   All seats reserved atomically in one DB transaction
   15-minute expiry timer starts

4. PAYMENT
   Select MTN MoMo or Airtel Money → enter mobile number
   Auto-polls every 5 s → redirects on completion
   Manual "I've Paid" fallback

5. TICKET
   Booking confirmed → digital ticket with unique number (TKT-YYYYMMDD-XXXX)
   QR code encodes: booking ID, passenger, bus, route, seat, departure time
   Print or present at boarding
```

### Staff Login Flow

```
1. Open Staff Portal → /admin/login
2. Select role — "Agency" (green) or "Admin" (purple)
3. Enter phone number + password
4. JWT role validated → redirected to correct portal section
5. Attempting to access the other section is blocked by edge middleware
```

---

## Feature Checklist

### Authentication & Account
- [x] Passenger registration (full name, phone, optional email, password)
- [x] Login — phone number + password
- [x] JWT session: access (1 h) + refresh (30 d) with auto-refresh on 401
- [x] Staff Portal — single login with Agency / Admin role selector
- [x] Role-based routing enforced at Next.js edge middleware
- [x] Forgot password — phone-based reset token (logged to console in dev)
- [x] Change password (requires current password)
- [x] Account lockout after 5 consecutive failed logins — 15-minute cooldown
- [x] Edit profile (name, email)

### Bus Search
- [x] Departure / destination station dropdowns
- [x] Date picker
- [x] Results: times, duration, bus, seats available, price per seat
- [x] Sort: Earliest / Latest / Price low–high / Price high–low

### Multi-Passenger Booking
- [x] Select 1–8 passengers in a single booking flow
- [x] Per-passenger seat selection with unique colour per passenger
- [x] Pre-filled form for passenger 1 from logged-in user profile
- [x] Per-passenger name, phone, optional email
- [x] Disability / special assistance flag per passenger
- [x] All bookings created atomically (`POST /bookings/batch`)
- [x] Group booking summary page with shared payment link

### Payment
- [x] MTN MoMo + Airtel Money initiation
- [x] Auto-polls every 5 s — redirects automatically on completion
- [x] Manual "I've Paid" confirm button as fallback
- [x] Error state with reset on failure

### Tickets
- [x] Unique ticket number per booking
- [x] QR code (encodes booking details)
- [x] Print button
- [x] "Used" badge after validation

### Passenger Dashboard
- [x] All bookings — filter by status, paginated (10/page)
- [x] Actions per booking: Pay, View Ticket, View Details, Cancel

### Agency Portal
- [x] Dashboard with revenue, booking stats, top routes
- [x] Fleet management (add / edit buses; delete requires admin)
- [x] Schedule management (create / edit / cancel)
- [x] Passenger bookings on agency schedules with filters and pagination
- [x] Revenue reports with date range filter
- [x] Profile and password settings

### Admin Panel
- [x] System-wide dashboard — revenue, KPIs, booking breakdown
- [x] Agency CRUD — create, edit, activate/deactivate
- [x] Station CRUD
- [x] Route CRUD (departure/arrival stations, distance, duration)
- [x] Bus management (plate, type, total seats) — all agencies
- [x] Schedule management — all agencies
- [x] Booking management — filter by status and date, paginated
- [x] User management — search, activate/deactivate, assign roles, create agents
- [x] Revenue reports with date filter — by route and daily

---

## Security

| Layer | Measure |
|-------|---------|
| Auth tokens | Separate secrets for access (1 h) and refresh (30 d) tokens |
| Account lockout | 5 failed logins → 15-minute lockout; resets on success |
| Rate limiting | Global: 100 req/15 min · Auth: 20 req/15 min · Bookings/Payments: 30 req/hr |
| CORS | Strict origin whitelist from `FRONTEND_URL`; fail-closed if origin not listed |
| Webhook | `X-Webhook-Secret` header required; requests rejected if secret unconfigured |
| Input validation | All inputs validated with `express-validator`; pagination capped at 100 |
| Password hashing | bcrypt, cost factor 12 |
| Timing attacks | Fake bcrypt compare on unknown phone numbers during login |
| Error handling | 500s return generic messages; tokens/passwords redacted from logs |
| Security headers | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Route protection | Next.js edge middleware decodes JWT and enforces role boundaries on every request |
| SQL injection | All queries use parameterised statements — no string concatenation |
| API docs | Swagger UI available in development only |

### Required environment variables for production

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Access token signing secret (min 32 chars, unique per environment) |
| `JWT_REFRESH_SECRET` | Refresh token secret (must differ from `JWT_SECRET`) |
| `WEBHOOK_SECRET` | Must match `X-Webhook-Secret` from payment provider |
| `FRONTEND_URL` | Comma-separated allowed CORS origins |
| `DB_PASSWORD` | PostgreSQL password |

---

## Backend API Reference

Base URL: `http://localhost:5000/api/v1`

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register new passenger |
| POST | `/auth/login` | — | Login → returns access + refresh tokens |
| POST | `/auth/refresh` | — | Refresh access token |
| GET | `/auth/profile` | user | Get current user profile |
| PUT | `/auth/change-password` | user | Change password |
| POST | `/auth/forgot-password` | — | Request password reset |
| POST | `/auth/reset-password` | — | Reset with token |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/profile` | user | Get own profile |
| PUT | `/users/profile` | user | Update profile |
| GET | `/users` | admin | List all users |
| PATCH | `/users/:id/status` | admin | Activate / deactivate |
| PUT | `/users/:id` | admin | Update role or details |
| POST | `/users/agents` | admin | Create agency account |

### Agencies
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/agencies` | admin | List all agencies (paginated + search) |
| POST | `/admin/agencies` | admin | Create agency |
| GET | `/admin/agencies/:id` | admin | Get agency by ID |
| PUT | `/admin/agencies/:id` | admin | Update agency |
| PATCH | `/admin/agencies/:id/status` | admin | Activate / deactivate agency |

### Buses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/buses` | — | List all buses |
| POST | `/buses` | admin, agency | Add bus |
| PUT | `/buses/:id` | admin, agency | Update bus |
| DELETE | `/buses/:id` | admin | Delete bus |
| GET | `/buses/:id/seats` | — | Seat availability for a schedule |

### Schedules
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/schedules` | — | List all schedules |
| GET | `/schedules/:id` | — | Schedule detail |
| POST | `/schedules` | admin, agency | Create schedule |
| PUT | `/schedules/:id` | admin, agency | Update schedule |
| DELETE | `/schedules/:id` | admin, agency | Cancel schedule |

### Routes & Stations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/routes` | — | List routes |
| GET | `/routes/search` | — | Search schedules by route + date |
| POST | `/routes` | admin | Create route |
| PUT | `/routes/:id` | admin | Update route |
| DELETE | `/routes/:id` | admin | Delete route |
| GET | `/stations` | — | List stations |
| POST | `/stations` | admin | Create station |
| PUT | `/stations/:id` | admin | Update station |
| DELETE | `/stations/:id` | admin | Delete station |

### Bookings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bookings` | user | Create single booking |
| POST | `/bookings/batch` | user | Create multi-passenger bookings (atomic) |
| GET | `/bookings/my` | user | Own bookings |
| GET | `/bookings/admin` | admin, agency | All bookings |
| GET | `/bookings/:id/summary` | user | Booking summary |
| DELETE | `/bookings/:id` | user | Cancel booking |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/initiate` | user | Initiate mobile money payment |
| POST | `/payments/:id/confirm` | user | Manually confirm payment |
| GET | `/payments/booking/:id` | user | Payment status for a booking |
| GET | `/payments` | admin | All payments |
| POST | `/payments/webhook` | webhook secret | Payment provider callback |

### Tickets
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tickets/:bookingId` | user | Get ticket for a booking |
| GET | `/tickets/number/:number` | user | Get ticket by ticket number |
| POST | `/tickets/validate/:number` | admin, agency | Mark ticket as used |
| GET | `/tickets` | admin | All tickets |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/dashboard` | admin, agency | Dashboard statistics |
| GET | `/admin/reports` | admin, agency | Revenue and booking reports |

---

## Test Data & Seed

The database is seeded on first run with:

### Stations (6)
Kigali (Nyabugogo), Huye (Butare), Rubavu (Gisenyi), Musanze (Ruhengeri), Kayonza, Kicukiro

### Routes & Prices

| Route | Base Price |
|-------|-----------|
| Kigali → Huye | RWF 3,500 |
| Kigali → Rubavu | RWF 4,000 |
| Kigali → Musanze | RWF 3,000 |
| Kigali → Kayonza | RWF 2,500 |

### Buses

| Plate | Type | Seats |
|-------|------|-------|
| RAB 001 A | Coach | 44 |
| RAB 002 A | Standard | 30 |

### Schedules
Departures are seeded for today through 3 days ahead so testing never requires changing dates.

### Creating test accounts

Register a passenger at `/auth/register`, then promote via Admin → Users, or insert directly:

```sql
-- Admin user (password: Admin1234)
INSERT INTO users (id, full_name, phone_number, password_hash, role)
VALUES (gen_random_uuid(), 'Admin User', '+250788000001',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMeSSaLOd6aKpz1vWQwBt8vGAa', 'admin');

-- Agency user (password: Admin1234)
INSERT INTO users (id, full_name, phone_number, password_hash, role)
VALUES (gen_random_uuid(), 'Agency User', '+250788000002',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMeSSaLOd6aKpz1vWQwBt8vGAa', 'agency');
```

### Testing forgot password (dev)

```bash
docker logs tega_rw_backend | grep "Password reset token"
```

---

## Development (without Docker)

```bash
# Backend — hot-reload via nodemon
cd backend && npm install && npm run dev       # port 5000

# Passenger app
cd frontend-passenger && npm install && npm run dev              # port 3000

# Staff Portal (agency + admin)
cd frontend-admin && npm install && npm run dev -- -p 3001       # port 3001
```

Create `backend/.env` with the variables listed in the Security section above.

---

## Rebuilding after changes

```bash
# Rebuild a single service
docker compose up -d --build frontend-passenger --force-recreate
docker compose up -d --build frontend-admin --force-recreate
docker compose up -d --build backend --force-recreate

# Rebuild everything
docker compose up -d --build --force-recreate
```

---

## Known Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Real SMS (password reset) | Mocked | Token logged to console; integrate Africa's Talking or similar |
| Real mobile money | Mocked | MTN MoMo and Airtel Money simulated; webhook handler is ready |
| Email delivery | Mocked | Template built; needs SMTP credentials |
| Phone number OTP verification | Not implemented | Registration accepts any phone without verification |
| HTTPS enforcement | Not implemented | Handle at reverse proxy level in production |
| Shared cookie domain | Not configured | For production subdomains, set cookie domain to `.tega.rw` |
| Agency data scoping | Not implemented | Agency dashboard, buses, bookings, and reports show system-wide data — no `agency_id` FK on `users` table yet; requires schema migration |
| Bus delete for agency | Restricted | `DELETE /buses/:id` is admin-only; agency users can add and edit but not delete buses |

---

*Last updated: March 2026 · MVP feature-complete · Unified Staff Portal (agency + admin in one app) · Backend on Render · Frontends on Vercel · Core flows (search → book → pay → ticket) end-to-end functional*
