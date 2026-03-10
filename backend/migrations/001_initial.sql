-- IBTRS Database Schema
-- Run with: psql -U postgres -d ibtrs_db -f migrations/001_initial.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast ILIKE searches

-- Enum types
CREATE TYPE user_role AS ENUM ('passenger', 'agency', 'admin');
CREATE TYPE bus_type AS ENUM ('standard', 'luxury', 'minibus', 'coach');
CREATE TYPE schedule_status AS ENUM ('active', 'cancelled', 'completed', 'delayed');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'expired', 'used');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('mtn_momo', 'airtel_money', 'bank_card', 'cash');
CREATE TYPE seat_class AS ENUM ('economy', 'business', 'vip');

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(100) NOT NULL,
  phone_number    VARCHAR(20) NOT NULL UNIQUE,
  email           VARCHAR(255) UNIQUE,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'passenger',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ─────────────────────────────────────────────
-- AGENCIES
-- ─────────────────────────────────────────────
CREATE TABLE agencies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(150) NOT NULL,
  registration_no VARCHAR(100) UNIQUE,
  contact_phone   VARCHAR(20),
  contact_email   VARCHAR(255),
  address         TEXT,
  logo_url        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- STATIONS
-- ─────────────────────────────────────────────
CREATE TABLE stations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(150) NOT NULL,
  city            VARCHAR(100) NOT NULL,
  province        VARCHAR(100) NOT NULL,
  address         TEXT,
  latitude        DECIMAL(10, 7),
  longitude       DECIMAL(10, 7),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stations_province ON stations(province);
CREATE INDEX idx_stations_city ON stations(city);

-- ─────────────────────────────────────────────
-- ROUTES
-- ─────────────────────────────────────────────
CREATE TABLE routes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  VARCHAR(200) NOT NULL,
  departure_station_id  UUID NOT NULL REFERENCES stations(id),
  arrival_station_id    UUID NOT NULL REFERENCES stations(id),
  distance_km           DECIMAL(8, 2),
  duration_minutes      INTEGER,
  description           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_route CHECK (departure_station_id != arrival_station_id)
);

CREATE INDEX idx_routes_departure ON routes(departure_station_id);
CREATE INDEX idx_routes_arrival ON routes(arrival_station_id);

-- ─────────────────────────────────────────────
-- BUSES
-- ─────────────────────────────────────────────
CREATE TABLE buses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(150) NOT NULL,
  plate_number    VARCHAR(30) NOT NULL UNIQUE,
  bus_type        bus_type NOT NULL DEFAULT 'standard',
  total_seats     INTEGER NOT NULL CHECK (total_seats > 0 AND total_seats <= 100),
  agency_id       UUID REFERENCES agencies(id),
  amenities       JSONB DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_buses_plate ON buses(plate_number);
CREATE INDEX idx_buses_agency ON buses(agency_id);

-- ─────────────────────────────────────────────
-- SEATS
-- ─────────────────────────────────────────────
CREATE TABLE seats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id          UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  seat_number     INTEGER NOT NULL,
  seat_class      seat_class NOT NULL DEFAULT 'economy',
  position        VARCHAR(10),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bus_id, seat_number)
);

CREATE INDEX idx_seats_bus ON seats(bus_id);

-- ─────────────────────────────────────────────
-- SCHEDULES
-- ─────────────────────────────────────────────
CREATE TABLE schedules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id           UUID NOT NULL REFERENCES buses(id),
  route_id         UUID NOT NULL REFERENCES routes(id),
  departure_time   TIMESTAMPTZ NOT NULL,
  arrival_time     TIMESTAMPTZ NOT NULL,
  base_price       DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  total_seats      INTEGER NOT NULL,
  available_seats  INTEGER NOT NULL,
  status           schedule_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_times CHECK (arrival_time > departure_time),
  CONSTRAINT valid_seats CHECK (available_seats >= 0 AND available_seats <= total_seats)
);

CREATE INDEX idx_schedules_route ON schedules(route_id);
CREATE INDEX idx_schedules_bus ON schedules(bus_id);
CREATE INDEX idx_schedules_departure ON schedules(departure_time);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_search ON schedules(route_id, departure_time, status, available_seats);

-- ─────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id),
  schedule_id       UUID NOT NULL REFERENCES schedules(id),
  seat_id           UUID NOT NULL REFERENCES seats(id),
  passenger_name    VARCHAR(100) NOT NULL,
  passenger_phone   VARCHAR(20) NOT NULL,
  passenger_email   VARCHAR(255),
  amount            DECIMAL(10, 2) NOT NULL,
  status            booking_status NOT NULL DEFAULT 'pending',
  expires_at        TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, seat_id, status) -- partial uniqueness handled by partial index below
);

-- Prevent two active bookings for same seat on same schedule
CREATE UNIQUE INDEX idx_bookings_no_duplicate_seat
  ON bookings (schedule_id, seat_id)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_schedule ON bookings(schedule_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

-- ─────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID NOT NULL REFERENCES bookings(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  amount              DECIMAL(10, 2) NOT NULL,
  currency            VARCHAR(5) NOT NULL DEFAULT 'RWF',
  method              payment_method NOT NULL,
  status              payment_status NOT NULL DEFAULT 'pending',
  provider_reference  VARCHAR(200),
  provider_response   JSONB,
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_reference ON payments(provider_reference);

-- ─────────────────────────────────────────────
-- TICKETS
-- ─────────────────────────────────────────────
CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL UNIQUE REFERENCES bookings(id),
  ticket_number   VARCHAR(50) NOT NULL UNIQUE,
  qr_code_data    TEXT NOT NULL,
  is_used         BOOLEAN NOT NULL DEFAULT false,
  used_at         TIMESTAMPTZ,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_booking ON tickets(booking_id);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER FUNCTION
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_agencies_updated_at     BEFORE UPDATE ON agencies     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stations_updated_at     BEFORE UPDATE ON stations     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_routes_updated_at       BEFORE UPDATE ON routes       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_buses_updated_at        BEFORE UPDATE ON buses        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_schedules_updated_at    BEFORE UPDATE ON schedules    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at     BEFORE UPDATE ON bookings     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at     BEFORE UPDATE ON payments     FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────
-- PASSWORD RESET TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(36) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ACCOUNT LOCKOUT FIELDS
-- ─────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
