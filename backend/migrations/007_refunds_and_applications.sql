-- Migration 007: Refund support + agency application requests

-- Payments: track refunds
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Bookings: track refund status separately from booking status
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT NULL
  CHECK (refund_status IN ('pending', 'completed', 'failed'));

-- Agency applications (self-onboarding)
CREATE TABLE IF NOT EXISTS agency_applications (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    VARCHAR(255) NOT NULL,
  registration_no VARCHAR(100),
  contact_name    VARCHAR(255) NOT NULL,
  contact_phone   VARCHAR(20)  NOT NULL,
  contact_email   VARCHAR(255) NOT NULL,
  address         TEXT,
  fleet_size      INTEGER,
  routes_description TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes    TEXT,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_apps_status ON agency_applications(status);
CREATE INDEX IF NOT EXISTS idx_agency_apps_email  ON agency_applications(contact_email);
