import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticateUser, requireRole } from '../middleware/auth';
import { generateDeviceKey, hashDeviceKey } from '../utils/crypto';

const router = Router();
router.use(authenticateUser);

const RegisterDeviceSchema = z.object({
  device_serial: z.string().min(3).max(50),
  vehicle_id: z.string().uuid().optional(),
  firmware_version: z.string().default('v1.0.0'),
});

const UpdateDeviceSchema = z.object({
  vehicle_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  firmware_version: z.string().optional(),
});

/**
 * GET /api/devices
 * List devices (Admin and Enforcement can see all, Fleet owner sees assigned to their vehicles)
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    let query = supabaseAdmin
      .from('devices')
      .select('id, vehicle_id, device_serial, firmware_version, last_seen_at, is_active, created_at, vehicles(registration_no, vehicle_type, owner_id)')
      .order('created_at', { ascending: false });

    if (user.role === 'fleet_owner') {
      const { data: userVehicles } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('owner_id', user.id);
      const allowedIds = (userVehicles || []).map((v) => v.id);
      if (allowedIds.length === 0) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      query = query.in('vehicle_id', allowedIds);
    }

    const { data: devices, error } = await query;
    if (error) throw error;

    res.status(200).json({
      success: true,
      data: devices || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/devices
 * (Admin only): Registers a new hardware device.
 * Generates and returns its raw API key ONCE. Stores only the hashed key in the database.
 */
router.post('/', requireRole(['admin']), async (req: Request, res: Response, next) => {
  try {
    const validated = RegisterDeviceSchema.parse(req.body);

    // Generate unique API key for this device
    const rawApiKey = generateDeviceKey();
    const hashedKey = hashDeviceKey(rawApiKey);

    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .insert({
        device_serial: validated.device_serial.trim(),
        vehicle_id: validated.vehicle_id || null,
        api_key_hash: hashedKey,
        firmware_version: validated.firmware_version,
        is_active: true,
      })
      .select('id, device_serial, vehicle_id, firmware_version, is_active, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: {
        ...device,
        api_key: rawApiKey, // Returned ONCE upon registration for flashing to ESP32 firmware
      },
      warning: 'Store this API key securely. It cannot be retrieved again from the system.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/devices/:id
 * (Admin only): Update vehicle assignment or active status.
 */
router.patch('/:id', requireRole(['admin']), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const validated = UpdateDeviceSchema.parse(req.body);

    const { data: updated, error } = await supabaseAdmin
      .from('devices')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, device_serial, vehicle_id, firmware_version, is_active, last_seen_at')
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/devices/:id
 * (Admin only): Delete device record.
 */
router.delete('/:id', requireRole(['admin']), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('devices').delete().eq('id', id);
    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Device deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
