-- OverloadGuard Database Seed Data
-- 1 Admin, 1 Fleet Owner, 1 Enforcement User, 5 Vehicles, 5 Devices, ~200 Readings, 3 Overload Events

-- Deterministic UUIDs for seeded accounts
DO $$
DECLARE
    v_admin_id UUID := '11111111-1111-1111-1111-111111111111';
    v_owner_id UUID := '22222222-2222-2222-2222-222222222222';
    v_enforce_id UUID := '33333333-3333-3333-3333-333333333333';

    v_v1 UUID := 'a1111111-1111-1111-1111-111111111111';
    v_v2 UUID := 'a2222222-2222-2222-2222-222222222222';
    v_v3 UUID := 'a3333333-3333-3333-3333-333333333333';
    v_v4 UUID := 'a4444444-4444-4444-4444-444444444444';
    v_v5 UUID := 'a5555555-5555-5555-5555-555555555555';

    v_d1 UUID := 'b1111111-1111-1111-1111-111111111111';
    v_d2 UUID := 'b2222222-2222-2222-2222-222222222222';
    v_d3 UUID := 'b3333333-3333-3333-3333-333333333333';
    v_d4 UUID := 'b4444444-4444-4444-4444-444444444444';
    v_d5 UUID := 'b5555555-5555-5555-5555-555555555555';

    v_ev1 UUID := 'c1111111-1111-1111-1111-111111111111';
    v_ev2 UUID := 'c2222222-2222-2222-2222-222222222222';
    v_ev3 UUID := 'c3333333-3333-3333-3333-333333333333';

    -- SHA-256 hash of 'dev_key_secret_123'
    v_hash_sample TEXT := 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
    i INTEGER;
    t_offset INTERVAL;
    calc_load NUMERIC;
    calc_percent NUMERIC;
    calc_speed NUMERIC;
