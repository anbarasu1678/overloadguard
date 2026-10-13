import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StatCard } from '../components/common/StatCard';
import { CircularGauge } from '../components/common/CircularGauge';
import { StatusBadge } from '../components/common/StatusBadge';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import { formatWeight, formatDate, formatRelativeTime } from '../lib/utils';
import {
  Truck,
  AlertOctagon,
  Calendar,
  ShieldCheck,
  Activity,
  Check,
  ChevronRight,
  Gauge,
  Wifi,
  ExternalLink,
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
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // 1. Fetch KPI summary
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: () => api.getStatsSummary(),
    refetchInterval: 10000,
  });

  // 2. Fetch vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
    refetchInterval: 10000,
  });

  // Default selected vehicle
  const currentVehicleId =
    selectedVehicleId || (vehicles && vehicles.length > 0 ? vehicles[0].id : '');

  const activeVehicle = (vehicles || []).find((v) => v.id === currentVehicleId);

  // 3. Fetch readings for selected vehicle
  const { data: readings, isLoading: readingsLoading } = useQuery({
    queryKey: ['vehicle-readings', currentVehicleId],
    queryFn: () => api.getVehicleReadings(currentVehicleId, { limit: 30 }),
    enabled: !!currentVehicleId,
    refetchInterval: 5000,
  });

  // 4. Fetch recent unread alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', 'recent'],
    queryFn: () => api.getAlerts(),
    refetchInterval: 5000,
  });

  // Mark alert as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Prepare chart data
  const chartData = (readings || []).map((r) => {
    const timeLabel = new Date(r.recorded_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return {
      time: timeLabel,
      load_percent: Number(r.load_percent),
      load_kg: Number(r.load_kg),
      speed: Number(r.speed_kmph),
    };
  });

  const latestReading = activeVehicle?.latest_reading;
  const currentLoadPercent = latestReading ? Number(latestReading.load_percent) : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Fleet Overload Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time axle weight strain telemetry & automated engine relay protection
          </p>
        </div>
        <Link
          to="/live-monitor"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Activity className="w-4 h-4" />
          <span>Open Live Monitor</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Vehicles"
              value={stats?.total_vehicles ?? 0}
              subtitle="Registered"
              icon={Truck}
              variant="default"
            />
            <StatCard
              title="Live Overloads"
              value={stats?.active_overloads ?? 0}
              subtitle="Active Violations"
              icon={AlertOctagon}
              variant={stats && stats.active_overloads > 0 ? 'danger' : 'safe'}
              trend={
                stats && stats.active_overloads > 0
                  ? { direction: 'up', text: `${stats.active_overloads} Critical` }
                  : { direction: 'neutral', text: 'All Compliant' }
              }
            />
            <StatCard
              title="Events This Week"
              value={stats?.events_this_week ?? 0}
              subtitle="7-day incidents"
              icon={Calendar}
              variant="warning"
            />
            <StatCard
              title="Compliance Rate"
              value={`${stats?.compliance_rate ?? 100}%`}
              subtitle="Fleet Safety Score"
              icon={ShieldCheck}
              variant="safe"
              trend={{ direction: 'up', text: 'Optimal' }}
            />
          </>
        )}
      </div>

      {/* Central Section: Vehicle Live Telemetry Chart & Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Line Chart (spans 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-500" />
                <span>Live Axle Load Telemetry</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continuous strain-gauge readings & threshold compliance curve
              </p>
            </div>

            {/* Vehicle Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="vehicle-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Vehicle:
              </label>
              <select
                id="vehicle-select"
                value={currentVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {(vehicles || []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_no} ({v.vehicle_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chart Display */}
          <div className="h-64 sm:h-72 w-full pt-2">
            {readingsLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
                Loading telemetry stream...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No recent telemetry readings recorded for this vehicle.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    domain={[40, 130]}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    stroke="#94a3b8"
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => [
                      name === 'load_percent' ? `${val}%` : val,
                      name === 'load_percent' ? 'Load %' : name,
                    ]}
                  />
                  {/* Warning line at 90% */}
                  <ReferenceLine
                    y={90}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: '90% Warning',
                      position: 'insideTopRight',
                      fill: '#f59e0b',
                      fontSize: 10,
                    }}
                  />
                  {/* Cutoff Limit at 100% */}
                  <ReferenceLine
                    y={100}
                    stroke="#ef4444"
                    strokeWidth={2}
                    label={{
                      value: '100% Legal Limit',
                      position: 'insideBottomRight',
                      fill: '#ef4444',
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="load_percent"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0284c7' }}
                    activeDot={{ r: 5, fill: '#38bdf8' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart footer metrics */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Safe &lt; 90%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Warning 90-100%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Overload &gt; 100%</span>
              </span>
            </div>
            {activeVehicle && (
              <Link
                to={`/vehicles/${activeVehicle.id}`}
                className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Vehicle Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Right: Selected Vehicle Current Gauge & Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                {activeVehicle?.registration_no || 'Selected Vehicle'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeVehicle?.vehicle_type || 'Commercial Carrier'}
              </p>
            </div>
            {activeVehicle && (
              <StatusBadge status={activeVehicle.status} size="sm" />
            )}
          </div>

          {/* Circular Gauge */}
          <div className="flex items-center justify-center py-4">
            <CircularGauge
              percent={currentLoadPercent}
              size={170}
              strokeWidth={14}
              sublabel="Axle Load"
            />
          </div>

          {/* Weight specs */}
          <div className="space-y-2.5 pt-2 text-xs">
            <div className="flex justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Current Measured Weight:</span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                {latestReading ? formatWeight(latestReading.load_kg) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Permissible Gross Limit:</span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                {activeVehicle ? formatWeight(activeVehicle.permissible_load_kg) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Speed Telemetry:</span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                {latestReading ? `${latestReading.speed_kmph} km/h` : '0 km/h'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Alerts Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recent System Alerts & Overload Incidents
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live updates pushed directly via Supabase Realtime
            </p>
          </div>
          <Link
            to="/alerts"
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            View All Alerts →
          </Link>
        </div>

        {alertsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Loading recent alerts...
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No active alerts recorded. All vehicles operating safely within permissible weight.
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={alert.type} size="sm" />
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {alert.message}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {formatDate(alert.created_at)}
                    </p>
                  </div>
                </div>

                {!alert.is_read ? (
                  <button
                    onClick={() => markReadMutation.mutate(alert.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    title="Acknowledge / Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Read</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
