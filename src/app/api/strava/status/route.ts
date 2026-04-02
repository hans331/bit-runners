import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/strava/status?member_id=xxx
 * Returns whether the member has a Strava connection
 */
export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('member_id');

  if (!memberId) {
    return Response.json({ error: 'member_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('strava_connections')
    .select('id, strava_athlete_id, created_at')
    .eq('member_id', memberId)
    .single();

  if (error || !data) {
    return Response.json({ connected: false });
  }

  return Response.json({
    connected: true,
    strava_athlete_id: data.strava_athlete_id,
    connected_at: data.created_at,
  });
}
