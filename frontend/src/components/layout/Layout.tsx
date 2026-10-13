import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../common/ToastContainer';
import { useAuthStore } from '../../store/authStore';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuthStore();

  // Supabase Realtime Listener for Alerts, Load Readings, and Events
  useEffect(() => {
    // 1. Initial count of unread alerts
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false);
        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        // Silently catch if not initialized
      }
    };
    fetchUnreadCount();

    // 2. Subscribe to Supabase Realtime channels
    const alertsChannel = supabase
      .channel('public:alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = payload.new as any;
          setUnreadCount((c) => c + 1);

          // Invalidate alerts and stats queries
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          queryClient.invalidateQueries({ queryKey: ['stats-summary'] });

          // Pop alert toast
          if (newAlert.type === 'overload' || newAlert.type === 'cutoff') {
            showToast({
              type: newAlert.type,
              title: newAlert.type === 'cutoff' ? 'Engine Cutoff Activated' : 'Overload Violation',
              message: newAlert.message,
            });
          } else if (newAlert.type === 'warning') {
            showToast({
              type: 'warning',
              title: 'Load Warning Threshold',
              message: newAlert.message,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          fetchUnreadCount();
        }
      )
      .subscribe();

    // Realtime channel for live load readings
    const readingsChannel = supabase
      .channel('public:load_readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'load_readings' },
        () => {
          // Re-fetch vehicles and latest readings
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
          queryClient.invalidateQueries({ queryKey: ['vehicle-readings'] });
        }
      )
      .subscribe();

    // Realtime channel for overload events
    const eventsChannel = supabase
      .channel('public:overload_events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'overload_events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['overload-events'] });
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(readingsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [queryClient, showToast]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        unreadAlertsCount={unreadCount}
      />
      <div className="flex-1 flex w-full">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          unreadAlertsCount={unreadCount}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
