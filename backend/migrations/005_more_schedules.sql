-- Add schedules for today and the next 14 days so search always has results
-- Uses ON CONFLICT DO NOTHING to be safe to re-run

DO $$
DECLARE
  d INT;
  base TIMESTAMPTZ;
  s_id TEXT;
BEGIN
  FOR d IN 0..14 LOOP
    base := (CURRENT_DATE + d * INTERVAL '1 day')::TIMESTAMPTZ;

    -- Kigali → Huye  07:00, 09:00, 13:00, 16:00
    FOREACH s_id IN ARRAY ARRAY[
      '40000000-0001-' || LPAD(d::TEXT,4,'0') || '-0000-000000000001',
      '40000000-0002-' || LPAD(d::TEXT,4,'0') || '-0000-000000000001',
      '40000000-0003-' || LPAD(d::TEXT,4,'0') || '-0000-000000000001',
      '40000000-0004-' || LPAD(d::TEXT,4,'0') || '-0000-000000000001'
    ]
    LOOP NULL; END LOOP;

    INSERT INTO schedules (id, bus_id, route_id, departure_time, arrival_time, base_price, total_seats, available_seats)
    VALUES
      -- Kigali → Huye
      (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
       base + INTERVAL '7 hours', base + INTERVAL '9 hours 30 minutes', 3500, 44, 44),
      (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
       base + INTERVAL '13 hours', base + INTERVAL '15 hours 30 minutes', 3500, 44, 44),
      -- Kigali → Rubavu
      (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
       base + INTERVAL '8 hours', base + INTERVAL '11 hours', 4000, 30, 30),
      (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
       base + INTERVAL '14 hours', base + INTERVAL '17 hours', 4000, 30, 30),
      -- Kigali → Musanze
      (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
       base + INTERVAL '9 hours', base + INTERVAL '11 hours', 3000, 44, 44),
      (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
       base + INTERVAL '15 hours', base + INTERVAL '17 hours', 3000, 44, 44),
      -- Kigali → Kayonza
      (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004',
       base + INTERVAL '10 hours', base + INTERVAL '11 hours 30 minutes', 2500, 44, 44),
      (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004',
       base + INTERVAL '16 hours', base + INTERVAL '17 hours 30 minutes', 2500, 44, 44);
  END LOOP;
END $$;
