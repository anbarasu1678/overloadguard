-- OverloadGuard Database Schema
-- Vehicle Overload Management System
-- NOTE: Absolutely NO latitude, longitude, or location data is stored anywhere in this schema.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
-- Linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'fleet_owner', 'enforcement')),
    organization TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    registration_no TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL, -- e.g. 'Multi-Axle Heavy Truck', 'Tipper', 'Container Carrier'
    axle_count INTEGER NOT NULL DEFAULT 2 CHECK (axle_count >= 2),
    unladen_weight_kg NUMERIC(10, 2) NOT NULL CHECK (unladen_weight_kg > 0),
    permissible_load_kg NUMERIC(10, 2) NOT NULL CHECK (permissible_load_kg > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'warning', 'overloaded', 'maintenance', 'decommissioned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON public.vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg ON public.vehicles(registration_no);

-- 3. DEVICES TABLE
-- Hardware units installed on vehicles (ESP32)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    device_serial TEXT UNIQUE NOT NULL,
    api_key_hash TEXT NOT NULL,
    firmware_version TEXT NOT NULL DEFAULT 'v1.0.0',
    last_seen_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_devices_vehicle ON public.devices(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON public.devices(device_serial);

-- 4. LOAD_READINGS TABLE
-- High-frequency telemetry stream from load cells
CREATE TABLE IF NOT EXISTS public.load_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    load_kg NUMERIC(10, 2) NOT NULL,
    load_percent NUMERIC(5, 2) NOT NULL,
    speed_kmph NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index required by spec: (vehicle_id, recorded_at DESC)
CREATE INDEX IF NOT EXISTS idx_load_readings_vehicle_recorded ON public.load_readings(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_load_readings_recorded_at ON public.load_readings(recorded_at DESC);

-- 5. OVERLOAD_EVENTS TABLE
-- Generated when vehicle exceeds permissible load limit
CREATE TABLE IF NOT EXISTS public.overload_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    peak_load_kg NUMERIC(10, 2) NOT NULL,
    peak_percent NUMERIC(5, 2) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    grace_period_expired BOOLEAN NOT NULL DEFAULT false,
    engine_cutoff_triggered BOOLEAN NOT NULL DEFAULT false,
    cutoff_released_at TIMESTAMPTZ,
    tamper_flag BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_overload_events_vehicle ON public.overload_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_overload_events_started_at ON public.overload_events(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_overload_events_active ON public.overload_events(ended_at) WHERE ended_at IS NULL;

-- 6. ALERTS TABLE
-- Incident alerts for dashboard notifications
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.overload_events(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('warning', 'overload', 'cutoff', 'tamper', 'offline')),
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_alerts_vehicle ON public.alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- 7. HELPER FUNCTIONS FOR USER ROLES
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overload_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admin and enforcement can read all profiles"
    ON public.profiles FOR SELECT
    USING (public.get_auth_user_role() IN ('admin', 'enforcement'));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- VEHICLES POLICIES
CREATE POLICY "Fleet owners can view their vehicles"
    ON public.vehicles FOR SELECT
    USING (
        public.get_auth_user_role() IN ('admin', 'enforcement')
        OR owner_id = auth.uid()
    );

CREATE POLICY "Admin can insert vehicles"
    ON public.vehicles FOR INSERT
    WITH CHECK (
        public.get_auth_user_role() = 'admin'
        OR (public.get_auth_user_role() = 'fleet_owner' AND owner_id = auth.uid())
    );

CREATE POLICY "Admin and owner can update vehicles"
    ON public.vehicles FOR UPDATE
    USING (
        public.get_auth_user_role() = 'admin'
        OR (public.get_auth_user_role() = 'fleet_owner' AND owner_id = auth.uid())
    );

CREATE POLICY "Admin can delete vehicles"
    ON public.vehicles FOR DELETE
    USING (public.get_auth_user_role() = 'admin');

-- DEVICES POLICIES
CREATE POLICY "Devices read policy"
    ON public.devices FOR SELECT
    USING (
        public.get_auth_user_role() IN ('admin', 'enforcement')
        OR vehicle_id IN (SELECT id FROM public.vehicles WHERE owner_id = auth.uid())
    );

CREATE POLICY "Admin full access to devices"
    ON public.devices FOR ALL
    USING (public.get_auth_user_role() = 'admin')
    WITH CHECK (public.get_auth_user_role() = 'admin');

-- LOAD_READINGS POLICIES
-- Only backend service_role can insert. Fleet owner can view own; Admin & Enforcement can view all.
CREATE POLICY "Readings select policy"
    ON public.load_readings FOR SELECT
    USING (
        public.get_auth_user_role() IN ('admin', 'enforcement')
        OR vehicle_id IN (SELECT id FROM public.vehicles WHERE owner_id = auth.uid())
    );

-- OVERLOAD_EVENTS POLICIES
CREATE POLICY "Overload events select policy"
    ON public.overload_events FOR SELECT
    USING (
        public.get_auth_user_role() IN ('admin', 'enforcement')
        OR vehicle_id IN (SELECT id FROM public.vehicles WHERE owner_id = auth.uid())
    );

-- ALERTS POLICIES
CREATE POLICY "Alerts select policy"
    ON public.alerts FOR SELECT
    USING (
        public.get_auth_user_role() IN ('admin', 'enforcement')
        OR vehicle_id IN (SELECT id FROM public.vehicles WHERE owner_id = auth.uid())
    );

CREATE POLICY "Alerts update read status"
    ON public.alerts FOR UPDATE
    USING (
        public.get_auth_user_role() IN ('admin', 'enforcement')
        OR vehicle_id IN (SELECT id FROM public.vehicles WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        public.get_auth_user_role() IN ('admin', 'enforcement')
        OR vehicle_id IN (SELECT id FROM public.vehicles WHERE owner_id = auth.uid())
    );

-- 9. USER SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'System User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'fleet_owner'),
    COALESCE(NEW.raw_user_meta_data->>'organization', 'Logistics Corp')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. REALTIME SUBSCRIPTION REGISTRATION
-- Enable Supabase Realtime for live updates on the frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.load_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.overload_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
