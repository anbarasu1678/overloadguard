import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticateUser, requireRole } from '../middleware/auth';

const router = Router();

// Zod schemas
const VehicleCreateSchema = z.object({
  registration_no: z.string().min(3).max(20).toUpperCase(),
  vehicle_type: z.string().min(2),
  axle_count: z.number().int().min(2).max(12).default(2),
  unladen_weight_kg: z.number().positive(),
  permissible_load_kg: z.number().positive(),
  owner_id: z.string().uuid().optional(),
});

const VehicleUpdateSchema = VehicleCreateSchema.partial();

// All vehicle routes require user authentication
router.use(authenticateUser);

/**
 * GET /api/vehicles
 * Returns list of vehicles, filtered by ownership for fleet owners.
 * Enriched with associated active device and latest load reading.
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    let query = supabaseAdmin
      .from('vehicles')
      .select('*, devices(*), profiles(full_name, organization)')
      .order('created_at', { ascending: false });

    // Enforce role-based ownership
    if (user.role === 'fleet_owner') {
      query = query.eq('owner_id', user.id);
    }

    const { data: vehicles, error } = await query;
    if (error) throw error;

    // Fetch the latest reading for each vehicle
    const vehicleIds = (vehicles || []).map((v) => v.id);
    let latestReadingsMap: Record<string, any> = {};

    if (vehicleIds.length > 0) {
      // In PostgreSQL/Supabase, we can fetch latest reading per vehicle
      const { data: readings } = await supabaseAdmin
        .from('load_readings')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .order('recorded_at', { ascending: false });

      if (readings) {
        for (const r of readings) {
          if (!latestReadingsMap[r.vehicle_id]) {
            latestReadingsMap[r.vehicle_id] = r;
          }
        }
      }
    }

    const enrichedVehicles = (vehicles || []).map((v) => ({
      ...v,
      device: v.devices && v.devices.length > 0 ? v.devices[0] : null,
      latest_reading: latestReadingsMap[v.id] || null,
    }));

    res.status(200).json({
      success: true,
      data: enrichedVehicles,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vehicles/:id
 * Retrieve a single vehicle by ID.
 */
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .select('*, devices(*), profiles(full_name, organization)')
      .eq('id', id)
      .single();

    if (error || !vehicle) {
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    // Role check
    if (user.role === 'fleet_owner' && vehicle.owner_id !== user.id) {
      res.status(403).json({ success: false, error: 'Access denied to this vehicle' });
      return;
    }

    // Get latest reading
    const { data: latestReading } = await supabaseAdmin
      .from('load_readings')
      .select('*')
      .eq('vehicle_id', id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    res.status(200).json({
      success: true,
      data: {
        ...vehicle,
        device: vehicle.devices && vehicle.devices.length > 0 ? vehicle.devices[0] : null,
        latest_reading: latestReading || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/vehicles
 * Create a new vehicle.
 */
router.post('/', requireRole(['admin', 'fleet_owner']), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const validated = VehicleCreateSchema.parse(req.body);

    const ownerId = user.role === 'admin' ? (validated.owner_id || user.id) : user.id;

    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .insert({
        registration_no: validated.registration_no,
        vehicle_type: validated.vehicle_type,
        axle_count: validated.axle_count,
        unladen_weight_kg: validated.unladen_weight_kg,
        permissible_load_kg: validated.permissible_load_kg,
        owner_id: ownerId,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: vehicle,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/vehicles/:id
 * Update an existing vehicle.
 */
router.patch('/:id', requireRole(['admin', 'fleet_owner']), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const validated = VehicleUpdateSchema.parse(req.body);

    // If fleet owner, verify ownership
    if (user.role === 'fleet_owner') {
      const { data: existing } = await supabaseAdmin
        .from('vehicles')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== user.id) {
        res.status(403).json({ success: false, error: 'You can only update your own vehicles' });
        return;
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('vehicles')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
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
 * DELETE /api/vehicles/:id
 * Delete a vehicle.
 */
router.delete('/:id', requireRole(['admin']), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('vehicles').delete().eq('id', id);
    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vehicles/:id/readings
 * Historical telemetry readings for a vehicle.
 */
router.get('/:id/readings', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { from, to, limit = '100' } = req.query;

    // Check ownership if fleet_owner
    if (user.role === 'fleet_owner') {
      const { data: v } = await supabaseAdmin.from('vehicles').select('owner_id').eq('id', id).single();
      if (!v || v.owner_id !== user.id) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
    }

    let query = supabaseAdmin
      .from('load_readings')
      .select('*')
      .eq('vehicle_id', id)
      .order('recorded_at', { ascending: true })
      .limit(Math.min(Number(limit) || 100, 1000));

    if (from) {
      query = query.gte('recorded_at', String(from));
    }
    if (to) {
      query = query.lte('recorded_at', String(to));
    }

    const { data: readings, error } = await query;
    if (error) throw error;

    res.status(200).json({
      success: true,
      data: readings || [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
