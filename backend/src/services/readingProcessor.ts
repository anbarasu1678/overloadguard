import { supabaseAdmin } from '../config/supabase';
import { Device, Vehicle } from '../types';

export const GRACE_PERIOD_SECONDS = 120; // 2 minutes grace period before relay cutoff
export const WARNING_THRESHOLD_PERCENT = 90.0;

export interface IngestReadingParams {
  device: Device;
  vehicle: Vehicle;
  load_kg: number;
  speed_kmph: number;
  timestamp?: string;
}

export interface ReadingResult {
  reading: any;
  load_percent: number;
  vehicle_status: string;
  overload_event?: any;
  engine_cutoff_active: boolean;
  alert_created?: boolean;
}

export async function processDeviceReading(
  params: IngestReadingParams
): Promise<ReadingResult> {
  const { device, vehicle, load_kg, speed_kmph, timestamp } = params;
  const recordedAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

  // 1. Calculate load percentage
  const permissible = Number(vehicle.permissible_load_kg);
  if (!permissible || permissible <= 0) {
    throw new Error(`Invalid permissible load configured for vehicle ${vehicle.registration_no}`);
  }

  const loadPercent = Number(((load_kg / permissible) * 100).toFixed(2));
  const isOverloaded = loadPercent > 100.0;
  let vehicleStatus = vehicle.status;
  let engineCutoffActive = false;
  let activeOverloadEvent: any = null;
  let alertCreated = false;

  // 2. Insert load reading
  const { data: reading, error: readingError } = await supabaseAdmin
    .from('load_readings')
    .insert({
      vehicle_id: vehicle.id,
      device_id: device.id,
      load_kg,
      load_percent: loadPercent,
      speed_kmph: Math.max(0, speed_kmph),
      recorded_at: recordedAt,
    })
    .select('*')
    .single();

  if (readingError) {
    console.error('[Telemetry] Error inserting reading:', readingError);
    throw new Error(`Failed to record reading: ${readingError.message}`);
  }

  // 3. Update device last_seen_at
  await supabaseAdmin
    .from('devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', device.id);

  // 4. Check for currently active (open) overload event
  const { data: openEvents } = await supabaseAdmin
    .from('overload_events')
    .select('*')
    .eq('vehicle_id', vehicle.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1);

  const existingEvent = openEvents && openEvents.length > 0 ? openEvents[0] : null;

  if (isOverloaded) {
    vehicleStatus = 'overloaded';

    if (!existingEvent) {
      // Create new overload event
      const { data: newEvent, error: newEventErr } = await supabaseAdmin
        .from('overload_events')
        .insert({
          vehicle_id: vehicle.id,
          device_id: device.id,
          peak_load_kg: load_kg,
          peak_percent: loadPercent,
          started_at: recordedAt,
          ended_at: null,
          grace_period_expired: false,
          engine_cutoff_triggered: false,
          cutoff_released_at: null,
          tamper_flag: false,
        })
        .select('*')
        .single();

      if (!newEventErr && newEvent) {
        activeOverloadEvent = newEvent;
        // Create initial overload alert
        await supabaseAdmin.from('alerts').insert({
          vehicle_id: vehicle.id,
          event_id: newEvent.id,
          type: 'overload',
          message: `OVERLOAD DETECTED: Vehicle ${vehicle.registration_no} at ${load_kg.toLocaleString()} kg (${loadPercent}% of ${permissible.toLocaleString()} kg limit). Grace period active.`,
          is_read: false,
        });
        alertCreated = true;
      }
    } else {
      // Extend existing overload event
      activeOverloadEvent = existingEvent;
      const startedTime = new Date(existingEvent.started_at).getTime();
      const currentTime = new Date(recordedAt).getTime();
      const elapsedSeconds = Math.max(0, (currentTime - startedTime) / 1000);

      const updates: any = {};
      if (load_kg > Number(existingEvent.peak_load_kg)) {
        updates.peak_load_kg = load_kg;
        updates.peak_percent = loadPercent;
      }

      // Check grace period expiry (cutoff activation)
      if (elapsedSeconds >= GRACE_PERIOD_SECONDS) {
        engineCutoffActive = true;
        if (!existingEvent.engine_cutoff_triggered) {
          updates.grace_period_expired = true;
          updates.engine_cutoff_triggered = true;

          // Create cutoff alert
          await supabaseAdmin.from('alerts').insert({
            vehicle_id: vehicle.id,
            event_id: existingEvent.id,
            type: 'cutoff',
            message: `ENGINE CUTOFF TRIGGERED: Vehicle ${vehicle.registration_no} exceeded permissible load (${load_kg.toLocaleString()} kg / ${loadPercent}%) past ${GRACE_PERIOD_SECONDS}s grace period. Relay opened.`,
            is_read: false,
          });
          alertCreated = true;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { data: updatedEvent } = await supabaseAdmin
          .from('overload_events')
          .update(updates)
          .eq('id', existingEvent.id)
          .select('*')
          .single();

        if (updatedEvent) activeOverloadEvent = updatedEvent;
      }
    }
  } else {
    // Load is below 100%
    if (existingEvent) {
      // Vehicle load dropped below limit: close the overload event
      const endedAt = recordedAt;
      const wasCutoff = existingEvent.engine_cutoff_triggered;

      const { data: closedEvent } = await supabaseAdmin
        .from('overload_events')
        .update({
          ended_at: endedAt,
          cutoff_released_at: wasCutoff ? endedAt : null,
        })
        .eq('id', existingEvent.id)
        .select('*')
        .single();

      activeOverloadEvent = closedEvent;

      if (wasCutoff) {
        // Cutoff was released alert
        await supabaseAdmin.from('alerts').insert({
          vehicle_id: vehicle.id,
          event_id: existingEvent.id,
          type: 'cutoff',
          message: `ENGINE CUTOFF RESTORED: Vehicle ${vehicle.registration_no} load reduced to safe limit (${load_kg.toLocaleString()} kg / ${loadPercent}%). Ignition relay restored.`,
          is_read: false,
        });
        alertCreated = true;
      }
    }

    // Determine status: warning if 90-100%, otherwise active
    if (loadPercent >= WARNING_THRESHOLD_PERCENT) {
      vehicleStatus = 'warning';
    } else {
      vehicleStatus = 'active';
    }
  }

  // 5. Update vehicle status if changed
  if (vehicle.status !== vehicleStatus) {
    await supabaseAdmin
      .from('vehicles')
      .update({ status: vehicleStatus, updated_at: new Date().toISOString() })
      .eq('id', vehicle.id);
  }

  return {
    reading,
    load_percent: loadPercent,
    vehicle_status: vehicleStatus,
    overload_event: activeOverloadEvent,
    engine_cutoff_active: engineCutoffActive || (activeOverloadEvent?.engine_cutoff_triggered && !activeOverloadEvent?.cutoff_released_at),
    alert_created: alertCreated,
  };
}
