import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  ShieldCheck,
  AlertTriangle,
  PowerOff,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const Reports: React.FC = () => {
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['reports-analytics', from, to],
    queryFn: () =>
      api.getAnalytics({
        from: new Date(from).toISOString(),
        to: new Date(`${to}T23:59:59.999Z`).toISOString(),
      }),
  });

  const exportUrl = api.getExportCsvUrl({
    from: new Date(from).toISOString(),
    to: new Date(`${to}T23:59:59.999Z`).toISOString(),
  });

  const eventsByVehicle = analytics?.events_by_vehicle || [];
  const dailyTrend = analytics?.daily_trend || [];
  const totalIncidents = analytics?.total_events_in_period || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Analytics & Compliance Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Aggregated violation frequency, vehicle breach rankings, and fleet compliance trends
          </p>
        </div>

        <a
          href={exportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Filtered CSV</span>
        </a>
      </div>

      {/* Date Range Picker Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-sky-500" />
          <span>Reporting Period Range</span>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Overload Breaches
          </p>
          <p className="text-2xl font-extrabold font-mono text-red-600 dark:text-red-400 mt-1">
            {totalIncidents}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Breaches recorded in selected period</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Engine Relay Cutoffs Executed
          </p>
          <p className="text-2xl font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {dailyTrend.reduce((sum, d) => sum + d.cutoffCount, 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sustained overloads past 120s grace</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Highest Risk Vehicle
          </p>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {eventsByVehicle[0]?.registration || 'None'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {eventsByVehicle[0] ? `${eventsByVehicle[0].count} violations logged` : 'Zero violations'}
          </p>
        </div>
      </div>

      {/* Chart 1: Bar Chart of Events per Vehicle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <span>Overload Incidents by Vehicle</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Identifies repeat offending vehicles exceeding permissible weight limits
          </p>
        </div>

        <div className="h-72 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
              Computing vehicle aggregations...
            </div>
          ) : eventsByVehicle.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No violations recorded in this time range. Perfect compliance!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventsByVehicle} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="registration" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                  formatter={(val: any, name: any) => [val, 'Incident Count']}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Daily Trend */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-500" />
            <span>Incident Frequency & Engine Cutoff Trend</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Day-by-day progression of overload breaches and automated cutoff events
          </p>
        </div>

        <div className="h-72 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
              Aggregating trend data...
            </div>
          ) : dailyTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No daily incident trend data available for this range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  name="Total Overloads"
                  dataKey="eventCount"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  name="Relay Cutoffs"
                  dataKey="cutoffCount"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
