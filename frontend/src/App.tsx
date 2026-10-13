import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitor } from './pages/LiveMonitor';
import { Vehicles } from './pages/Vehicles';
import { VehicleDetail } from './pages/VehicleDetail';
import { OverloadEvents } from './pages/OverloadEvents';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { Devices } from './pages/Devices';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Dashboard & Operations Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="live-monitor" element={<LiveMonitor />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="events" element={<OverloadEvents />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Reports />} />
        <Route
          path="devices"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Devices />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
