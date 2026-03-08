# TEGA.Rw — Inter-Provincial Bus Ticket Booking System

TEGA.Rw is a mobile-first web application that enables passengers to search, book, and pay for inter-provincial bus seats across Rwanda. It supports multiple payment methods (MTN MoMo, Airtel Money), digital ticket generation, and an admin panel for managing routes, buses, and schedules.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Current Functionalities](#current-functionalities)
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
5. Receive a digital ticket with a QR code for boarding

Admins and agency operators can manage the entire fleet — routes, buses, schedules, and bookings — through a dedicated admin dashboard.

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
| Auth | JWT (access token + refresh token) |
| Containerisation | Docker + Docker Compose |
| Notifications | react-hot-toast |

---

## Project Structure

```
TEGA.RWA/
├── docker-compose.yml          # Orchestrates all 3 containers
├── frontend/                   # Next.js 15 app
│   └── src/
│       ├── app/                # App Router pages
│       │   ├── page.tsx        # Home / landing page
│       │   ├── auth/           # Login & Register
│       │   ├── search/         # Bus search
│       │   ├── booking/        # Seat selection + booking summary
│       │   ├── payment/        # Mobile money payment
│       │   ├── ticket/         # Digital ticket view
│       │   ├── dashboard/      # Passenger trip history
│       │   └── admin/          # Admin panel (routes, buses, schedules, bookings, reports)
│       ├── components/
│       │   ├── layout/         # MainLayout, AppHeader, BottomNav, AdminSidebar
│       │   └── ui/             # Spinner, Badge, EmptyState
│       ├── lib/api.ts          # All Axios API calls (typed helpers per module)
│       ├── store/authStore.ts  # Zustand auth store
│       └── types/index.ts      # Shared TypeScript types
└── backend/
    └── src/
        ├── app.js              # Express app entry point
        ├── modules/
        │   ├── auth/           # Register, login, token refresh
        │   ├── users/          # User profile management
        │   ├── stations/       # Station CRUD
        │   ├── routes/         # Route management + schedule search
        │   ├── buses/          # Bus + seat management
        │   ├── schedules/      # Schedule management
        │   ├── bookings/       # Booking lifecycle
        │   ├── payments/       # Mobile money payment flow
        │   ├── tickets/        # Ticket generation (Phase 5 — pending)
        │   └── admin/          # Admin stats + reports (Phase 6 — pending)
        ├── middleware/         # Auth, role guards, validation
        └── config/             # DB connection, JWT config
```

---

## How It Works

### Passenger Flow

```
1. SEARCH
   Passenger selects departure city, destination city, travel date,
   and number of passengers → clicks "Search Buses"

2. RESULTS
   Available schedules are returned showing: departure/arrival times,
   bus name, available seats, price per seat

3. SEAT SELECTION
   Passenger picks a seat from the visual bus layout
   (Economy / Business / VIP seat classes colour-coded)
   → fills in passenger name, phone number, optional email

4. BOOKING CREATED
   System creates a pending booking with a 15-minute expiry
   → redirects to Booking Summary page

5. PAYMENT
   Passenger selects MTN MoMo or Airtel Money
   → enters their mobile money phone number
   → a payment prompt is pushed to their phone
   → passenger enters PIN on their device
   → taps "I've Paid — Confirm Booking" on the app

6. TICKET
   Payment is confirmed → booking status becomes "confirmed"
   → digital ticket is generated with a unique ticket number and QR code
   → ticket displayed for boarding

   NOTE: Ticket generation (Step 6) is currently pending backend implementation (Phase 5).
```

### Admin Flow

```
1. Admin logs in with role "admin" or "agency"
2. Redirected to /admin dashboard
3. Can manage:
   - Routes: create routes between stations, set distance/duration
   - Buses: register buses with plate number, type, seat count
   - Schedules: assign buses to routes with departure/arrival times and price
   - Bookings: view all bookings with filters by status and date
   - Reports: revenue analytics by route and date range (Phase 6 — pending)
```

---

## Current Functionalities

### Authentication
- [x] Passenger registration (full name, phone number, optional email, password)
- [x] Login with phone number and password
- [x] JWT-based session with automatic access token refresh on expiry
- [x] Role-based routing: passengers → home dashboard, admin/agency → admin panel
- [x] Persistent session via localStorage

### Home Dashboard (Authenticated Passengers)
- [x] Personalised greeting with user's first name
- [x] Embedded map showing user's current location (OpenStreetMap, falls back to Kigali)
- [x] Quick action cards: "Book a Bus" and "My Trips"
- [x] Popular routes section showing upcoming schedules with prices

### Bus Search
- [x] Select departure and destination stations from dropdown
- [x] Choose travel date (today or future dates)
- [x] Select number of passengers (1–6)
- [x] Results show: departure/arrival times, duration, bus name, available seats, price
- [x] Auto-search when navigating from a deep link with query parameters

### Booking
- [x] Visual seat map with colour-coded seat classes (Economy, Business, VIP)
- [x] Booked seats shown as disabled/greyed out
- [x] Seat class pricing shown per selection
- [x] Passenger details form pre-filled from logged-in user's profile
- [x] Booking expiry timer (15 minutes to complete payment)
- [x] Cancel pending bookings

### Payment
- [x] MTN MoMo payment initiation
- [x] Airtel Money payment initiation
- [x] Step-by-step UI: form → waiting for PIN → confirming
- [x] Manual confirmation after PIN entry
- [x] Redirects to ticket on successful payment

### Passenger Dashboard
- [x] View all personal bookings
- [x] Filter bookings by status: All, Pending, Confirmed, Cancelled
- [x] Pagination (10 bookings per page)
- [x] Per-booking actions: Pay (pending), View Ticket (confirmed), View Details

### Booking Summary
- [x] Full booking detail view (route, bus, seat, passenger, amount)
- [x] Expiry warning with countdown for pending bookings
- [x] Status badge (Pending / Confirmed / Cancelled / Expired)
- [x] Direct links to payment or ticket pages

### Ticket
- [x] Ticket card with: ticket number, route, passenger name, phone, departure date/time, seat, bus, plate number
- [x] QR code for boarding scan
- [x] Print ticket button
- [x] "Used" status indicator

### Admin Panel — Routes
- [x] View all routes
- [x] Create new routes (select departure/arrival stations, set distance and duration)
- [x] Delete routes

### Admin Panel — Buses
- [x] View all buses
- [x] Create new buses (plate number, bus type, total seats)
- [x] Delete buses

### Admin Panel — Schedules
- [x] View all schedules (route, bus, times, price, seat availability, status)
- [x] Create new schedules (assign bus to route, set times and base price)
- [x] Cancel schedules

### Admin Panel — Bookings
- [x] View all bookings across the system
- [x] Filter by status (pending, confirmed, cancelled, expired)
- [x] Filter by date
- [x] Paginated table view

---

## Non-Functional / Pending Features

### Phase 5 — Ticket Service (Backend not implemented)
- [ ] **Ticket generation** — `GET /tickets/:bookingId` returns HTTP 503
  - The frontend ticket page is fully built and ready
  - Blocked on backend: QR code generation, ticket number assignment, DB write
  - After payment confirmation, users currently see an error navigating to `/ticket/:id`

### Phase 6 — Admin Intelligence (Backend not implemented)
- [ ] **Admin dashboard stats** — `GET /admin/dashboard` returns HTTP 503
  - Cards for total bookings, revenue, confirmed/pending/cancelled counts are built
  - Blocked on backend aggregation queries
- [ ] **Admin reports** — `GET /admin/reports` returns HTTP 503
  - Revenue-by-route table and daily bookings table are built
  - Blocked on backend reporting queries
- [ ] **Agency management** — `GET/POST /admin/agencies` returns HTTP 503
  - No frontend page built yet; blocked on backend

### Missing Frontend Pages (APIs exist, pages not built)
- [ ] **User Profile / Settings page** — users cannot currently edit their name, email, or change their password. API endpoints exist: `PUT /users/profile`, `PUT /auth/change-password`
- [ ] **Admin User Management page** — no UI to view all users or toggle a user's active status. API endpoints exist: `GET /users`, `PATCH /users/:id/status`
- [ ] **Admin Station Management page** — no UI to create/edit/delete stations. Full CRUD API exists under `/stations`

### Functional Gaps
- [ ] **Edit routes / buses / schedules** — admin can only create or delete; no edit form. `PUT` endpoints exist on the backend for all three
- [ ] **Forgot / reset password** — no flow exists for users who lose access
- [ ] **Mobile admin navigation** — the admin sidebar is desktop-only; the admin panel is difficult to use on a phone
- [ ] **Automatic payment confirmation** — users must manually tap "I've Paid" after entering their PIN; there is no webhook-driven auto-confirmation or polling
- [ ] **Search result sorting** — results cannot be sorted by price, departure time, or bus type
- [ ] **Multi-seat booking** — the Passengers field is collected in search but only one seat can be selected at a time; a group would need to make separate bookings
- [ ] **Email / SMS notifications** — no confirmation messages sent after booking or payment
- [ ] **Phone number OTP verification** — registration accepts any phone number without verification

---

## User Roles

| Role | Access |
|------|--------|
| `passenger` | Search buses, book seats, pay, view tickets, view own trips |
| `agency` | All passenger access + admin panel (routes, buses, schedules, bookings) |
| `admin` | All agency access + user management, reports, agency management |

Role is assigned at registration (default: `passenger`). Admin/agency accounts must be created directly in the database or via a seeding script.

---

## Running the Application

### Prerequisites
- Docker Desktop installed and running

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

### Rebuild frontend only (after code changes)

```bash
docker compose build --no-cache frontend
docker compose up frontend -d
```

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
| Route | Price |
|-------|-------|
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
Departures are seeded for **today through 3 days ahead** so testing is always possible without needing to change dates. Each route has at least one departure per day.

---

## API Summary

Base URL: `http://localhost:5000/api/v1`

| Module | Endpoint | Status |
|--------|---------|--------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `PUT /auth/change-password` | ✅ Live |
| Users | `GET/PUT /users/profile`, `GET /users`, `PATCH /users/:id/status` | ✅ Live |
| Stations | `GET/POST /stations`, `PUT/DELETE /stations/:id` | ✅ Live |
| Routes | `GET /routes/search`, `GET/POST /routes`, `PUT/DELETE /routes/:id` | ✅ Live |
| Buses | `GET/POST /buses`, `GET /buses/:id/seats`, `PUT/DELETE /buses/:id` | ✅ Live |
| Schedules | `GET/POST /schedules`, `PUT/DELETE /schedules/:id` | ✅ Live |
| Bookings | `POST /bookings`, `GET /bookings/my`, `GET /bookings/admin`, `GET /bookings/:id/summary`, `DELETE /bookings/:id` | ✅ Live |
| Payments | `POST /payments/initiate`, `POST /payments/:id/confirm`, `GET /payments/booking/:id` | ✅ Live |
| Tickets | `GET /tickets/:bookingId` | ❌ 503 — Phase 5 |
| Admin | `GET /admin/dashboard`, `GET /admin/reports`, `GET/POST /admin/agencies` | ❌ 503 — Phase 6 |

---

## Known Issues

| Issue | Severity | Phase |
|-------|----------|-------|
| Ticket page fails after payment — backend returns 503 | High | Phase 5 |
| Admin dashboard and reports pages return 503 | Medium | Phase 6 |
| Admin panel unusable on mobile (no sidebar menu) | Medium | Pending |
| No edit form for routes, buses, or schedules | Medium | Pending |
| No user profile / password change page | Medium | Pending |
| Multi-passenger booking requires separate transactions | Low | Pending |
| Payment auto-confirmation not implemented (manual only) | Medium | Pending |

---

*Last updated: March 2026 — MVP build complete, Phase 5 & 6 pending.*
