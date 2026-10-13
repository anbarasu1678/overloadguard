import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Activity,
  Truck,
  AlertTriangle,
  Bell,
  Cpu,
  BarChart3,
  Settings,
  ShieldAlert,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  unreadAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  unreadAlertsCount = 0,
}) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/live-monitor',
      label: 'Live Monitor',
      icon: Activity,
      highlight: true,
    },
    {
      to: '/vehicles',
      label: 'Vehicles',
      icon: Truck,
    },
    {
      to: '/events',
      label: 'Overload Events',
      icon: AlertTriangle,
    },
    {
      to: '/alerts',
      label: 'Alerts',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
    },
    {
      to: '/reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
    },
    ...(isAdmin
      ? [
          {
            to: '/devices',
            label: 'Hardware Devices',
            icon: Cpu,
            adminOnly: true,
          },
        ]
      : []),
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 lg:top-16 z-50 lg:z-30 h-screen lg:h-[calc(100vh-4rem)] w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Mobile Header with Close button */}
          <div className="flex items-center justify-between lg:hidden pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Navigation
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shadow-sm border border-sky-200/60 dark:border-sky-800/60'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {item.highlight && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Safety & Privacy Note */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>OverloadGuard Core</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Axle load telemetry & engine relay protection. Location tracking is strictly disabled.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
