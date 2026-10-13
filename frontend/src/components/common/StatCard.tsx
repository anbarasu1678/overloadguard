import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'safe' | 'warning' | 'danger' | 'info';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  className,
}) => {
  const variantStyles = {
    default: {
      iconBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      borderAccent: 'border-slate-200 dark:border-slate-800',
    },
    safe: {
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      borderAccent: 'hover:border-emerald-300 dark:hover:border-emerald-800',
    },
    warning: {
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      borderAccent: 'hover:border-amber-300 dark:hover:border-amber-800',
    },
    danger: {
      iconBg: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400',
      borderAccent: 'hover:border-red-400 dark:hover:border-red-800',
    },
    info: {
      iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
      borderAccent: 'hover:border-sky-300 dark:hover:border-sky-800',
    },
  }[variant];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md',
        variantStyles.borderAccent,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              {value}
            </span>
            {subtitle && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className={cn('p-3 rounded-xl flex items-center justify-center shrink-0', variantStyles.iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center text-xs text-slate-500 dark:text-slate-400">
          <span
            className={cn(
              'font-medium mr-1.5',
              trend.direction === 'up' && variant === 'danger' ? 'text-red-600 dark:text-red-400' :
              trend.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
              trend.direction === 'down' ? 'text-amber-600 dark:text-amber-400' :
              'text-slate-500'
            )}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.text}
          </span>
          <span>vs last cycle</span>
        </div>
      )}
    </div>
  );
};
