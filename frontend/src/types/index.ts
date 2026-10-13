export type UserRole = 'admin' | 'fleet_owner' | 'enforcement';

export interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  role: UserRole;
  organization?: string;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  owner_id?: string;
  registration_no: string;
  vehicle_type: string;
  axle_count: number;
  unladen_weight_kg: number;
  permissible_load_kg: number;
  status: 'active' | 'warning' | 'overloaded' | 'maintenance' | 'decommissioned';
  created_at: string;
  updated_at: string;
  device?: Device | null;
  latest_reading?: LoadReading | null;
  profiles?: {
    full_name: string;
    organization?: string;
  };
}

export interface Device {
  id: string;
  vehicle_id?: string | null;
  device_serial: string;
  firmware_version: string;
  last_seen_at?: string | null;
  is_active: boolean;
  created_at: string;
  vehicles?: {
    registration_no: string;
    vehicle_type: string;
  };
}

export interface LoadReading {
  id: string;
  vehicle_id: string;
  device_id?: string;
  load_kg: number;
  load_percent: number;
  speed_kmph: number;
  recorded_at: string;
  created_at?: string;
}

export interface OverloadEvent {
  id: string;
  vehicle_id: string;
  device_id?: string;
  peak_load_kg: number;
  peak_percent: number;
  started_at: string;
  ended_at?: string | null;
  grace_period_expired: boolean;
  engine_cutoff_triggered: boolean;
  cutoff_released_at?: string | null;
  tamper_flag: boolean;
  created_at: string;
  vehicles?: {
    id: string;
    registration_no: string;
    vehicle_type: string;
    permissible_load_kg: number;
  };
}

export interface Alert {
  id: string;
  vehicle_id: string;
  event_id?: string | null;
  type: 'warning' | 'overload' | 'cutoff' | 'tamper' | 'offline';
  message: string;
  is_read: boolean;
  created_at: string;
  vehicles?: {
    registration_no: string;
    vehicle_type: string;
  };
}

export interface KPIStats {
  total_vehicles: number;
  active_overloads: number;
  events_this_week: number;
  average_load_percent: number;
  compliance_rate: number;
}
