import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { hashDeviceKey } from '../utils/crypto';
import { Device, Vehicle } from '../types';

declare global {
  namespace Express {
    interface Request {
      device?: Device;
      vehicle?: Vehicle;
    }
  }
}

/**
 * Authenticates hardware device requests via the `x-device-key` header.
 * Hashes the incoming key and verifies against the stored hash in the `devices` table.
 */
export async function authenticateDevice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const deviceKey = req.headers['x-device-key'] as string;
  const deviceSerial =
    (req.body?.device_serial as string) ||
    (req.query?.device_serial as string) ||
    (req.headers['x-device-serial'] as string);

  if (!deviceKey) {
    res.status(401).json({
      success: false,
      error: 'Missing x-device-key header for device authentication',
    });
    return;
  }

  if (!deviceSerial) {
    res.status(400).json({
      success: false,
      error: 'Missing device_serial identifier in request body or query',
    });
    return;
  }

  try {
    // Hash the provided API key with the salt
    const hashedKey = hashDeviceKey(deviceKey);

    // Look up the device record
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('device_serial', deviceSerial.trim())
      .single();

    if (error || !device) {
      res.status(401).json({
        success: false,
        error: `Device '${deviceSerial}' not found or unrecognized`,
      });
      return;
    }

    if (!device.is_active) {
      res.status(403).json({
        success: false,
        error: `Device '${deviceSerial}' is deactivated`,
      });
      return;
    }

    // Compare hashed keys (constant-time safety via string equality)
    if (device.api_key_hash !== hashedKey) {
      res.status(401).json({
        success: false,
        error: 'Invalid device credentials. Key verification failed.',
      });
      return;
    }

    // Fetch the associated vehicle
    if (device.vehicle_id) {
      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', device.vehicle_id)
        .single();

      req.vehicle = vehicle || undefined;
    }

    req.device = device;
    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate device',
      details: err.message,
    });
  }
}
