import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Device } from '../types';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { formatDate, formatRelativeTime, isDeviceOnline } from '../lib/utils';
import {
  Cpu,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Key,
  Shield,
  Radio,
} from 'lucide-react';

export const Devices: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [registeredSerial, setRegisteredSerial] = useState('');
  const [copied, setCopied] = useState(false);

  // Form State
  const [serial, setSerial] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [firmware, setFirmware] = useState('v2.1.0');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch devices
  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices(),
  });

  // 2. Fetch vehicles for assignment
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const registerMutation = useMutation({
    mutationFn: (payload: any) => api.registerDevice(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setModalOpen(false);
      setGeneratedKey(data.api_key);
      setRegisteredSerial(data.device.device_serial);
      setKeyModalOpen(true);
    },
    onError: (err: any) => setErrorMsg(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    registerMutation.mutate({
      device_serial: serial.trim().toUpperCase(),
      vehicle_id: vehicleId || undefined,
      firmware_version: firmware,
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Hardware Device Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Admin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision ESP32 microcontrollers, generate cryptographically hashed API keys, and monitor heartbeat
          </p>
        </div>

        <button
          onClick={() => {
            setSerial(`OG-ESP32-00${(devices?.length || 0) + 1}`);
            setVehicleId('');
            setFirmware('v2.1.0');
            setErrorMsg('');
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Device</span>
        </button>
      </div>

      {/* Devices Table */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : !devices || devices.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <Cpu className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No hardware devices provisioned
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Click "Provision New Device" to create device credentials for an ESP32 unit.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Serial Number</th>
                  <th className="py-3.5 px-4">Assigned Vehicle</th>
                  <th className="py-3.5 px-4">Firmware Version</th>
                  <th className="py-3.5 px-4">Heartbeat Status</th>
                  <th className="py-3.5 px-4">Last Telemetry</th>
                  <th className="py-3.5 px-4">Active</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {devices.map((device) => {
                  const isOnline = isDeviceOnline(device.last_seen_at);
                  const reg = device.vehicles?.registration_no || 'Unassigned';

                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-sky-500 shrink-0" />
                        <span>{device.device_serial}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {reg}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {device.firmware_version}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span
                            className={
                              isOnline
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'text-slate-400'
                            }
                          >
                            {isOnline ? 'Online (Active Stream)' : 'Offline'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {formatRelativeTime(device.last_seen_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            device.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {device.is_active ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Delete device ${device.device_serial}? Any ongoing telemetry will be rejected.`
                              )
                            ) {
                              deleteMutation.mutate(device.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Device"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provision Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision ESP32 Hardware Device"
        subtitle="Generates an authentication key hash for the device"
      >
        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Device Serial Identifier
            </label>
            <input
              type="text"
              required
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="e.g. OG-ESP32-006"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm uppercase"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assign to Vehicle
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <option value="">Unassigned (Link later)</option>
              {(vehicles || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_no} ({v.vehicle_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Firmware Version
            </label>
            <input
              type="text"
              required
              value={firmware}
              onChange={(e) => setFirmware(e.target.value)}
              placeholder="v2.1.0"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
            Note: Once provisioned, a raw device API key will be displayed ONCE. Store it in the ESP32 firmware secrets header.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm"
            >
              Generate Device Credentials
            </button>
          </div>
        </form>
      </Modal>

      {/* One-Time API Key Display Modal */}
      <Modal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        title="Hardware API Key Generated"
        subtitle={`Provisioned for: ${registeredSerial}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">COPY THIS KEY NOW</p>
              <p className="text-[11px] mt-0.5">
                For security reasons, OverloadGuard hashes all hardware API keys. This raw key cannot be recovered or displayed again.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ESP32 Device API Key (`x-device-key`)
            </label>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Key className="w-4 h-4 text-amber-500 shrink-0" />
              <input
                type="text"
                readOnly
                value={generatedKey}
                className="bg-transparent font-mono text-xs w-full text-slate-900 dark:text-slate-100 select-all outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-mono space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">ESP32 Firmware Flash Snippet:</p>
            <p className="text-sky-600 dark:text-sky-400">#define DEVICE_SERIAL "{registeredSerial}"</p>
            <p className="text-sky-600 dark:text-sky-400">#define DEVICE_API_KEY "{generatedKey}"</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setKeyModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
            >
              I Have Stored the Key Safely
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
