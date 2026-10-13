import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { VehicleCard } from '../components/vehicles/VehicleCard';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import { isDeviceOnline } from '../lib/utils';
import {
  Activity,
  Search,
  Filter,
  AlertOctagon,
  ShieldCheck,
  Radio,
  RefreshCw,
} from 'lucide-react';

type StatusFilter = 'all' | 'safe' | 'warning' | 'overloaded' | 'offline';

export const LiveMonitor: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const { data: vehicles, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
    refetchInterval: 5000, // Poll every 5s in addition to Realtime websocket
  });

  // Calculate live count statistics
  const stats = useMemo(() => {
    let safe = 0;
    let warning = 0;
    let overloaded = 0;
    let offline = 0;

    (vehicles || []).forEach((v) => {
      const loadPercent = v.latest_reading ? Number(v.latest_reading.load_percent) : 0;
      const online = isDeviceOnline(v.device?.last_seen_at);

      if (!online) {
        offline += 1;
      }
      if (loadPercent > 100 || v.status === 'overloaded') {
        overloaded += 1;
      } else if (loadPercent >= 90) {
        warning += 1;
      } else {
        safe += 1;
      }
    });

    return { safe, warning, overloaded, offline, total: vehicles?.length || 0 };
  }, [vehicles]);

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    return (vehicles || []).filter((v) => {
      // 1. Search query
      const matchesSearch =
        v.registration_no.toLowerCase().includes(search.toLowerCase()) ||
        v.vehicle_type.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Status filter
      const loadPercent = v.latest_reading ? Number(v.latest_reading.load_percent) : 0;
      const online = isDeviceOnline(v.device?.last_seen_at);

      if (filter === 'safe') return loadPercent < 90 && v.status !== 'overloaded';
      if (filter === 'warning') return loadPercent >= 90 && loadPercent <= 100;
      if (filter === 'overloaded') return loadPercent > 100 || v.status === 'overloaded';
      if (filter === 'offline') return !online;

      return true;
    });
  }, [vehicles, search, filter]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Live Fleet Monitor
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              <span>Realtime</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time visual telemetry status cards with dynamic gauges and relay cutoff indicators
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Critical Overload Banner if any active violations */}
      {stats.overloaded > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 text-red-700 dark:text-red-400 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500 text-white shadow-md">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                Active Axle Overload Violation Detected ({stats.overloaded} vehicle{stats.overloaded > 1 ? 's' : ''})
              </h3>
              <p className="text-xs text-red-600 dark:text-red-300">
                Automatic engine ignition cutoff is triggered or armed for overloaded units past the 120s grace period.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('overloaded')}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition-colors"
          >
            Filter Overloaded
          </button>
        </div>
      )}

      {/* Search Bar & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by registration number or truck type..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All ({stats.total})
          </button>

          <button
            onClick={() => setFilter('safe')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filter === 'safe'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Safe ({stats.safe})</span>
          </button>

          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filter === 'warning'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Warning ({stats.warning})</span>
          </button>

          <button
            onClick={() => setFilter('overloaded')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filter === 'overloaded'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span>Overloaded ({stats.overloaded})</span>
          </button>

          <button
            onClick={() => setFilter('offline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === 'offline'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Offline ({stats.offline})
          </button>
        </div>
      </div>

      {/* Grid of Vehicle Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No matching vehicles found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try adjusting your search criteria or changing the active status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  );
};
