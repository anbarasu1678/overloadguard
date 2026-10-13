import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/stats/summary
 * Returns KPI metrics:
 * - total vehicles
 * - active overloads now
 * - events this week
 * - average load %
 * - compliance rate
 */
router.get('/summary', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;

    // 1. Vehicles count and status
    let vehicleQuery = supabaseAdmin.from('vehicles').select('id, status, permissible_load_kg');
    if (user.role === 'fleet_owner') {
      vehicleQuery = vehicleQuery.eq('owner_id', user.id);
    }
    const { data: vehicles, error: vErr } = await vehicleQuery;
    if (vErr) throw vErr;

    const totalVehicles = vehicles?.length || 0;
    const vehicleIds = (vehicles || []).map((v) => v.id);

    if (totalVehicles === 0) {
      res.status(200).json({
        success: true,
        data: {
          total_vehicles: 0,
          active_overloads: 0,
          events_this_week: 0,
          average_load_percent: 0,
          compliance_rate: 100,
        },
      });
      return;
    }

    // 2. Active overloads now (open events where ended_at IS NULL)
    let openEventsQuery = supabaseAdmin
      .from('overload_events')
      .select('id, vehicle_id')
      .is('ended_at', null)
      .in('vehicle_id', vehicleIds);

    const { data: openEvents } = await openEventsQuery;
    const activeOverloads = openEvents?.length || 0;

    // 3. Events this week (started_at >= 7 days ago)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let weekEventsQuery = supabaseAdmin
      .from('overload_events')
      .select('id')
      .gte('started_at', sevenDaysAgo)
      .in('vehicle_id', vehicleIds);

    const { data: weekEvents } = await weekEventsQuery;
    const eventsThisWeek = weekEvents?.length || 0;

    // 4. Average load percent from recent readings across these vehicles
    let avgLoadPercent = 0;
    if (vehicleIds.length > 0) {
      const { data: recentReadings } = await supabaseAdmin
        .from('load_readings')
        .select('vehicle_id, load_percent, recorded_at')
        .in('vehicle_id', vehicleIds)
        .order('recorded_at', { ascending: false })
        .limit(vehicleIds.length * 5);

      if (recentReadings && recentReadings.length > 0) {
        // Average the latest reading per vehicle
        const latestPerVehicle: Record<string, number> = {};
        for (const r of recentReadings) {
          if (latestPerVehicle[r.vehicle_id] === undefined) {
            latestPerVehicle[r.vehicle_id] = Number(r.load_percent);
          }
        }
        const values = Object.values(latestPerVehicle);
        if (values.length > 0) {
          const sum = values.reduce((acc, curr) => acc + curr, 0);
          avgLoadPercent = Number((sum / values.length).toFixed(1));
        }
      }
    }

    // 5. Compliance rate %
    const nonCompliant = Math.min(activeOverloads, totalVehicles);
    const complianceRate = Number((((totalVehicles - nonCompliant) / totalVehicles) * 100).toFixed(1));

    res.status(200).json({
      success: true,
      data: {
        total_vehicles: totalVehicles,
        active_overloads: activeOverloads,
        events_this_week: eventsThisWeek,
        average_load_percent: avgLoadPercent,
        compliance_rate: complianceRate,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
