# TEGA.Rw — Inter-Provincial Bus Ticket Booking System

TEGA.Rw is a mobile-first web application that enables passengers to search, book, and pay for inter-provincial bus seats across Rwanda. It supports multiple payment methods (MTN MoMo, Airtel Money), digital ticket generation with QR codes, and an admin panel for managing routes, buses, schedules, users, and reports.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Current Functionalities](#current-functionalities)
- [Security](#security)
- [Non-Functional / Pending Features](#non-functional--pending-features)
- [User Roles](#user-roles)
- [Running the Application](#running-the-application)
- [Available Routes & Test Data](#available-routes--test-data)
- [API Summary](#api-summary)
- [Known Issues](#known-issues)

---

## Overview

TEGA.Rw connects passengers with bus operators across Rwanda. A passenger can:

1. Search for available buses between two cities on a chosen date
2. Select a seat from a visual seat map
3. Fill in passenger details and confirm a booking
4. Pay via mobile money (MTN MoMo or Airtel Money)
5. Receive a digital ticket with a unique ticket number and QR code for boarding

Admins and agency operators manage the entire fleet — routes, buses, schedules, stations, users, and bookings — through a dedicated admin dashboard with revenue reports.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| State Management | Zustand |
| Form Validation | React Hook Form + Zod |
| HTTP Client | Axios (with auto token refresh interceptor) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 15 |
| Auth | JWT (access token 1h + refresh token 30d) |
| QR Codes | `qrcode` npm package |
| Email | Nodemailer (mocked in development) |
| Containerisation | Docker + Docker Compose |
| Notifications | react-hot-toast |

---

## Project Structure

```
TEGA.RWA/
├── docker-compose.yml          # Orchestrates all 3 containers
├── backend/
│   ├── migrations/
│   │   ├── 001_initial.sql     # Full schema including lockout fields
│   │   ├── 002_seed.sql        # Test data (stations, routes, buses, schedules)
│   │   ├── 003_password_reset.sql  # Password reset tokens table
│   │   └── 004_security.sql    # Account lockout columns (for existing DBs)
│   └── src/
│       ├── app.js              # Express entry point, middleware, rate limiting
│       ├── modules/
│       │   ├── auth/           # Register, login, refresh, change/forgot/reset password
│       │   ├── users/          # Profile management, admin user listing
│       │   ├── stations/       # Station CRUD
│       │   ├── routes/         # Route management + schedule search
│       │   ├── buses/          # Bus + seat management
│       │   ├── schedules/      # Schedule management
│       │   ├── bookings/       # Booking lifecycle (create, cancel, view)
│       │   ├── payments/       # Mobile money payment flow + webhook
│       │   ├── tickets/        # Ticket generation with QR codes
│       │   └── admin/          # Dashboard stats + revenue reports
│       └── middleware/         # Auth (JWT), role guards, validation, error handler
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx            # Home / landing page with popular routes
        │   ├── search/             # Bus search with sorting
        │   ├── booking/            # Seat selection + booking summary
        │   ├── payment/            # Mobile money payment with auto-polling
        │   ├── ticket/             # Digital ticket with QR code
        │   ├── dashboard/          # Passenger trip history
        │   ├── profile/            # Edit profile + change password
        │   ├── auth/               # Login, Register, Forgot/Reset Password
        │   └── admin/              # Dashboard, routes, buses, schedules,
        │                           # bookings, reports, stations, users
        ├── components/
        │   ├── layout/             # MainLayout, AppHeader, BottomNav,
        │   │                       # AdminSidebar, mobile drawer
        │   └── ui/                 # Spinner, Badge, EmptyState
        ├── lib/api.ts              # All typed Axios API helpers
        ├── middleware.ts           # Edge route protection (unauthenticated redirect)
        └── store/authStore.ts      # Zustand auth store
```

---

## How It Works

### Passenger Flow

```
1. SEARCH
   Select departure city, destination, travel date, and number of passengers
   → results sorted by time or price (user choice)

2. RESULTS
   Available schedules showing: departure/arrival times, duration,
   bus name, available seats, price per seat

3. SEAT SELECTION
   Visual bus layout with colour-coded seat classes
   (Economy / Business / VIP) → fill in passenger details

4. BOOKING CREATED
   Pending booking with 15-minute expiry
   → redirected to Booking Summary

5. PAYMENT
   Select MTN MoMo or Airtel Money → enter mobile money number
   → payment prompt pushed to phone → enter PIN
   → app auto-detects payment completion (polls every 5s)
   → or manually confirm with "I've Paid" button

6. TICKET
   Payment confirmed → booking status "confirmed"
   → digital ticket with unique number (TKT-YYYYMMDD-XXXX) and QR code
   → print or present for boarding scan
```

### Admin Flow

```
1. Login with role "admin" or "agency"
2. Redirected to /admin dashboard (booking stats + revenue summary)
3. Manage:
   - Stations: create, edit, delete bus stations
   - Routes: create and edit routes between stations
   - Buses: register and edit buses with seat configuration
   - Schedules: assign buses to routes with times and price; edit active schedules
   - Bookings: view all bookings with filters by status and date
   - Users: view all users, activate/deactivate accounts
   - Reports: revenue by route, daily bookings over last 30 days
4. Mobile-friendly: hamburger menu drawer on small screens
```

---

## Current Functionalities

### Authentication & Account
- [x] Passenger registration (full name, phone, optional email, password)
- [x] Login with phone number and password
- [x] JWT session: access token (1h) + refresh token (30d) with auto-refresh
- [x] Role-based routing: passengers → home, admin/agency → admin panel
- [x] Forgot password — request reset via phone number, enter code, set new password
- [x] Change password (authenticated, requires current password)
- [x] Account lockout after 5 consecutive failed logins (15 min cooldown)
- [x] Edit profile (name, email)
- [x] Sign out

### Home Page (Authenticated Passengers)
- [x] Personalised greeting
- [x] Embedded OpenStreetMap centred on user's location (falls back to Kigali)
- [x] Popular routes section with upcoming schedules and prices

### Bus Search
- [x] Departure and destination station dropdowns
- [x] Travel date picker
- [x] Passengers selector (1–6)
- [x] Results with times, duration, bus, seats left, price
- [x] Sort results: Earliest / Latest / Price low–high / Price high–low

### Booking
- [x] Visual seat map (Economy, Business, VIP — colour coded)
- [x] Booked seats disabled
- [x] Passenger details form (pre-filled from profile)
- [x] 15-minute booking expiry timer
- [x] Cancel pending bookings

### Payment
- [x] MTN MoMo + Airtel Money initiation
- [x] Step-by-step UI (form → waiting → confirming)
- [x] Auto-polls payment status every 5 seconds — redirects automatically on completion
- [x] Manual confirm button as fallback
- [x] Shows error and resets on payment failure

### Passenger Dashboard
- [x] All bookings with status filter (All / Pending / Confirmed / Cancelled)
- [x] Paginated (10 per page)
- [x] Quick actions per booking: Pay, View Ticket, View Details

### Ticket
- [x] Ticket number, route, passenger, seat, bus, plate, departure time
- [x] QR code (encodes booking ID, passenger, bus, route, departure, seat)
- [x] Print button
- [x] "Used" badge after validation

### Admin — Dashboard
- [x] Total bookings, confirmed, pending, cancelled counts
- [x] Total revenue, total passengers
- [x] Recent 5 bookings
- [x] Top 5 routes by booking volume

### Admin — Reports
- [x] Date range filter (from / to)
- [x] Total bookings, revenue, passengers, avg ticket price
- [x] Revenue breakdown by route
- [x] Daily bookings chart data (last 30 days)

### Admin — Stations
- [x] List all stations
- [x] Create new stations (name, city, province)
- [x] Edit stations
- [x] Delete stations

### Admin — Routes
- [x] List all routes
- [x] Create and edit routes (departure/arrival stations, distance, duration)
- [x] Delete routes

### Admin — Buses
- [x] List all buses
- [x] Create and edit buses (plate, type, total seats)
- [x] Delete buses

### Admin — Schedules
- [x] List all schedules with status, seat availability, price
- [x] Create new schedules
- [x] Edit active schedules (bus, route, times, price)
- [x] Cancel schedules

### Admin — Bookings
- [x] View all bookings system-wide
- [x] Filter by status and date
- [x] Paginated table

### Admin — Users
- [x] View all registered users with search (name, phone, email)
- [x] Role badges (admin / agency / passenger)
- [x] Activate / deactivate accounts

---

## Security

The following protections are in place:

| Layer | Measure |
|-------|---------|
| Authentication | JWT with separate access (1h) and refresh (30d) secrets |
| Account lockout | 5 failed logins → 15-minute lockout; auto-reset on success |
| Rate limiting | Global: 100 req/15 min; Auth endpoints: 20 req/15 min; Bookings/payments: 30 req/hr |
| CORS | Strict origin whitelist from `FRONTEND_URL` env var; fail-closed if origin not listed |
| Webhook security | `POST /payments/webhook` requires `X-Webhook-Secret` header; rejects all calls if secret unconfigured |
| Input validation | All inputs validated with `express-validator`; pagination capped at 100; search strings capped at 50 chars |
| Password hashing | bcrypt with cost factor 12 |
| Timing attack prevention | Fake bcrypt compare on unknown phone numbers during login |
| Error handling | 500 errors always return generic message; passwords/tokens redacted from server logs; stack traces hidden in production |
| Security headers | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (via `next.config.js`) |
| Route protection | Next.js edge middleware blocks unauthenticated access to `/dashboard`, `/profile`, `/booking`, `/payment`, `/ticket`, `/admin` |
| API docs | Swagger UI hidden in production; requires admin auth if enabled |
| SQL injection | All queries use parameterised statements — no string concatenation |

### Environment Variables Required in Production

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Access token signing secret (min 32 chars, unique) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (different from JWT_SECRET) |
| `WEBHOOK_SECRET` | Must match `X-Webhook-Secret` header from payment provider |
| `FRONTEND_URL` | Comma-separated list of allowed CORS origins |
| `DB_PASSWORD` | PostgreSQL password |

---

## Non-Functional / Pending Features

### Known Limitations (MVP Scope)

| Feature | Status | Notes |
|---------|--------|-------|
| Real SMS delivery for password reset | Mocked | Token logged to server console in dev; in production, integrate Africa's Talking or similar |
| Real mobile money processing | Mocked | MTN MoMo and Airtel Money initiation/confirmation is simulated; webhook validation is ready for real providers |
| Email ticket delivery | Mocked | Email template is built; SMTP credentials needed in production |
| Multi-seat booking | Not implemented | Passengers field is collected but only one seat can be selected per booking |
| Phone number OTP verification | Not implemented | Registration accepts any phone number without verification |
| Agency management UI | Not implemented | Backend placeholder exists; no frontend page |
| HTTPS enforcement | Not implemented | Needs to be handled at the reverse proxy / load balancer level in production |

---

## User Roles

| Role | Access |
|------|--------|
| `passenger` | Search buses, book seats, pay, view tickets, manage own trips, edit profile |
| `agency` | All passenger access + full admin panel (routes, buses, schedules, bookings, reports) |
| `admin` | All agency access + user management, station management |

Default role on registration is `passenger`. Admin/agency accounts must be created directly in the database or seeded.

---

## Running the Application

### Prerequisites
- Docker Desktop installed and **running**

### Start all services

```bash
docker compose up --build
```

This starts three containers:

| Container | Service | Port |
|-----------|---------|------|
| `tega_rw_db` | PostgreSQL 15 | 5432 |
| `tega_rw_backend` | Node.js / Express API | 5000 |
| `tega_rw_frontend` | Next.js (standalone) | 3000 |

### Access the app

- **App:** http://localhost:3000
- **API:** http://localhost:5000/api/v1
- **API Docs (dev only):** http://localhost:5000/api/docs

### Apply DB migrations (existing database)

When the PostgreSQL volume already exists, new migrations must be applied manually:

```bash
# Password reset tokens table (003)
docker exec tega_rw_db psql -U postgres -d tega_rw_db \
  -f /docker-entrypoint-initdb.d/03_password_reset.sql

# Account lockout columns (004)
docker exec tega_rw_db psql -U postgres -d tega_rw_db \
  -f /docker-entrypoint-initdb.d/04_security.sql
```

### Rebuild frontend after code changes

```bash
docker compose build --no-cache frontend && docker compose up -d
```

### Backend restarts automatically (hot-reload)

The backend source is mounted as a volume — changes to `backend/src/` take effect immediately without a rebuild.

### Database shell

```bash
docker exec -it tega_rw_db psql -U postgres -d tega_rw_db
```

---

## Available Routes & Test Data

The database is seeded with the following on first run:

### Stations (6)
Kigali (Nyabugogo), Huye (Butare), Rubavu (Gisenyi), Musanze (Ruhengeri), Kayonza, Kicukiro

### Routes (4)

| Route | Base Price |
|-------|-----------|
| Kigali → Huye | RWF 3,500 |
| Kigali → Rubavu | RWF 4,000 |
| Kigali → Musanze | RWF 3,000 |
| Kigali → Kayonza | RWF 2,500 |

### Buses (2)

| Plate | Type | Seats |
|-------|------|-------|
| RAB 001 A | Coach | 44 |
| RAB 002 A | Standard | 30 |

### Schedules
Departures are seeded for **today through 3 days ahead** so testing is always possible without changing dates. Each route has at least one departure per day.

### Test Accounts

Create via registration at `/auth/register`, or insert directly:

```sql
-- Create an admin account (password: Admin1234)
INSERT INTO users (id, full_name, phone_number, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Admin User',
  '+250788000001',
  '$2b$12$...', -- bcrypt hash of Admin1234
  'admin'
);
```

### Testing Forgot Password (Dev Mode)

Since SMS is mocked, the reset token is printed to the backend server log:

```bash
docker logs tega_rw_backend | grep "Password reset token"
```

Copy the token and paste it into the reset code field on `/auth/forgot-password`.

---

## API Summary

Base URL: `http://localhost:5000/api/v1`

| Module | Key Endpoints | Auth Required |
|--------|--------------|---------------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh` | No |
| Auth | `PUT /auth/change-password`, `GET /auth/profile` | User |
| Auth | `POST /auth/forgot-password`, `/auth/reset-password` | No |
| Users | `GET/PUT /users/profile` | User |
| Users | `GET /users`, `PATCH /users/:id/status` | Admin |
| Stations | `GET /stations` | No |
| Stations | `POST /stations`, `PUT/DELETE /stations/:id` | Admin |
| Routes | `GET /routes/search`, `GET /routes` | No |
| Routes | `POST/PUT/DELETE /routes/:id` | Admin |
| Buses | `GET /buses`, `GET /buses/:id/seats` | No |
| Buses | `POST/PUT/DELETE /buses/:id` | Admin |
| Schedules | `GET /schedules`, `GET /schedules/:id` | No |
| Schedules | `POST /schedules`, `PUT /schedules/:id`, `DELETE /schedules/:id/cancel` | Admin |
| Bookings | `POST /bookings`, `GET /bookings/my`, `GET /bookings/:id/summary` | User |
| Bookings | `DELETE /bookings/:id` (cancel) | User (own) |
| Bookings | `GET /bookings/admin` | Admin |
| Payments | `POST /payments/initiate`, `POST /payments/:id/confirm` | User |
| Payments | `GET /payments/booking/:bookingId` | User |
| Payments | `POST /payments/webhook` | Webhook secret |
| Payments | `GET /payments` | Admin |
| Tickets | `GET /tickets/:bookingId`, `GET /tickets/number/:ticketNumber` | User |
| Tickets | `POST /tickets/validate/:ticketNumber` | Admin/Agency |
| Tickets | `GET /tickets` | Admin |
| Admin | `GET /admin/dashboard`, `GET /admin/reports` | Admin/Agency |

---

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| Forgot password requires checking server logs in dev | Low | SMS integration needed for production |
| Multi-passenger booking not supported | Low | One booking per seat; workaround: repeat for each passenger |
| No real payment provider integration | Medium | Both MTN MoMo and Airtel Money are fully mocked |
| No HTTPS enforcement at app level | Low | Handle at reverse proxy / load balancer in production |

---

*Last updated: March 2026 — MVP feature-complete. Core flows (search → book → pay → ticket) are fully functional end-to-end. Security hardening applied. Production deployment requires real SMS/payment provider credentials and HTTPS.*
