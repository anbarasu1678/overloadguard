import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, AlertOctagon, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ToastItem {
  id: string;
  type: 'warning' | 'overload' | 'cutoff' | 'tamper' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = {
      ...toast,
      id,
      timestamp: new Date().toLocaleTimeString(),
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    // Auto dismiss after 8 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Floating toast stack in top-right */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let Icon = Info;
          let borderColor = 'border-slate-300 dark:border-slate-700';
          let iconColor = 'text-sky-500';

          if (toast.type === 'overload' || toast.type === 'cutoff') {
            Icon = AlertOctagon;
            borderColor = 'border-red-400 dark:border-red-600 ring-2 ring-red-500/20';
            iconColor = 'text-red-500 animate-pulse';
          } else if (toast.type === 'warning') {
            Icon = AlertCircle;
            borderColor = 'border-amber-400 dark:border-amber-600';
            iconColor = 'text-amber-500';
          } else if (toast.type === 'success') {
            Icon = CheckCircle2;
            borderColor = 'border-emerald-400 dark:border-emerald-600';
            iconColor = 'text-emerald-500';
          }

          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 shadow-xl border transition-all duration-300 transform translate-y-0',
                borderColor
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                    {toast.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono ml-2">
                    {toast.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0 ml-1"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
