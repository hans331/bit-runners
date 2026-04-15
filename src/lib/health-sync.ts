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

// Apple Health 권한 요청만 수행 (빠르게 완료)
export async function connectHealthKit(): Promise<SyncResult> {
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

    return { success: true, message: 'Apple Health 연결 완료! 러닝 기록을 가져오는 중...', synced: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return { success: false, message: `연결 실패: ${message}`, synced: 0 };
  }
}

// 데이터 동기화 (백그라운드) — activities 테이블에 저장
async function syncFromHealthKit(userId: string): Promise<SyncResult> {
  try {
    const { Health } = await import('@capgo/capacitor-health');

    // 3년치 데이터 가져오기
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const startDate = threeYearsAgo.toISOString();
    const endDate = new Date().toISOString();

    const { workouts } = await Health.queryWorkouts({
      workoutType: 'running',
      startDate,
      endDate,
      limit: 5000,
      ascending: false,
    });

    if (!workouts || workouts.length === 0) {
      return await syncViaDistance(userId, startDate, endDate);
    }

    let syncedCount = 0;
    const supabase = getSupabase();

    for (const workout of workouts) {
      const activityDate = workout.startDate.split('T')[0];
      const distanceKm = workout.totalDistance ? workout.totalDistance / 1000 : 0;
      const durationSeconds = workout.duration ? Math.round(workout.duration) : null;
      const paceAvg = durationSeconds && distanceKm > 0
        ? Math.round(durationSeconds / distanceKm)
        : null;

      if (distanceKm < 0.1) continue;

      // 중복 확인: 같은 날짜 + 유사한 거리
      const { data: existing } = await supabase
        .from('activities')
        .select('id, distance_km')
        .eq('user_id', userId)
        .eq('activity_date', activityDate)
        .eq('source', 'health_kit');

      const isDuplicate = (existing || []).some(
        (e) => Math.abs(Number(e.distance_km) - distanceKm) < 0.1
      );
      if (isDuplicate) continue;

      const { error } = await supabase.from('activities').insert({
        user_id: userId,
        activity_date: activityDate,
        distance_km: Math.round(distanceKm * 100) / 100,
        duration_seconds: durationSeconds && durationSeconds > 0 ? durationSeconds : null,
        pace_avg_sec_per_km: paceAvg,
        source: 'health_kit',
        memo: 'Apple Health 자동 동기화',
        started_at: workout.startDate,
        ended_at: workout.endDate || null,
      });

      if (!error) {
        syncedCount++;
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
  userId: string,
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

    for (const [activityDate, distanceKm] of Object.entries(dailyDistance)) {
      if (distanceKm < 0.5) continue;

      const { data: existing } = await supabase
        .from('activities')
        .select('id, distance_km')
        .eq('user_id', userId)
        .eq('activity_date', activityDate)
        .eq('source', 'health_kit');

      const isDuplicate = (existing || []).some(
        (e) => Math.abs(Number(e.distance_km) - distanceKm) < 0.5
      );
      if (isDuplicate) continue;

      const { error } = await supabase.from('activities').insert({
        user_id: userId,
        activity_date: activityDate,
        distance_km: Math.round(distanceKm * 100) / 100,
        source: 'health_kit',
        memo: 'Apple Health 자동 동기화 (일별 합산)',
      });

      if (!error) {
        syncedCount++;
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

// 프로필 통산 집계 갱신
async function updateProfileTotals(userId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('activities')
      .select('distance_km')
      .eq('user_id', userId);

    if (data) {
      const totalRuns = data.length;
      const totalDistanceKm = data.reduce((sum, a) => sum + Number(a.distance_km), 0);
      await supabase
        .from('profiles')
        .update({
          total_runs: totalRuns,
          total_distance_km: Math.round(totalDistanceKm * 100) / 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }
  } catch (e) {
    console.error('프로필 통산 집계 갱신 실패:', e);
  }
}

// 메인 동기화 함수 — userId(auth.users id)를 받음
export async function syncHealthData(userId: string): Promise<SyncResult> {
  if (!isNativeApp()) {
    return {
      success: false,
      message: '건강 데이터 동기화는 Routinist 앱에서만 사용할 수 있습니다.',
      synced: 0,
    };
  }

  const platform = getPlatform();
  if (platform === 'ios') {
    const result = await syncFromHealthKit(userId);
    await updateProfileTotals(userId);
    return result;
  }

  return { success: false, message: '지원하지 않는 플랫폼입니다.', synced: 0 };
}
