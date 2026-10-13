import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateDevice } from '../middleware/deviceAuth';
import { deviceRateLimiter } from '../middleware/rateLimiter';
import { processDeviceReading, GRACE_PERIOD_SECONDS } from '../services/readingProcessor';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// Zod schemas for validation
const ReadingSchema = z.object({
  device_serial: z.string().min(1, 'Device serial is required'),
  load_kg: z.number().positive('Load must be greater than 0 kg'),
  speed_kmph: z.number().min(0, 'Speed must be non-negative').default(0),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

const EventReportSchema = z.object({
  device_serial: z.string().min(1, 'Device serial is required'),
  event_type: z.enum(['cutoff', 'tamper', 'normal']),
  message: z.string().optional(),
  tamper_flag: z.boolean().optional().default(false),
});

/**
 * POST /api/device/readings
 * Primary ingestion endpoint for ESP32 load cell readings.
 */
router.post(
  '/readings',
  deviceRateLimiter,
  authenticateDevice,
  async (req: Request, res: Response, next) => {
    try {
      const validated = ReadingSchema.parse(req.body);

      if (!req.device || !req.vehicle) {
        res.status(400).json({
          success: false,
          error: 'This device is not associated with an active vehicle',
        });
        return;
      }

      const result = await processDeviceReading({
        device: req.device,
        vehicle: req.vehicle,
        load_kg: validated.load_kg,
        speed_kmph: validated.speed_kmph,
        timestamp: validated.timestamp,
      });

      res.status(200).json({
        success: true,
        data: {
          reading_id: result.reading.id,
          registration_no: req.vehicle.registration_no,
          load_kg: validated.load_kg,
          load_percent: result.load_percent,
          vehicle_status: result.vehicle_status,
          engine_cutoff_command: result.engine_cutoff_active,
          grace_period_seconds: GRACE_PERIOD_SECONDS,
          overload_event_id: result.overload_event?.id || null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/device/events
 * Ingest explicit cutoff or tamper notifications from the ESP32 firmware.
 */
router.post(
  '/events',
  deviceRateLimiter,
  authenticateDevice,
  async (req: Request, res: Response, next) => {
    try {
      const validated = EventReportSchema.parse(req.body);

      if (!req.device || !req.vehicle) {
        res.status(400).json({
          success: false,
          error: 'Device not associated with any vehicle',
        });
        return;
      }

      const vehicle = req.vehicle;
      const device = req.device;

      if (validated.event_type === 'tamper' || validated.tamper_flag) {
        // Record tamper alert and flag
        const alertMsg = validated.message || `TAMPER ALERT: Sensor disruption reported on vehicle ${vehicle.registration_no} (Device: ${device.device_serial})`;
        
        await supabaseAdmin.from('alerts').insert({
          vehicle_id: vehicle.id,
          type: 'tamper',
          message: alertMsg,
          is_read: false,
        });

        // If open event exists, set tamper_flag
        await supabaseAdmin
          .from('overload_events')
          .update({ tamper_flag: true })
          .eq('vehicle_id', vehicle.id)
          .is('ended_at', null);
      } else if (validated.event_type === 'cutoff') {
        await supabaseAdmin.from('alerts').insert({
          vehicle_id: vehicle.id,
          type: 'cutoff',
          message: validated.message || `HARDWARE CUTOFF: ESP32 executed engine relay cutoff for ${vehicle.registration_no}`,
          is_read: false,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Event recorded successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/device/config
 * Returns permissible load and grace period for the calling device.
 */
router.get(
  '/config',
  authenticateDevice,
  async (req: Request, res: Response, next) => {
    try {
      if (!req.device || !req.vehicle) {
        res.status(400).json({
          success: false,
          error: 'Device not linked with a vehicle',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          device_serial: req.device.device_serial,
          firmware_version: req.device.firmware_version,
          registration_no: req.vehicle.registration_no,
          permissible_load_kg: Number(req.vehicle.permissible_load_kg),
          unladen_weight_kg: Number(req.vehicle.unladen_weight_kg),
          grace_period_seconds: GRACE_PERIOD_SECONDS,
          warning_threshold_percent: 90.0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
