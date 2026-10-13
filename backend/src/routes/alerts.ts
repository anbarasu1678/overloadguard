import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/alerts
 * Fetch alerts feed, optionally filtered by read/unread status.
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { is_read, limit = '100' } = req.query;

    let query = supabaseAdmin
      .from('alerts')
      .select('*, vehicles(id, registration_no, vehicle_type, owner_id)')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 100, 200));

    // Role filtering
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

    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }

    const { data: alerts, error } = await query;
    if (error) throw error;

    res.status(200).json({
      success: true,
      data: alerts || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/alerts/:id/read
 * Mark a single alert as read.
 */
router.patch('/:id/read', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;

    const { data: updated, error } = await supabaseAdmin
      .from('alerts')
      .update({ is_read: true })
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
 * PATCH /api/alerts/mark-all/read
 * Mark all alerts as read for the user's vehicles.
 */
router.patch('/mark-all/read', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    let query = supabaseAdmin.from('alerts').update({ is_read: true });

    if (user.role === 'fleet_owner') {
      const { data: userVehicles } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('owner_id', user.id);
      const allowedIds = (userVehicles || []).map((v) => v.id);
      query = query.in('vehicle_id', allowedIds);
    } else {
      query = query.eq('is_read', false);
    }

    const { error } = await query;
    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'All alerts marked as read',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
