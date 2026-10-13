import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { CircularGauge } from '../components/common/CircularGauge';
import { StatusBadge } from '../components/common/StatusBadge';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import { formatWeight, formatDate, formatRelativeTime, isDeviceOnline } from '../lib/utils';
import {
  ArrowLeft,
  Truck,
  Gauge,
  Cpu,
  Clock,
  AlertTriangle,
  PowerOff,
  ShieldCheck,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [historyLimit, setHistoryLimit] = useState<number>(50);

  // 1. Vehicle details
  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => api.getVehicle(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // 2. Telemetry readings
  const { data: readings, isLoading: readingsLoading } = useQuery({
    queryKey: ['vehicle-readings', id, historyLimit],
    queryFn: () => api.getVehicleReadings(id!, { limit: historyLimit }),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // 3. Overload events timeline for this vehicle
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['vehicle-events', id],
    queryFn: () => api.getEvents({ vehicle_id: id }),
    enabled: !!id,
    refetchInterval: 10000,
  });

  if (vehicleLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="py-16 text-center space-y-4">
        <Truck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Vehicle Not Found
        </h2>
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vehicles</span>
        </Link>
      </div>
    );
  }

  const latest = vehicle.latest_reading;
  const currentLoadPercent = latest ? Number(latest.load_percent) : 0;
  const isOnline = isDeviceOnline(vehicle.device?.last_seen_at);
  const isOverloaded = currentLoadPercent > 100 || vehicle.status === 'overloaded';

  const chartData = (readings || []).map((r) => ({
    time: new Date(r.recorded_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    load_percent: Number(r.load_percent),
    load_kg: Number(r.load_kg),
    speed: Number(r.speed_kmph),
  }));

  return (
    <div className="space-y-6">
      {/* Top Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/vehicles"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {vehicle.registration_no}
              </h1>
              <StatusBadge status={vehicle.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {vehicle.vehicle_type} • {vehicle.axle_count} Axles • Owner: {vehicle.profiles?.organization || 'Apex Logistics'}
            </p>
          </div>
        </div>

        {/* Live Device Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
          <Cpu className="w-4 h-4 text-slate-400" />
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {vehicle.device ? vehicle.device.device_serial : 'No Device Linked'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Grid: 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Circular Gauge & Live Weight */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Live Axle Load Stress
          </h3>
          <CircularGauge
            percent={currentLoadPercent}
            size={160}
            strokeWidth={14}
            sublabel="Permissible Limit"
          />
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
            <p className="font-bold text-base font-mono text-slate-900 dark:text-slate-100">
              {latest ? formatWeight(latest.load_kg) : 'N/A'}
            </p>
            <p className="text-[11px] text-slate-400">
              Max Allowed: {formatWeight(vehicle.permissible_load_kg)}
            </p>
          </div>
        </div>

        {/* Card 2: Vehicle Specs & Cutoff Relay */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Weight Specifications & Relay
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Unladen Tare Weight:</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatWeight(vehicle.unladen_weight_kg)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Permissible Gross:</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatWeight(vehicle.permissible_load_kg)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Current Speed:</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {latest ? `${latest.speed_kmph} km/h` : '0 km/h'}
              </span>
            </div>
          </div>

          {/* Engine Relay Box */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
              isOverloaded
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 animate-pulse'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {isOverloaded ? (
              <>
                <PowerOff className="w-5 h-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold">ENGINE RELAY CUTOFF ARMED</p>
                  <p className="text-[10px] font-normal">
                    Exceeded capacity past grace period. Engine circuit open.
                  </p>
                </div>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold">ENGINE CIRCUIT ARMED & SAFE</p>
                  <p className="text-[10px] font-normal">
                    Load is within safe tolerance. Normal ignition allowed.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 3: ESP32 Hardware Unit Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ESP32 Hardware Unit
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Device Serial:</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {vehicle.device?.device_serial || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Firmware:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {vehicle.device?.firmware_version || 'v2.1.0'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Connectivity:</span>
              <span className="font-medium">
                {isOnline ? (
                  <span className="text-emerald-600 dark:text-emerald-400">GSM / Wi-Fi Active</span>
                ) : (
                  <span className="text-slate-400">Offline</span>
                )}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Last Telemetry:</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono">
                {formatRelativeTime(vehicle.device?.last_seen_at)}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            Reads 4x HX711 strain gauge bridges on axles and transmits data via REST API.
          </div>
        </div>
      </div>

      {/* Historical Telemetry Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              <span>Telemetry History</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time strain-gauge load cell readings across timeline
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {[25, 50, 100].map((limit) => (
              <button
                key={limit}
                onClick={() => setHistoryLimit(limit)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  historyLimit === limit
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Last {limit}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          {readingsLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
              Loading telemetry history...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No telemetry packets recorded for this vehicle.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#94a3b8" />
                <YAxis domain={[40, 130]} tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#94a3b8" unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Load %']}
                />
                <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={100} stroke="#ef4444" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="load_percent"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Incident & Overload Events Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-500" />
          <span>Vehicle Incident Timeline & Overload History</span>
        </h2>

        {eventsLoading ? (
          <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
            Loading timeline...
          </div>
        ) : !events || events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No overload events recorded for this vehicle. Clean compliance record!
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {events.map((event) => (
              <div key={event.id} className="relative group">
                <span
                  className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                    event.ended_at ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                  }`}
                />
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {event.ended_at ? 'Resolved Overload Incident' : '🚨 Active Overload Violation'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Started: {formatDate(event.started_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Peak Load: <span className="font-bold text-red-600 dark:text-red-400">{formatWeight(event.peak_load_kg)}</span> ({event.peak_percent}% of limit).
                    {event.engine_cutoff_triggered && (
                      <span className="ml-1 text-purple-600 dark:text-purple-400 font-semibold">
                        • Engine Cutoff Activated
                      </span>
                    )}
                    {event.tamper_flag && (
                      <span className="ml-1 text-rose-600 font-semibold">
                        • Physical Tamper Flagged
                      </span>
                    )}
                  </p>

                  {event.ended_at && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      Resolved At: {formatDate(event.ended_at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
