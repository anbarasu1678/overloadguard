import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/reports/export?from=&to=&format=csv
 * Generates downloadable CSV report of overload events.
 */
router.get('/export', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { from, to, format = 'csv' } = req.query;

    let query = supabaseAdmin
      .from('overload_events')
      .select('*, vehicles(registration_no, vehicle_type, permissible_load_kg, owner_id)')
      .order('started_at', { ascending: false });

    if (user.role === 'fleet_owner') {
      const { data: userVehicles } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('owner_id', user.id);
      const allowedIds = (userVehicles || []).map((v) => v.id);
      query = query.in('vehicle_id', allowedIds);
    }

    if (from) {
      query = query.gte('started_at', String(from));
    }
    if (to) {
      query = query.lte('started_at', String(to));
    }

    const { data: events, error } = await query;
    if (error) throw error;

    if (format === 'json') {
      res.status(200).json({ success: true, data: events });
      return;
    }

    // Format as CSV
    const headers = [
      'Event ID',
      'Vehicle Registration',
      'Vehicle Type',
      'Permissible Load (kg)',
      'Peak Load (kg)',
      'Peak Load (%)',
      'Started At',
      'Ended At',
      'Duration (min)',
      'Engine Cutoff Triggered',
      'Tamper Flag',
      'Status',
    ];

    const rows = (events || []).map((e) => {
      const reg = e.vehicles?.registration_no || 'N/A';
      const vtype = e.vehicles?.vehicle_type || 'N/A';
      const permissible = e.vehicles?.permissible_load_kg || 0;
      const started = e.started_at ? new Date(e.started_at).toISOString() : '';
      const ended = e.ended_at ? new Date(e.ended_at).toISOString() : 'Active (Ongoing)';
      const durationMin = e.ended_at
        ? Math.round((new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 60000)
        : Math.round((Date.now() - new Date(e.started_at).getTime()) / 60000);

      const status = e.ended_at ? 'Resolved' : 'Active Overload';

      return [
        `"${e.id}"`,
        `"${reg}"`,
        `"${vtype}"`,
        permissible,
        e.peak_load_kg,
        `${e.peak_percent}%`,
        `"${started}"`,
        `"${ended}"`,
        durationMin,
        e.engine_cutoff_triggered ? 'YES' : 'NO',
        e.tamper_flag ? 'YES' : 'NO',
        `"${status}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="overloadguard-report-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/analytics
 * Aggregated analytics for reporting charts:
 * - Events per vehicle
 * - Compliance trend by date
 */
router.get('/analytics', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { from, to } = req.query;

    const startDate = from ? String(from) : new Date(Date.now() - 30 * 86400000).toISOString();
    const endDate = to ? String(to) : new Date().toISOString();

    let query = supabaseAdmin
      .from('overload_events')
      .select('*, vehicles(id, registration_no, vehicle_type, permissible_load_kg, owner_id)')
      .gte('started_at', startDate)
      .lte('started_at', endDate);

    if (user.role === 'fleet_owner') {
      const { data: userVehicles } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('owner_id', user.id);
      const allowedIds = (userVehicles || []).map((v) => v.id);
      query = query.in('vehicle_id', allowedIds);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    // 1. Group events by vehicle registration
    const vehicleEventCounts: Record<string, { registration: string; count: number; peak_kg: number }> = {};
    for (const e of events || []) {
      const reg = e.vehicles?.registration_no || 'Unknown';
      if (!vehicleEventCounts[reg]) {
        vehicleEventCounts[reg] = { registration: reg, count: 0, peak_kg: 0 };
      }
      vehicleEventCounts[reg].count += 1;
      if (Number(e.peak_load_kg) > vehicleEventCounts[reg].peak_kg) {
        vehicleEventCounts[reg].peak_kg = Number(e.peak_load_kg);
      }
    }

    const eventsByVehicle = Object.values(vehicleEventCounts).sort((a, b) => b.count - a.count);

    // 2. Daily trend
    const dayBuckets: Record<string, { date: string; eventCount: number; cutoffCount: number }> = {};
    for (const e of events || []) {
      const day = new Date(e.started_at).toISOString().slice(0, 10);
      if (!dayBuckets[day]) {
        dayBuckets[day] = { date: day, eventCount: 0, cutoffCount: 0 };
      }
      dayBuckets[day].eventCount += 1;
      if (e.engine_cutoff_triggered) {
        dayBuckets[day].cutoffCount += 1;
      }
    }

    const dailyTrend = Object.values(dayBuckets).sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json({
      success: true,
      data: {
        events_by_vehicle: eventsByVehicle,
        daily_trend: dailyTrend,
        total_events_in_period: (events || []).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
