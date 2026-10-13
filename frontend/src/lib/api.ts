import { supabase } from './supabase';
import { Vehicle, LoadReading, OverloadEvent, Alert, KPIStats, Device } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Stats
  async getStatsSummary(): Promise<KPIStats> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/stats/summary`, { headers });
    return handleResponse<KPIStats>(res);
  },

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/vehicles`, { headers });
    return handleResponse<Vehicle[]>(res);
  },

  async getVehicle(id: string): Promise<Vehicle> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/vehicles/${id}`, { headers });
    return handleResponse<Vehicle>(res);
  },

  async createVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/vehicles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<Vehicle>(res);
  },

  async updateVehicle(id: string, payload: Partial<Vehicle>): Promise<Vehicle> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/vehicles/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<Vehicle>(res);
  },

  async deleteVehicle(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/vehicles/${id}`, {
      method: 'DELETE',
      headers,
    });
    await handleResponse(res);
  },

  async getVehicleReadings(
    id: string,
    params?: { from?: string; to?: string; limit?: number }
  ): Promise<LoadReading[]> {
    const headers = await getAuthHeaders();
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/api/vehicles/${id}/readings?${searchParams.toString()}`, {
      headers,
    });
    return handleResponse<LoadReading[]>(res);
  },

  // Events
  async getEvents(params?: {
    vehicle_id?: string;
    from?: string;
    to?: string;
    status?: string;
    cutoff_only?: boolean;
    tamper_only?: boolean;
  }): Promise<OverloadEvent[]> {
    const headers = await getAuthHeaders();
    const searchParams = new URLSearchParams();
    if (params?.vehicle_id) searchParams.append('vehicle_id', params.vehicle_id);
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.cutoff_only) searchParams.append('cutoff_only', 'true');
    if (params?.tamper_only) searchParams.append('tamper_only', 'true');

    const res = await fetch(`${API_BASE}/api/events?${searchParams.toString()}`, { headers });
    return handleResponse<OverloadEvent[]>(res);
  },

  // Alerts
  async getAlerts(isRead?: boolean): Promise<Alert[]> {
    const headers = await getAuthHeaders();
    const url = isRead !== undefined
      ? `${API_BASE}/api/alerts?is_read=${isRead}`
      : `${API_BASE}/api/alerts`;
    const res = await fetch(url, { headers });
    return handleResponse<Alert[]>(res);
  },

  async markAlertRead(id: string): Promise<Alert> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/alerts/${id}/read`, {
      method: 'PATCH',
      headers,
    });
    return handleResponse<Alert>(res);
  },

  async markAllAlertsRead(): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/alerts/mark-all/read`, {
      method: 'PATCH',
      headers,
    });
    await handleResponse(res);
  },

  // Reports
  async getAnalytics(params?: { from?: string; to?: string }): Promise<{
    events_by_vehicle: Array<{ registration: string; count: number; peak_kg: number }>;
    daily_trend: Array<{ date: string; eventCount: number; cutoffCount: number }>;
    total_events_in_period: number;
  }> {
    const headers = await getAuthHeaders();
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);

    const res = await fetch(`${API_BASE}/api/reports/analytics?${searchParams.toString()}`, {
      headers,
    });
    return handleResponse(res);
  },

  getExportCsvUrl(params?: { from?: string; to?: string; vehicle_id?: string }): string {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.vehicle_id) searchParams.append('vehicle_id', params.vehicle_id);
    searchParams.append('format', 'csv');
    return `${API_BASE}/api/reports/export?${searchParams.toString()}`;
  },

  // Devices
  async getDevices(): Promise<Device[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/devices`, { headers });
    return handleResponse<Device[]>(res);
  },

  async registerDevice(payload: {
    device_serial: string;
    vehicle_id?: string;
    firmware_version?: string;
  }): Promise<{ device: Device; api_key: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/devices`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await handleResponse<any>(res);
    return {
      device: data,
      api_key: data.api_key,
    };
  },

  async updateDevice(id: string, payload: { vehicle_id?: string | null; is_active?: boolean; firmware_version?: string }): Promise<Device> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/devices/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<Device>(res);
  },

  async deleteDevice(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/devices/${id}`, {
      method: 'DELETE',
      headers,
    });
    await handleResponse(res);
  },
};
