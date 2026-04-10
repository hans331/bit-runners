import { getSupabase } from './supabase';

export interface SyncResult {
  success: boolean;
  message: string;
  synced: number;
}

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).Capacitor?.isNativePlatform?.() ?? false;
}

export function getPlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((window as any).Capacitor?.getPlatform?.() ?? 'web') as 'android' | 'ios' | 'web';
}

// HealthKit (iOS) 동기화 — @capgo/capacitor-health 사용
async function syncFromHealthKit(memberId: string): Promise<SyncResult> {
  if (getPlatform() !== 'ios') {
    return { success: false, message: 'iOS가 아닙니다', synced: 0 };
  }

  try {
    const { Health } = await import('@capgo/capacitor-health');

    const { available } = await Health.isAvailable();
    if (!available) {
      return { success: false, message: '이 기기에서 Apple Health를 사용할 수 없습니다.', synced: 0 };
    }

    await Health.requestAuthorization({
      read: ['workouts', 'distance'],
      write: [],
    });

    const startDate = new Date('2025-01-01T00:00:00').toISOString();
    const endDate = new Date().toISOString();

    // 러닝 워크아웃 조회 (최근 100건)
    const { workouts } = await Health.queryWorkouts({
      workoutType: 'running',
      startDate,
      endDate,
      limit: 100,
      ascending: false,
    });

    if (!workouts || workouts.length === 0) {
      return await syncViaDistance(memberId, startDate, endDate);
    }

    let syncedCount = 0;
    const supabase = getSupabase();

    for (const workout of workouts) {
      const runDate = workout.startDate.split('T')[0];
      const distanceKm = workout.totalDistance ? workout.totalDistance / 1000 : 0;
      const durationMinutes = workout.duration ? Math.round(workout.duration / 60) : null;

      if (distanceKm < 0.1) continue;

      const { data: existing } = await supabase
        .from('running_logs')
        .select('id, distance_km')
        .eq('member_id', memberId)
        .eq('run_date', runDate);

      const isDuplicate = (existing || []).some(
        (e) => Math.abs(Number(e.distance_km) - distanceKm) < 0.1
      );
      if (isDuplicate) continue;

      const { error } = await supabase.from('running_logs').insert({
        member_id: memberId,
        run_date: runDate,
        distance_km: Math.round(distanceKm * 100) / 100,
        duration_minutes: durationMinutes && durationMinutes > 0 ? durationMinutes : null,
        memo: 'Apple Health 자동 동기화',
      });

      if (!error) {
        syncedCount++;
        await updateMonthlyRecord(memberId, runDate, supabase);
      }
    }

    return {
      success: true,
      message: syncedCount > 0
        ? `${syncedCount}건의 러닝 기록을 가져왔습니다!`
        : '새로운 기록이 없습니다 (이미 동기화됨).',
      synced: syncedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return { success: false, message: `동기화 실패: ${message}`, synced: 0 };
  }
}

// 거리 데이터로 대체 동기화
async function syncViaDistance(
  memberId: string,
  startDate: string,
  endDate: string,
): Promise<SyncResult> {
  try {
    const { Health } = await import('@capgo/capacitor-health');

    const { samples } = await Health.readSamples({
      dataType: 'distance',
      startDate,
      endDate,
      limit: 10000,
    });

    if (!samples || samples.length === 0) {
      return { success: true, message: 'Apple Health에 러닝 기록이 없습니다.', synced: 0 };
    }

    // 일별 합산 (value는 meter 단위)
    const dailyDistance: Record<string, number> = {};
    for (const sample of samples) {
      const date = sample.startDate.split('T')[0];
      const distanceKm = sample.value / 1000;
      dailyDistance[date] = (dailyDistance[date] || 0) + distanceKm;
    }

    let syncedCount = 0;
    const supabase = getSupabase();

    for (const [runDate, distanceKm] of Object.entries(dailyDistance)) {
      if (distanceKm < 0.5) continue;

      const { data: existing } = await supabase
        .from('running_logs')
        .select('id, distance_km')
        .eq('member_id', memberId)
        .eq('run_date', runDate);

      const isDuplicate = (existing || []).some(
        (e) => Math.abs(Number(e.distance_km) - distanceKm) < 0.5
      );
      if (isDuplicate) continue;

      const { error } = await supabase.from('running_logs').insert({
        member_id: memberId,
        run_date: runDate,
        distance_km: Math.round(distanceKm * 100) / 100,
        duration_minutes: null,
        memo: 'Apple Health 자동 동기화 (일별 합산)',
      });

      if (!error) {
        syncedCount++;
        await updateMonthlyRecord(memberId, runDate, supabase);
      }
    }

    return {
      success: true,
      message: syncedCount > 0
        ? `${syncedCount}건의 러닝 기록을 가져왔습니다!`
        : '새로운 기록이 없습니다 (이미 동기화됨).',
      synced: syncedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return { success: false, message: `거리 데이터 동기화 실패: ${message}`, synced: 0 };
  }
}

// monthly_records 업데이트
async function updateMonthlyRecord(
  memberId: string,
  runDate: string,
  supabase: ReturnType<typeof getSupabase>
) {
  const date = new Date(runDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const { data: existing } = await supabase
    .from('monthly_records')
    .select('*')
    .eq('member_id', memberId)
    .eq('year', year)
    .eq('month', month)
    .single();

  const { data: logs } = await supabase
    .from('running_logs')
    .select('distance_km')
    .eq('member_id', memberId)
    .gte('run_date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lt('run_date', month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`);

  const totalFromLogs = (logs || []).reduce((sum, l) => sum + Number(l.distance_km), 0);

  if (existing) {
    await supabase
      .from('monthly_records')
      .update({ achieved_km: totalFromLogs })
      .eq('id', existing.id);
  } else {
    await supabase.from('monthly_records').insert({
      member_id: memberId, year, month, goal_km: 0, achieved_km: totalFromLogs,
    });
  }
}

// 메인 동기화 함수
export async function syncHealthData(memberId: string): Promise<SyncResult> {
  if (!isNativeApp()) {
    return {
      success: false,
      message: '건강 데이터 동기화는 BIT Runners 앱에서만 사용할 수 있습니다.',
      synced: 0,
    };
  }

  const platform = getPlatform();
  if (platform === 'ios') {
    return syncFromHealthKit(memberId);
  }

  return { success: false, message: '지원하지 않는 플랫폼입니다.', synced: 0 };
}
