import { getSupabase } from './supabase';
import type { Activity } from '@/types';

export async function fetchRoutesForUser(
  userId: string,
  year?: number,
  month?: number,
): Promise<Activity[]> {
  const supabase = getSupabase();

  let query = supabase
    .from('activities')
    .select('id, activity_date, distance_km, duration_seconds, route_data')
    .eq('user_id', userId)
    .not('route_data', 'is', null)
    .order('activity_date', { ascending: false });

  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    query = query.gte('activity_date', startDate).lt('activity_date', endDate);
  }

  const { data, error } = await query.limit(200);
  if (error) throw error;
  return (data || []) as Activity[];
}
