import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { OverloadEvent } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { formatWeight, formatDate } from '../lib/utils';
import {
  AlertTriangle,
  Download,
  Filter,
  CheckCircle2,
  PowerOff,
  ShieldAlert,
  Calendar,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OverloadEvents: React.FC = () => {
  const [vehicleId, setVehicleId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cutoffOnly, setCutoffOnly] = useState(false);
  const [tamperOnly, setTamperOnly] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<OverloadEvent | null>(null);

  // Fetch vehicles for the dropdown
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  // Fetch overload events
  const { data: events, isLoading } = useQuery({
    queryKey: ['overload-events', vehicleId, statusFilter, cutoffOnly, tamperOnly],
    queryFn: () =>
      api.getEvents({
        vehicle_id: vehicleId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        cutoff_only: cutoffOnly || undefined,
        tamper_only: tamperOnly || undefined,
      }),
    refetchInterval: 10000,
  });

  const exportUrl = api.getExportCsvUrl({
    vehicle_id: vehicleId || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Overload Events & Violations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historical audit log of vehicle weight threshold breaches and engine cutoff relay events
          </p>
        </div>

        <a
          href={exportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </a>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-sky-500" />
          <span>Filter Overload Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Vehicle Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Vehicle
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Vehicles</option>
              {(vehicles || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_no}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Incident Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Incidents</option>
              <option value="active">Active Overload (Ongoing)</option>
              <option value="resolved">Resolved Incidents</option>
            </select>
          </div>

          {/* Cutoff Checkbox */}
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="cutoffToggle"
              checked={cutoffOnly}
              onChange={(e) => setCutoffOnly(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
            />
            <label
              htmlFor="cutoffToggle"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none cursor-pointer"
            >
              Cutoff Triggered Only
            </label>
          </div>

          {/* Tamper Checkbox */}
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="tamperToggle"
              checked={tamperOnly}
              onChange={(e) => setTamperOnly(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
            />
            <label
              htmlFor="tamperToggle"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none cursor-pointer"
            >
              Hardware Tamper Only
            </label>
          </div>
        </div>
      </div>

      {/* Events Table */}
      {isLoading ? (
        <TableSkeleton rows={7} />
      ) : !events || events.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No overload incidents match the criteria
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Fleet adherence is optimal for the current filter settings.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4">Peak Weight</th>
                  <th className="py-3.5 px-4">Peak Load %</th>
                  <th className="py-3.5 px-4">Started At</th>
                  <th className="py-3.5 px-4">Ended At</th>
                  <th className="py-3.5 px-4">Cutoff Relay</th>
                  <th className="py-3.5 px-4">Tamper</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {events.map((event) => {
                  const reg = event.vehicles?.registration_no || 'Unknown';
                  const isActive = !event.ended_at;

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <Link
                          to={`/vehicles/${event.vehicle_id}`}
                          className="hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1.5"
                        >
                          <span>{reg}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-red-600 dark:text-red-400">
                        {formatWeight(event.peak_load_kg)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-red-600 dark:text-red-400">
                        {event.peak_percent}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {formatDate(event.started_at)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {event.ended_at ? (
                          formatDate(event.ended_at)
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-bold animate-pulse">
                            Active Ongoing
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {event.engine_cutoff_triggered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            <PowerOff className="w-3 h-3" />
                            Triggered
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">In Grace</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {event.tamper_flag ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            <ShieldAlert className="w-3 h-3" />
                            Flagged
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={isActive ? 'overloaded' : 'safe'}
                          label={isActive ? 'Active Overload' : 'Resolved'}
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                        >
                          View Drawer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Drawer Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Overload Incident Inspection"
        subtitle={`Incident ID: ${selectedEvent?.id || ''}`}
        maxWidth="lg"
      >
        {selectedEvent && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  Vehicle
                </span>
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                  {selectedEvent.vehicles?.registration_no || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  Peak Overload Load
                </span>
                <span className="text-sm font-extrabold font-mono text-red-600 dark:text-red-400">
                  {formatWeight(selectedEvent.peak_load_kg)} ({selectedEvent.peak_percent}%)
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Incident Start Time:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {formatDate(selectedEvent.started_at)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Resolution Time:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {selectedEvent.ended_at ? formatDate(selectedEvent.ended_at) : 'Active / Ongoing'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">120s Grace Period:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedEvent.grace_period_expired ? 'Expired (Cutoff Active)' : 'Active / Abated'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Engine Cutoff Command:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedEvent.engine_cutoff_triggered ? 'RELAY CUTOFF EXECUTED' : 'Not Triggered'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Cutoff Released At:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {selectedEvent.cutoff_released_at
                    ? formatDate(selectedEvent.cutoff_released_at)
                    : 'Relay remains armed / cutoff'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Strain Gauge Tamper:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedEvent.tamper_flag ? '⚠️ Physical Tampering Flagged' : 'None Detected'}
                </span>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close Drawer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
