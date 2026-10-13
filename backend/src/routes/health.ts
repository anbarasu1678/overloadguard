import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * GET /api/health
 * Public health check and service readiness endpoint.
 */
router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
    if (!error) {
      dbStatus = 'connected';
    } else {
      dbStatus = `error: ${error.message}`;
    }
  } catch (err: any) {
    dbStatus = `unreachable: ${err.message}`;
  }

  res.status(200).json({
    status: 'ok',
    service: 'OverloadGuard API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: dbStatus,
    location_tracking_enabled: false, // Explicit indicator confirming privacy spec
  });
});

export default router;