BEGIN
    -- 1. Insert seed users into auth.users if they don't already exist
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
    VALUES 
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@overloadguard.io', crypt('AdminPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rajesh Sharma","role":"admin","organization":"Transport Authority HQ"}', false, 'authenticated', 'authenticated'),
    (v_owner_id, '00000000-0000-0000-0000-000000000000', 'owner@apexlogistics.com', crypt('OwnerPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vikram Patel","role":"fleet_owner","organization":"Apex Heavy Haulers"}', false, 'authenticated', 'authenticated'),
    (v_enforce_id, '00000000-0000-0000-0000-000000000000', 'officer@highwaypatrol.gov', crypt('OfficerPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Inspector Amit Rao","role":"enforcement","organization":"National Highway Safety Board"}', false, 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert/Update public.profiles
    INSERT INTO public.profiles (id, full_name, role, organization)
    VALUES
    (v_admin_id, 'Rajesh Sharma', 'admin', 'Transport Authority HQ'),
    (v_owner_id, 'Vikram Patel', 'fleet_owner', 'Apex Heavy Haulers'),
    (v_enforce_id, 'Inspector Amit Rao', 'enforcement', 'National Highway Safety Board')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        organization = EXCLUDED.organization;

    -- 3. Insert 5 Vehicles
    INSERT INTO public.vehicles (id, owner_id, registration_no, vehicle_type, axle_count, unladen_weight_kg, permissible_load_kg, status)
    VALUES
    (v_v1, v_owner_id, 'KA-01-AB-1001', 'Multi-Axle Heavy Truck', 4, 8500.00, 25000.00, 'active'),
    (v_v2, v_owner_id, 'KA-01-CD-2002', 'Tipper Truck', 3, 6200.00, 16000.00, 'overloaded'),
    (v_v3, v_owner_id, 'MH-12-EF-3003', 'Container Trailer', 5, 10500.00, 40000.00, 'warning'),
    (v_v4, v_owner_id, 'TN-09-GH-4004', 'Heavy Duty Hauler', 4, 9000.00, 28000.00, 'active'),
    (v_v5, v_owner_id, 'DL-01-JK-5005', 'Medium Goods Vehicle', 2, 4500.00, 12000.00, 'active')
    ON CONFLICT (id) DO UPDATE SET
        registration_no = EXCLUDED.registration_no,
        vehicle_type = EXCLUDED.vehicle_type,
        permissible_load_kg = EXCLUDED.permissible_load_kg,
        status = EXCLUDED.status;

    -- 4. Insert 5 Hardware Devices
    INSERT INTO public.devices (id, vehicle_id, device_serial, api_key_hash, firmware_version, last_seen_at, is_active)
    VALUES
    (v_d1, v_v1, 'OG-ESP32-001', v_hash_sample, 'v2.1.0', now() - INTERVAL '2 minutes', true),
    (v_d2, v_v2, 'OG-ESP32-002', v_hash_sample, 'v2.1.0', now() - INTERVAL '30 seconds', true),
    (v_d3, v_v3, 'OG-ESP32-003', v_hash_sample, 'v2.1.0', now() - INTERVAL '1 minute', true),
    (v_d4, v_v4, 'OG-ESP32-004', v_hash_sample, 'v2.0.8', now() - INTERVAL '5 minutes', true),
    (v_d5, v_v5, 'OG-ESP32-005', v_hash_sample, 'v2.1.0', now() - INTERVAL '18 minutes', true)
    ON CONFLICT (id) DO UPDATE SET
        device_serial = EXCLUDED.device_serial,
        last_seen_at = EXCLUDED.last_seen_at;

    -- 5. Insert 3 Overload Events
    -- Event 1: Vehicle 1 had an overload 8 hours ago, grace expired, engine cutoff triggered, now resolved.
    INSERT INTO public.overload_events (id, vehicle_id, device_id, peak_load_kg, peak_percent, started_at, ended_at, grace_period_expired, engine_cutoff_triggered, cutoff_released_at, tamper_flag)
    VALUES
    (v_ev1, v_v1, v_d1, 28450.00, 113.80, now() - INTERVAL '8 hours', now() - INTERVAL '7 hours 15 minutes', true, true, now() - INTERVAL '7 hours 15 minutes', false)
    ON CONFLICT (id) DO NOTHING;

    -- Event 2: Vehicle 2 is CURRENTLY overloaded (active event, ended_at is NULL)
    INSERT INTO public.overload_events (id, vehicle_id, device_id, peak_load_kg, peak_percent, started_at, ended_at, grace_period_expired, engine_cutoff_triggered, cutoff_released_at, tamper_flag)
    VALUES
    (v_ev2, v_v2, v_d2, 18320.00, 114.50, now() - INTERVAL '35 minutes', NULL, true, true, NULL, false)
    ON CONFLICT (id) DO NOTHING;

    -- Event 3: Vehicle 3 had an overload with physical load cell tamper attempt 2 days ago
    INSERT INTO public.overload_events (id, vehicle_id, device_id, peak_load_kg, peak_percent, started_at, ended_at, grace_period_expired, engine_cutoff_triggered, cutoff_released_at, tamper_flag)
    VALUES
    (v_ev3, v_v3, v_d3, 42800.00, 107.00, now() - INTERVAL '46 hours', now() - INTERVAL '44 hours 30 minutes', true, true, now() - INTERVAL '44 hours 30 minutes', true)
    ON CONFLICT (id) DO NOTHING;

    -- 6. Insert Alerts
    INSERT INTO public.alerts (id, vehicle_id, event_id, type, message, is_read, created_at)
    VALUES
    (gen_random_uuid(), v_v2, v_ev2, 'cutoff', 'ENGINE RELAY CUTOFF ACTIVATED: Vehicle KA-01-CD-2002 exceeded permissible limit (18,320 kg / 114.5%) past 120s grace period.', false, now() - INTERVAL '33 minutes'),
    (gen_random_uuid(), v_v2, v_ev2, 'overload', 'CRITICAL OVERLOAD: KA-01-CD-2002 measured at 18,320 kg (114.5% of 16,000 kg capacity).', false, now() - INTERVAL '35 minutes'),
    (gen_random_uuid(), v_v3, NULL, 'warning', 'LOAD WARNING: Vehicle MH-12-EF-3003 at 94.2% permissible capacity (37,680 kg).', true, now() - INTERVAL '2 hours'),
    (gen_random_uuid(), v_v1, v_ev1, 'cutoff', 'ENGINE CUTOFF RESOLVED: Load on KA-01-AB-1001 reduced below safe threshold (24,100 kg). Engine ignition enabled.', true, now() - INTERVAL '7 hours 15 minutes'),
    (gen_random_uuid(), v_v3, v_ev3, 'tamper', 'HARDWARE TAMPER DETECTED: Strain gauge bridge impedance anomaly recorded on device OG-ESP32-003.', true, now() - INTERVAL '45 hours 50 minutes');

    -- 7. Generate ~200 Sample Load Readings spread across 5 vehicles
    -- Vehicle 1 (45 readings)
    FOR i IN 1..45 LOOP
        t_offset := ((45 - i) * 15) * INTERVAL '1 minute';
        calc_load := 21000 + (sin(i::numeric / 3.0) * 2800) + (i % 5 * 210);
        calc_percent := ROUND((calc_load / 25000.00) * 100.0, 2);
        calc_speed := 45.0 + (sin(i::numeric / 2.0) * 20.0);
        INSERT INTO public.load_readings (vehicle_id, device_id, load_kg, load_percent, speed_kmph, recorded_at, created_at)
        VALUES (v_v1, v_d1, calc_load, calc_percent, GREATEST(calc_speed, 0.0), now() - t_offset, now() - t_offset);
    END LOOP;

    -- Vehicle 2 (45 readings, currently trending into overload 114%)
    FOR i IN 1..45 LOOP
        t_offset := ((45 - i) * 12) * INTERVAL '1 minute';
        IF i > 38 THEN
            calc_load := 17800 + ((i - 38) * 110);
        ELSE
            calc_load := 13500 + (sin(i::numeric / 4.0) * 1800);
        END IF;
        calc_percent := ROUND((calc_load / 16000.00) * 100.0, 2);
        calc_speed := CASE WHEN i > 40 THEN 0.0 ELSE (50.0 + (cos(i::numeric) * 15.0)) END;
        INSERT INTO public.load_readings (vehicle_id, device_id, load_kg, load_percent, speed_kmph, recorded_at, created_at)
        VALUES (v_v2, v_d2, calc_load, calc_percent, GREATEST(calc_speed, 0.0), now() - t_offset, now() - t_offset);
    END LOOP;

    -- Vehicle 3 (40 readings, currently in warning zone ~94%)
    FOR i IN 1..40 LOOP
        t_offset := ((40 - i) * 20) * INTERVAL '1 minute';
        calc_load := 34000 + (i * 95) + (sin(i::numeric) * 800);
        calc_percent := ROUND((calc_load / 40000.00) * 100.0, 2);
        calc_speed := 62.0 + (sin(i::numeric / 5.0) * 12.0);
        INSERT INTO public.load_readings (vehicle_id, device_id, load_kg, load_percent, speed_kmph, recorded_at, created_at)
        VALUES (v_v3, v_d3, calc_load, calc_percent, GREATEST(calc_speed, 0.0), now() - t_offset, now() - t_offset);
    END LOOP;

    -- Vehicle 4 (40 readings, healthy ~72%)
    FOR i IN 1..40 LOOP
        t_offset := ((40 - i) * 25) * INTERVAL '1 minute';
        calc_load := 19500 + (sin(i::numeric / 2.0) * 1200);
        calc_percent := ROUND((calc_load / 28000.00) * 100.0, 2);
        calc_speed := 55.0 + (cos(i::numeric / 3.0) * 18.0);
        INSERT INTO public.load_readings (vehicle_id, device_id, load_kg, load_percent, speed_kmph, recorded_at, created_at)
        VALUES (v_v4, v_d4, calc_load, calc_percent, GREATEST(calc_speed, 0.0), now() - t_offset, now() - t_offset);
    END LOOP;

    -- Vehicle 5 (35 readings, safe ~65%)
    FOR i IN 1..35 LOOP
        t_offset := ((35 - i) * 30) * INTERVAL '1 minute';
        calc_load := 7600 + (sin(i::numeric / 4.0) * 600);
        calc_percent := ROUND((calc_load / 12000.00) * 100.0, 2);
        calc_speed := 38.0 + (sin(i::numeric) * 15.0);
        INSERT INTO public.load_readings (vehicle_id, device_id, load_kg, load_percent, speed_kmph, recorded_at, created_at)
        VALUES (v_v5, v_d5, calc_load, calc_percent, GREATEST(calc_speed, 0.0), now() - t_offset, now() - t_offset);
    END LOOP;

END $$;
