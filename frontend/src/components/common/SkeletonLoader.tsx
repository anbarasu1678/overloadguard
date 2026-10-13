import React from 'react';
import { cn } from '../../lib/utils';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-slate-200 dark:bg-slate-800/80',
      className
    )}
  />
);

export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <div className="flex justify-center py-4">
      <Skeleton className="h-32 w-32 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-3 pt-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-8 w-32 rounded-lg" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
    ))}
  </div>
);
