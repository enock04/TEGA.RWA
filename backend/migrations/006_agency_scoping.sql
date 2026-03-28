-- Migration 006: Add agency_id to users for agency data scoping
ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_agency ON users(agency_id) WHERE agency_id IS NOT NULL;
