import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';
import { Skeleton } from '../common/SkeletonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 mx-auto flex items-center justify-center animate-spin">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Verifying OverloadGuard session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Access Restricted
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Your current account role (<span className="font-semibold text-slate-700 dark:text-slate-300">{user.role}</span>) does not have authorization to view this management module.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
