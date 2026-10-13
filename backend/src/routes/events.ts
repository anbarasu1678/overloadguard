import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/events
 * Query overload events with filtering: vehicle_id, from, to, status ('active' | 'resolved' | 'all')
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { vehicle_id, from, to, status, cutoff_only, tamper_only, limit = '100' } = req.query;

    let query = supabaseAdmin
      .from('overload_events')
      .select('*, vehicles(id, registration_no, vehicle_type, permissible_load_kg, owner_id)')
      .order('started_at', { ascending: false })
      .limit(Math.min(Number(limit) || 100, 500));

    // Role filtering: fleet owners only see their vehicles' events
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

    if (vehicle_id) {
      query = query.eq('vehicle_id', String(vehicle_id));
    }

    if (from) {
      query = query.gte('started_at', String(from));
    }

    if (to) {
      query = query.lte('started_at', String(to));
    }

    if (status === 'active') {
      query = query.is('ended_at', null);
    } else if (status === 'resolved') {
      query = query.not('ended_at', 'is', null);
    }

    if (cutoff_only === 'true') {
      query = query.eq('engine_cutoff_triggered', true);
    }

    if (tamper_only === 'true') {
      query = query.eq('tamper_flag', true);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    res.status(200).json({
      success: true,
      data: events || [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
