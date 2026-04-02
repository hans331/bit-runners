import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  fetchStravaActivities,
  getStravaConnection,
  type StravaConnection,
  type StravaActivity,
} from '@/lib/strava';

/**
 * POST /api/strava/sync
 * Body: { member_id: string } — sync a single member
 * or no body — sync all connected members
 */
export async function POST(request: NextRequest) {
  try {
    let connections: StravaConnection[] = [];

    const body = await request.json().catch(() => null);
    const memberId = body?.member_id;

    if (memberId) {
      // Sync single member
      const conn = await getStravaConnection(memberId);
      if (!conn) {
        return Response.json(
          { error: 'Member has no Strava connection' },
          { status: 404 }
        );
      }
      connections = [conn];
    } else {
      // Sync all connected members
      const { data, error } = await supabase
        .from('strava_connections')
        .select('*');
      if (error) throw error;
      connections = (data || []) as StravaConnection[];
    }

    const results: { member_id: string; synced: number; errors: string[] }[] = [];

    for (const conn of connections) {
      const memberResult = { member_id: conn.member_id, synced: 0, errors: [] as string[] };

      try {
        // Get the latest running_log date for this member to avoid re-fetching everything
        const { data: latestLog } = await supabase
          .from('running_logs')
          .select('run_date')
          .eq('member_id', conn.member_id)
          .not('strava_activity_id', 'is', null)
          .order('run_date', { ascending: false })
          .limit(1)
          .single();

        // Fetch activities from 90 days ago if no previous sync, or from last synced date
        let afterEpoch: number | undefined;
        if (latestLog) {
          // Fetch from 7 days before the last synced log to catch any edge cases
          const d = new Date(latestLog.run_date);
          d.setDate(d.getDate() - 7);
          afterEpoch = Math.floor(d.getTime() / 1000);
        } else {
          // First sync: fetch last 90 days
          const d = new Date();
          d.setDate(d.getDate() - 90);
          afterEpoch = Math.floor(d.getTime() / 1000);
        }

        const activities = await fetchStravaActivities(conn, afterEpoch);

        for (const activity of activities) {
          try {
            await insertActivityAsRunningLog(conn.member_id, activity);
            memberResult.synced++;
          } catch (err) {
            // Duplicate — strava_activity_id unique constraint; skip silently
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
              continue;
            }
            memberResult.errors.push(`Activity ${activity.id}: ${msg}`);
          }
        }
      } catch (err) {
        memberResult.errors.push(
          err instanceof Error ? err.message : String(err)
        );
      }

      results.push(memberResult);
    }

    return Response.json({ results });
  } catch (err) {
    console.error('Strava sync error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

async function insertActivityAsRunningLog(memberId: string, activity: StravaActivity) {
  // Extract date from start_date_local (format: "2024-01-15T07:30:00Z")
  const runDate = activity.start_date_local.split('T')[0];
  const distanceKm = Math.round((activity.distance / 1000) * 100) / 100;
  const durationMinutes = Math.round(activity.moving_time / 60);

  // Check if this strava_activity_id already exists
  const { data: existing } = await supabase
    .from('running_logs')
    .select('id')
    .eq('strava_activity_id', activity.id)
    .single();

  if (existing) return; // Already synced

  // Insert the running log
  const { error } = await supabase.from('running_logs').insert({
    member_id: memberId,
    run_date: runDate,
    distance_km: distanceKm,
    duration_minutes: durationMinutes,
    memo: `[Strava] ${activity.name}`,
    strava_activity_id: activity.id,
  });

  if (error) throw error;

  // Update monthly_records (same logic as addRunningLog)
  const date = new Date(runDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const { data: existingRecord } = await supabase
    .from('monthly_records')
    .select('*')
    .eq('member_id', memberId)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (existingRecord) {
    // Recalculate total from all logs for that month
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const { data: logs } = await supabase
      .from('running_logs')
      .select('distance_km')
      .eq('member_id', memberId)
      .gte('run_date', monthStart)
      .lt('run_date', nextMonth);

    const totalFromLogs = (logs || []).reduce(
      (sum, l) => sum + Number(l.distance_km),
      0
    );
    const newAchieved = Math.max(Number(existingRecord.achieved_km), totalFromLogs);

    await supabase
      .from('monthly_records')
      .update({ achieved_km: newAchieved })
      .eq('id', existingRecord.id);
  } else {
    await supabase.from('monthly_records').insert({
      member_id: memberId,
      year,
      month,
      goal_km: 0,
      achieved_km: distanceKm,
    });
  }
}
