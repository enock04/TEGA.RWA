-- ─────────────────────────────────────────────
-- Migration 008: Group payment support
-- Adds group_booking_ids column to payments so one payment can cover multiple bookings
-- ─────────────────────────────────────────────

ALTER TABLE payments ADD COLUMN IF NOT EXISTS group_booking_ids JSONB NOT NULL DEFAULT '[]';
