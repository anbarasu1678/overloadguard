import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, AlertTriangle, AlertOctagon, PowerOff, Wifi, WifiOff, Wrench } from 'lucide-react';

export type BadgeStatus =
  | 'safe'
  | 'active'
  | 'warning'
  | 'overloaded'
  | 'cutoff'
  | 'offline'
  | 'online'
  | 'maintenance'
  | 'tamper';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showIcon = true,
  className,
}) => {
  const norm = status.toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  let defaultLabel = norm;
  let Icon = CheckCircle2;

  if (norm === 'safe' || norm === 'active' || norm === 'normal') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
    defaultLabel = 'Safe';
    Icon = CheckCircle2;
  } else if (norm === 'warning') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60';
    defaultLabel = 'Warning (90-100%)';
    Icon = AlertTriangle;
  } else if (norm === 'overloaded' || norm === 'overload') {
    styles = 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800 animate-pulse';
    defaultLabel = 'Overloaded (>100%)';
    Icon = AlertOctagon;
  } else if (norm === 'cutoff') {
    styles = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800';
    defaultLabel = 'Engine Cutoff';
    Icon = PowerOff;
  } else if (norm === 'online') {
    styles = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800';
    defaultLabel = 'Online';
    Icon = Wifi;
  } else if (norm === 'offline') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    defaultLabel = 'Offline';
    Icon = WifiOff;
  } else if (norm === 'tamper') {
    styles = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
    defaultLabel = 'Tamper Detected';
    Icon = AlertOctagon;
  } else if (norm === 'maintenance') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
    defaultLabel = 'Maintenance';
    Icon = Wrench;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border transition-colors',
        sizeClasses,
        styles,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{label || defaultLabel}</span>
    </span>
  );
};
