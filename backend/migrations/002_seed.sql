-- IBTRS Seed Data — Development only
-- Run with: psql -U postgres -d ibtrs_db -f migrations/002_seed.sql

-- Admin user (password: Admin@1234)
INSERT INTO users (id, full_name, phone_number, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'System Admin',
   '+250788000001',
   'admin@ibtrs.rw',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGzpMCuMO02OzXwwxjTDmVfqj9S', -- Admin@1234
   'admin');

-- Agency
INSERT INTO agencies (id, name, registration_no, contact_phone, contact_email) VALUES
  ('00000000-0000-0000-0000-000000000010',
   'Virunga Express',
   'RW-AGN-001',
   '+250788000100',
   'info@virunga.rw');

-- Agency user (password: Agency@1234)
INSERT INTO users (id, full_name, phone_number, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000002',
   'Agency Manager',
   '+250788000002',
   'agency@ibtrs.rw',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGzpMCuMO02OzXwwxjTDmVfqj9S', -- Agency@1234
   'agency');

-- Stations
INSERT INTO stations (id, name, city, province, latitude, longitude) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Nyabugogo Bus Terminal', 'Kigali', 'Kigali City', -1.9390, 30.0503),
  ('10000000-0000-0000-0000-000000000002', 'Muhanga Bus Park',       'Muhanga', 'Southern Province', -2.0800, 29.7540),
  ('10000000-0000-0000-0000-000000000003', 'Huye Bus Station',       'Huye', 'Southern Province', -2.6150, 29.7406),
  ('10000000-0000-0000-0000-000000000004', 'Rubavu Bus Park',        'Rubavu', 'Western Province', -1.6756, 29.2545),
  ('10000000-0000-0000-0000-000000000005', 'Musanze Bus Terminal',   'Musanze', 'Northern Province', -1.4992, 29.6339),
  ('10000000-0000-0000-0000-000000000006', 'Kayonza Bus Park',       'Kayonza', 'Eastern Province', -2.0043, 30.6397);

-- Routes
INSERT INTO routes (id, name, departure_station_id, arrival_station_id, distance_km, duration_minutes) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Kigali — Huye',    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 130, 150),
  ('20000000-0000-0000-0000-000000000002', 'Kigali — Rubavu',  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 157, 180),
  ('20000000-0000-0000-0000-000000000003', 'Kigali — Musanze', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 110, 120),
  ('20000000-0000-0000-0000-000000000004', 'Kigali — Kayonza', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 80, 90);

-- Bus
INSERT INTO buses (id, name, plate_number, bus_type, total_seats, agency_id) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Virunga Express 01', 'RAB 001 A', 'coach', 44, '00000000-0000-0000-0000-000000000010'),
  ('30000000-0000-0000-0000-000000000002', 'Virunga Express 02', 'RAB 002 A', 'standard', 30, '00000000-0000-0000-0000-000000000010');

-- Seats for Bus 1 (44 seats)
INSERT INTO seats (id, bus_id, seat_number, seat_class)
SELECT
  uuid_generate_v4(),
  '30000000-0000-0000-0000-000000000001',
  generate_series,
  CASE WHEN generate_series <= 4 THEN 'vip'::seat_class
       WHEN generate_series <= 16 THEN 'business'::seat_class
       ELSE 'economy'::seat_class END
FROM generate_series(1, 44);

-- Seats for Bus 2 (30 seats)
INSERT INTO seats (id, bus_id, seat_number, seat_class)
SELECT
  uuid_generate_v4(),
  '30000000-0000-0000-0000-000000000002',
  generate_series,
  'economy'::seat_class
FROM generate_series(1, 30);

-- Schedules (from today + 1 day to allow testing)
INSERT INTO schedules (id, bus_id, route_id, departure_time, arrival_time, base_price, total_seats, available_seats) VALUES
  ('40000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   NOW() + INTERVAL '1 day' + INTERVAL '7 hours',
   NOW() + INTERVAL '1 day' + INTERVAL '9 hours 30 minutes',
   3500, 44, 44),
  ('40000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   NOW() + INTERVAL '1 day' + INTERVAL '8 hours',
   NOW() + INTERVAL '1 day' + INTERVAL '11 hours',
   4000, 30, 30),
  ('40000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000003',
   NOW() + INTERVAL '1 day' + INTERVAL '9 hours',
   NOW() + INTERVAL '1 day' + INTERVAL '11 hours',
   3000, 44, 44);
