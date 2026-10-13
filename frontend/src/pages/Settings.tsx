import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { supabase } from '../lib/supabase';
import {
  User,
  Shield,
  Key,
  Sun,
  Moon,
  Building,
  Mail,
  Check,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const { isDark, setTheme } = useThemeStore();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMsg({ type: 'success', text: 'Password successfully updated.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          System & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your operator profile, credentials, and interface preferences
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-sky-500" />
          <span>Profile Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px] font-semibold uppercase">
              Full Name
            </span>
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 block">
              {user?.full_name || 'System Operator'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px] font-semibold uppercase">
              Email Address
            </span>
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 block">
              {user?.email || 'N/A'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px] font-semibold uppercase">
              Assigned Role
            </span>
            <span className="font-bold text-sm text-sky-600 dark:text-sky-400 mt-0.5 block capitalize">
              {user?.role.replace('_', ' ') || 'Fleet Owner'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px] font-semibold uppercase">
              Organization / Fleet
            </span>
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 block">
              {user?.organization || 'National Transport Fleet'}
            </span>
          </div>
        </div>
      </div>

      {/* Theme Preference Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Interface Appearance Theme</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select dark or light mode optimized for daytime office operations or low-light roadside enforcement patrols.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <button
            type="button"
            onClick={() => setTheme(false)}
            className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              !isDark
                ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Light Theme</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(true)}
            className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              isDark
                ? 'bg-slate-800 border-sky-500 text-sky-400 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Dark Theme</span>
          </button>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-sky-500" />
          <span>Change Password</span>
        </h2>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {passwordMsg.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Architectural Guarantee Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
        <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
        <div>
          <h4 className="font-bold">Privacy Architecture & Compliance Guarantee</h4>
          <p className="mt-0.5 leading-relaxed text-[11px] text-emerald-700 dark:text-emerald-400">
            OverloadGuard strictly adheres to non-tracking requirements. No GPS hardware coordinates, latitude/longitude columns, or geolocation tracking scripts are compiled into this application. Telemetry consists solely of strain-gauge weight measurements and speed readings.
          </p>
        </div>
      </div>
    </div>
  );
};
