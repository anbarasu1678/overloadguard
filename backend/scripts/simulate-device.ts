/**
 * OverloadGuard ESP32 Device Telemetry Simulator
 * 
 * Simulates a real vehicle load-cell journey:
 * 1. Normal driving (65% - 75% load)
 * 2. Heavy loading / Warning threshold (90% - 95%)
 * 3. Severe Overload (> 110% load) -> triggers Grace Period countdown
 * 4. Grace Period Expiry -> Engine Cutoff relay activated
 * 5. Offloading / Correction (< 80% load) -> Engine Cutoff released
 */

import dotenv from 'dotenv';
dotenv.config();

const API_BASE = process.env.SIMULATOR_API_URL || 'http://localhost:5000';
const DEVICE_KEY = process.env.SIMULATOR_DEVICE_KEY || 'dev_key_secret_123';
const DEVICE_SERIAL = process.env.SIMULATOR_DEVICE_SERIAL || 'OG-ESP32-001';

interface TelemetryPayload {
  device_serial: string;
  load_kg: number;
  speed_kmph: number;
  timestamp: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendReading(loadKg: number, speedKmph: number, note: string) {
  const payload: TelemetryPayload = {
    device_serial: DEVICE_SERIAL,
    load_kg: Math.round(loadKg),
    speed_kmph: Math.round(speedKmph * 10) / 10,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n-----------------------------------------------------------`);
  console.log(`[SIMULATOR] Step: ${note}`);
  console.log(`[SIMULATOR] Sending: ${payload.load_kg.toLocaleString()} kg | Speed: ${payload.speed_kmph} km/h`);

  try {
    const response = await fetch(`${API_BASE}/api/device/readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': DEVICE_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as any;

    if (response.ok && data.success) {
      console.log(`[SIMULATOR] Response Status: 200 OK`);
      console.log(`[SIMULATOR] Load %: ${data.data.load_percent}%`);
      console.log(`[SIMULATOR] Vehicle Status: ${data.data.vehicle_status}`);
      console.log(
        `[SIMULATOR] Engine Relay Cutoff Command: ${
          data.data.engine_cutoff_command ? '🚨 ACTIVE (CUTOFF)' : '✅ INACTIVE (DRIVE)'
        }`
      );
    } else {
      console.error(`[SIMULATOR] Error: HTTP ${response.status}`, data);
    }
  } catch (err: any) {
    console.error(`[SIMULATOR] Network connection failed: ${err.message}`);
    console.log(`(Ensure backend server is running on ${API_BASE})`);
  }
}

async function runSimulation() {
  console.log(`===========================================================`);
  console.log(`🚛 OverloadGuard ESP32 Hardware Telemetry Simulator`);
  console.log(`Target API: ${API_BASE}`);
  console.log(`Target Device Serial: ${DEVICE_SERIAL}`);
  console.log(`===========================================================`);

  // Step 1: Normal safe operation (~17,500 kg / 70% of 25,000 kg capacity)
  await sendReading(17500, 58.4, 'Normal highway cruising (Safe Load 70%)');
  await sleep(3000);

  // Step 2: Warning zone approaching maximum load (~23,500 kg / 94%)
  await sendReading(23500, 42.0, 'Loaded at depot - Warning Zone (94%)');
  await sleep(3000);

  // Step 3: Critical Overload (>100% - 28,200 kg / 112.8%)
  await sendReading(28200, 25.0, 'CRITICAL OVERLOAD: Exceeding Permissible Limit (112.8%)');
  console.log(`[SIMULATOR] Grace period timer running...`);
  await sleep(4000);

  // Step 4: Continued Overload past grace period -> Relay Cutoff
  await sendReading(28400, 0.0, 'OVERLOAD SUSTAINED: Grace Period Expired -> Engine Cutoff');
  await sleep(4000);

  // Step 5: Cargo unloaded / weight corrected (19,000 kg / 76%)
  await sendReading(19000, 0.0, 'CARGO OFF-LOADED: Load returned to safe limits (76%) -> Relay Released');
  await sleep(3000);

  // Step 6: Resuming normal trip
  await sendReading(18800, 48.0, 'Vehicle restarted and safely driving on highway');

  console.log(`\n===========================================================`);
  console.log(`✨ Simulation sequence completed successfully.`);
  console.log(`===========================================================`);
}

runSimulation();
