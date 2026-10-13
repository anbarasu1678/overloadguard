import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Alert } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../lib/utils';
import { Bell, Check, CheckCheck, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Alerts: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'unread' | 'all'>('unread');

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', tab],
    queryFn: () => api.getAlerts(tab === 'unread' ? false : undefined),
    refetchInterval: 5000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.markAllAlertsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const unreadCount = (alerts || []).filter((a) => !a.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Security & Overload Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time critical weight events, engine cutoffs, and hardware tamper logs
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-500" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setTab('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'unread'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          Unread Alerts
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'all'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          All Activity Log
        </button>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
          Loading alerts stream...
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {tab === 'unread' ? 'All clear! No unread alerts.' : 'No alerts recorded yet.'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            New overload events and engine relay triggers will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
                !alert.is_read
                  ? 'border-sky-300 dark:border-sky-800 bg-sky-50/20 dark:bg-sky-950/20 ring-1 ring-sky-500/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <StatusBadge status={alert.type} size="md" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {formatDate(alert.created_at)}
                    </span>
                    {alert.vehicles && (
                      <Link
                        to={`/vehicles/${alert.vehicle_id}`}
                        className="text-sky-600 dark:text-sky-400 hover:underline font-mono font-bold"
                      >
                        {alert.vehicles.registration_no}
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!alert.is_read ? (
                <button
                  onClick={() => markReadMutation.mutate(alert.id)}
                  disabled={markReadMutation.isPending}
                  className="self-end sm:self-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Acknowledge</span>
                </button>
              ) : (
                <span className="self-end sm:self-center text-[11px] text-slate-400 font-medium px-2 py-1">
                  Acknowledged
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
