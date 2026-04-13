import { getSupabase } from './supabase';

export interface MemberProgress {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  distance_km: number;
  goal_km: number;
  progress: number; // 0-100
}

// 클럽 멤버들의 이번 달 목표 진행률
export async function fetchClubMemberProgress(clubId: string, year: number, month: number): Promise<MemberProgress[]> {
  const supabase = getSupabase();

  // 클럽 멤버 조회
  const { data: members } = await supabase
    .from('club_members')
    .select('user_id, profiles(display_name, avatar_url)')
    .eq('club_id', clubId);

  if (!members?.length) return [];

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const results: MemberProgress[] = [];

  for (const m of members) {
    const profile = m.profiles as unknown as { display_name: string; avatar_url: string | null };

    // 이번 달 거리
    const { data: activities } = await supabase
      .from('activities')
      .select('distance_km')
      .eq('user_id', m.user_id)
      .gte('activity_date', startDate)
      .lt('activity_date', endDate);

    const distance = (activities || []).reduce((sum, a) => sum + Number(a.distance_km), 0);

    // 목표
    const { data: goal } = await supabase
      .from('monthly_goals')
      .select('goal_km')
      .eq('user_id', m.user_id)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    const goalKm = goal?.goal_km || 0;
    const progress = goalKm > 0 ? Math.min((distance / goalKm) * 100, 100) : 0;

    results.push({
      user_id: m.user_id,
      display_name: profile?.display_name || '러너',
      avatar_url: profile?.avatar_url || null,
      distance_km: Math.round(distance * 100) / 100,
      goal_km: goalKm,
      progress,
    });
  }

  // 진행률 높은 순 정렬
  return results.sort((a, b) => b.progress - a.progress);
}

export interface PeriodDistance {
  label: string;
  distance: number;
  prevDistance?: number; // 전년 동기 비교
}

// 기간별 거리 데이터
export async function fetchDistanceByPeriod(
  userId: string,
  mode: 'weekly' | 'monthly' | 'quarterly' | 'half' | 'yearly',
  year: number,
): Promise<PeriodDistance[]> {
  const supabase = getSupabase();

  // 올해 + 작년 데이터 한 번에 가져오기
  const { data: activities } = await supabase
    .from('activities')
    .select('activity_date, distance_km')
    .eq('user_id', userId)
    .gte('activity_date', `${year - 1}-01-01`)
    .lt('activity_date', `${year + 1}-01-01`)
    .order('activity_date');

  if (!activities) return [];

  const thisYear = activities.filter(a => a.activity_date.startsWith(String(year)));
  const lastYear = activities.filter(a => a.activity_date.startsWith(String(year - 1)));

  const sumByRange = (data: typeof activities, start: string, end: string) =>
    data.filter(a => a.activity_date >= start && a.activity_date < end)
      .reduce((s, a) => s + Number(a.distance_km), 0);

  const results: PeriodDistance[] = [];

  if (mode === 'weekly') {
    // 올해의 각 주 (최근 12주)
    const now = new Date();
    for (let w = 11; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const start = weekStart.toISOString().split('T')[0];
      const end = new Date(weekEnd.getTime() + 86400000).toISOString().split('T')[0];

      results.push({
        label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        distance: Math.round(sumByRange(activities, start, end) * 10) / 10,
      });
    }
  } else if (mode === 'monthly') {
    for (let m = 1; m <= 12; m++) {
      const start = `${year}-${String(m).padStart(2, '0')}-01`;
      const endM = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`;
      const prevStart = `${year - 1}-${String(m).padStart(2, '0')}-01`;
      const prevEnd = m === 12 ? `${year}-01-01` : `${year - 1}-${String(m + 1).padStart(2, '0')}-01`;

      results.push({
        label: `${m}월`,
        distance: Math.round(sumByRange(thisYear, start, endM) * 10) / 10,
        prevDistance: Math.round(sumByRange(lastYear, prevStart, prevEnd) * 10) / 10,
      });
    }
  } else if (mode === 'quarterly') {
    for (let q = 0; q < 4; q++) {
      const start = `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`;
      const end = q === 3 ? `${year + 1}-01-01` : `${year}-${String((q + 1) * 3 + 1).padStart(2, '0')}-01`;
      const prevStart = `${year - 1}-${String(q * 3 + 1).padStart(2, '0')}-01`;
      const prevEnd = q === 3 ? `${year}-01-01` : `${year - 1}-${String((q + 1) * 3 + 1).padStart(2, '0')}-01`;

      results.push({
        label: `Q${q + 1}`,
        distance: Math.round(sumByRange(thisYear, start, end) * 10) / 10,
        prevDistance: Math.round(sumByRange(lastYear, prevStart, prevEnd) * 10) / 10,
      });
    }
  } else if (mode === 'half') {
    for (let h = 0; h < 2; h++) {
      const start = `${year}-${String(h * 6 + 1).padStart(2, '0')}-01`;
      const end = h === 1 ? `${year + 1}-01-01` : `${year}-07-01`;
      const prevStart = `${year - 1}-${String(h * 6 + 1).padStart(2, '0')}-01`;
      const prevEnd = h === 1 ? `${year}-01-01` : `${year - 1}-07-01`;

      results.push({
        label: h === 0 ? '상반기' : '하반기',
        distance: Math.round(sumByRange(thisYear, start, end) * 10) / 10,
        prevDistance: Math.round(sumByRange(lastYear, prevStart, prevEnd) * 10) / 10,
      });
    }
  } else {
    // yearly — 최근 5년
    for (let y = year - 4; y <= year; y++) {
      const yActivities = activities.filter(a => a.activity_date.startsWith(String(y)));
      results.push({
        label: `${y}`,
        distance: Math.round(yActivities.reduce((s, a) => s + Number(a.distance_km), 0) * 10) / 10,
      });
    }
  }

  return results;
}
