import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Vehicle } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { formatWeight, formatDate, isDeviceOnline } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import {
  Truck,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Cpu,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const Vehicles: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const canManage = isAdmin || user?.role === 'fleet_owner';

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [regNo, setRegNo] = useState('');
  const [type, setType] = useState('Multi-Axle Heavy Truck');
  const [axles, setAxles] = useState(4);
  const [unladenKg, setUnladenKg] = useState(7500);
  const [permissibleKg, setPermissibleKg] = useState(25000);
  const [formError, setFormError] = useState('');

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.createVehicle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.updateVehicle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const openAddModal = () => {
    setEditingVehicle(null);
    setRegNo('');
    setType('Multi-Axle Heavy Truck');
    setAxles(4);
    setUnladenKg(7500);
    setPermissibleKg(25000);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setRegNo(v.registration_no);
    setType(v.vehicle_type);
    setAxles(v.axle_count);
    setUnladenKg(Number(v.unladen_weight_kg));
    setPermissibleKg(Number(v.permissible_load_kg));
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingVehicle(null);
    setFormError('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      registration_no: regNo.trim().toUpperCase(),
      vehicle_type: type,
      axle_count: Number(axles),
      unladen_weight_kg: Number(unladenKg),
      permissible_load_kg: Number(permissibleKg),
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = (vehicles || []).filter(
    (v) =>
      v.registration_no.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Registered Vehicles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage commercial fleet units, permissible axle gross weights, and load parameters
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        )}
      </div>

      {/* Search and count bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registration no. or type..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Total: {filtered.length} vehicle{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <Truck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No vehicles found
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Vehicle" to register a goods truck with permissible weight limit.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Registration</th>
                  <th className="py-3.5 px-4">Vehicle Type</th>
                  <th className="py-3.5 px-4">Axles</th>
                  <th className="py-3.5 px-4">Permissible Limit</th>
                  <th className="py-3.5 px-4">Current Load</th>
                  <th className="py-3.5 px-4">Device Status</th>
                  <th className="py-3.5 px-4">Compliance Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((vehicle) => {
                  const latest = vehicle.latest_reading;
                  const loadPercent = latest ? Number(latest.load_percent) : 0;
                  const isOnline = isDeviceOnline(vehicle.device?.last_seen_at);

                  return (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <Link
                          to={`/vehicles/${vehicle.id}`}
                          className="hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1.5"
                        >
                          <span>{vehicle.registration_no}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {vehicle.vehicle_type}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{vehicle.axle_count}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        {formatWeight(vehicle.permissible_load_kg)}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {latest ? (
                          <span
                            className={
                              loadPercent > 100
                                ? 'text-red-600 dark:text-red-400 font-bold'
                                : loadPercent >= 90
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {formatWeight(latest.load_kg)} ({loadPercent}%)
                          </span>
                        ) : (
                          <span className="text-slate-400">No reading</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {vehicle.device ? (
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span className="font-mono">{vehicle.device.device_serial}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={vehicle.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/vehicles/${vehicle.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800"
                            title="View Telemetry & History"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          {canManage && (
                            <button
                              onClick={() => openEditModal(vehicle)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800"
                              title="Edit Vehicle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete vehicle ${vehicle.registration_no}?`
                                  )
                                ) {
                                  deleteMutation.mutate(vehicle.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                              title="Delete Vehicle"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingVehicle ? 'Edit Vehicle Parameters' : 'Register New Goods Vehicle'}
        subtitle="Specify axle configuration and permissible gross vehicle weight"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vehicle Registration Number
            </label>
            <input
              type="text"
              required
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder="e.g. KA-01-AB-1001"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vehicle Body Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            >
              <option value="Multi-Axle Heavy Truck">Multi-Axle Heavy Truck</option>
              <option value="Tipper Truck">Tipper Truck</option>
              <option value="Container Trailer">Container Trailer</option>
              <option value="Heavy Duty Hauler">Heavy Duty Hauler</option>
              <option value="Medium Goods Vehicle">Medium Goods Vehicle</option>
              <option value="Tanker Truck">Tanker Truck</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Axle Count
              </label>
              <input
                type="number"
                min={2}
                max={12}
                required
                value={axles}
                onChange={(e) => setAxles(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unladen Tare (kg)
              </label>
              <input
                type="number"
                min={500}
                required
                value={unladenKg}
                onChange={(e) => setUnladenKg(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Permissible Load Limit (kg)
            </label>
            <input
              type="number"
              min={1000}
              required
              value={permissibleKg}
              onChange={(e) => setPermissibleKg(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Hardware relay cutoff triggers when measured load exceeds this value past grace period.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm disabled:opacity-60"
            >
              {editingVehicle ? 'Save Changes' : 'Create Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
