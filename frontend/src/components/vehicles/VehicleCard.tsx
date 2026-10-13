import React from 'react';
import { Link } from 'react-router-dom';
import { Vehicle } from '../../types';
import { CircularGauge } from '../common/CircularGauge';
import { StatusBadge } from '../common/StatusBadge';
import { formatWeight, formatRelativeTime, isDeviceOnline, cn } from '../../lib/utils';
import { Truck, Gauge, Wifi, WifiOff, PowerOff, ShieldCheck, ChevronRight } from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  const latestReading = vehicle.latest_reading;
  const currentLoadPercent = latestReading ? Number(latestReading.load_percent) : 0;
  const currentLoadKg = latestReading ? Number(latestReading.load_kg) : 0;
  const currentSpeed = latestReading ? Number(latestReading.speed_kmph) : 0;
  const isOnline = isDeviceOnline(vehicle.device?.last_seen_at);
  const isOverloaded = currentLoadPercent > 100 || vehicle.status === 'overloaded';
  const isWarning = currentLoadPercent >= 90 && currentLoadPercent <= 100;
  const isCutoff = isOverloaded && (vehicle.status === 'overloaded');

  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden',
        isOverloaded
          ? 'border-red-400 dark:border-red-600 overload-pulse-ring'
          : isWarning
          ? 'border-amber-300 dark:border-amber-700/80 hover:border-amber-400'
          : 'border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700'
      )}
    >
      {/* Top Banner Accent */}
      <div
        className={cn(
          'h-1.5 w-full transition-colors',
          isOverloaded ? 'bg-red-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
        )}
      />

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Header: Registration, Type & Online Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                isOverloaded
                  ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/60 dark:border-red-800'
                  : isWarning
                  ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/60 dark:border-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              )}
            >
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                {vehicle.registration_no}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {vehicle.vehicle_type} • {vehicle.axle_count} Axles
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <StatusBadge
            status={
              isOverloaded
                ? 'overloaded'
                : isWarning
                ? 'warning'
                : !isOnline
                ? 'offline'
                : 'safe'
            }
            size="sm"
          />
        </div>

        {/* Center Section: Circular Gauge */}
        <div className="flex items-center justify-center py-2">
          <CircularGauge
            percent={currentLoadPercent}
            size={144}
            strokeWidth={12}
            sublabel="Axle Load"
          />
        </div>

        {/* Load & Capacity Numbers */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
              Current Load
            </span>
            <span
              className={cn(
                'text-sm font-bold font-mono',
                isOverloaded
                  ? 'text-red-600 dark:text-red-400'
                  : isWarning
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-800 dark:text-slate-200'
              )}
            >
              {latestReading ? formatWeight(currentLoadKg) : 'No Data'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
              Permissible Limit
            </span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
              {formatWeight(vehicle.permissible_load_kg)}
            </span>
          </div>
        </div>

        {/* Telemetry Metrics: Speed, Relay Cutoff, Hardware Last Seen */}
        <div className="space-y-2 pt-1 text-xs">
          {/* Speed & Hardware */}
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              Speed: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{currentSpeed.toFixed(0)} km/h</span>
            </span>

            <span className="flex items-center gap-1 text-[11px]">
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">ESP32 Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-500">Offline</span>
                </>
              )}
            </span>
          </div>

          {/* Engine Relay status banner */}
          {isOverloaded ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-100/70 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
              <PowerOff className="w-4 h-4 shrink-0 animate-pulse text-red-600" />
              <span className="text-[11px] font-bold uppercase tracking-tight">
                Engine Relay Cutoff Active
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="text-[11px] font-medium">
                Engine Relay Safe (Ignition Armed)
              </span>
            </div>
          )}

          {/* Timestamp info */}
          <div className="text-[11px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span>Device: <span className="font-mono text-slate-600 dark:text-slate-300">{vehicle.device?.device_serial || 'Unlinked'}</span></span>
            <span>{latestReading ? formatRelativeTime(latestReading.recorded_at) : 'No telemetry'}</span>
          </div>
        </div>
      </div>

      {/* Card Footer Link */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
        <Link
          to={`/vehicles/${vehicle.id}`}
          className="w-full py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
        >
          <span>View Telemetry & History</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
