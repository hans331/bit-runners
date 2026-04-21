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
      read: ['workouts', 'distance', 'heartRate', 'calories', 'exerciseTime'],
      write: [],
    });

    return { success: true, message: 'Apple Health 연결 완료! 러닝 기록을 가져오는 중...', synced: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return { success: false, message: `연결 실패: ${message}`, synced: 0 };
  }
}

// 데이터 동기화 (백그라운드) — activities 테이블에 저장.
// 성능 최적화(2026-04-21): 기본 90일만 동기화, 심박/칼로리 개별 루프 제거.
// 전체 3년치가 필요하면 deepSync=true 로 호출. 앱 로드 시 자동 sync 는 항상 얕게.
async function syncFromHealthKit(userId: string, deepSync = false): Promise<SyncResult> {
  try {
    const { Health } = await import('@capgo/capacitor-health');

    const startDt = new Date();
    if (deepSync) {
      startDt.setFullYear(startDt.getFullYear() - 3);
    } else {
      startDt.setDate(startDt.getDate() - 90);
    }
    const startDate = startDt.toISOString();
    const endDate = new Date().toISOString();

    // 러닝 + 걷기 모두 동기화
    const workoutTypes = ['running', 'walking'] as const;
    let allWorkouts: any[] = [];

    for (const wType of workoutTypes) {
      try {
        const { workouts } = await Health.queryWorkouts({
          workoutType: wType,
          startDate,
          endDate,
          limit: deepSync ? 3000 : 500,
          ascending: false,
        });
        if (workouts?.length) {
          allWorkouts.push(...workouts.map(w => ({ ...w, _type: wType })));
        }
      } catch {}
    }

    if (allWorkouts.length === 0) {
      return await syncViaDistance(userId, startDate, endDate);
    }

    // 배치 중복 체크 — 기존 루프 방식이 N건 × 쿼리로 느렸음
    const supabase = getSupabase();
    const { data: existingAll } = await supabase
      .from('activities')
      .select('activity_date, distance_km')
      .eq('user_id', userId)
      .eq('source', 'health_kit')
      .gte('activity_date', startDate.slice(0, 10));
    const existingMap = new Map<string, number[]>();
    (existingAll ?? []).forEach(row => {
      const arr = existingMap.get(row.activity_date) ?? [];
      arr.push(Number(row.distance_km));
      existingMap.set(row.activity_date, arr);
    });

    let syncedCount = 0;
    const toInsert: Record<string, any>[] = [];

    for (const workout of allWorkouts) {
      const activityDate = workout.startDate.split('T')[0];
      const distanceKm = workout.totalDistance ? workout.totalDistance / 1000 : 0;
      const durationSeconds = workout.duration ? Math.round(workout.duration) : null;
      const paceAvg = durationSeconds && distanceKm > 0
        ? Math.round(durationSeconds / distanceKm)
        : null;
      const activityType = workout._type === 'walking' ? 'walking' : 'running';

      if (distanceKm < 0.1) continue;
      if (activityType === 'walking' && distanceKm < 0.5) continue;

      // 배치 중복 체크
      const existingDistances = existingMap.get(activityDate) ?? [];
      const isDuplicate = existingDistances.some(d => Math.abs(d - distanceKm) < 0.1);
      if (isDuplicate) continue;

      const insertData: Record<string, any> = {
        user_id: userId,
        activity_date: activityDate,
        distance_km: Math.round(distanceKm * 100) / 100,
        duration_seconds: durationSeconds && durationSeconds > 0 ? durationSeconds : null,
        pace_avg_sec_per_km: paceAvg,
        // 심박/칼로리 루프 쿼리 제거 — workout 자체의 집계값만 사용 (훨씬 빠름)
        calories: workout.totalEnergyBurned ? Math.round(workout.totalEnergyBurned) : null,
        source: 'health_kit',
        memo: `Apple Health ${activityType === 'walking' ? '걷기' : '러닝'} 동기화`,
        started_at: workout.startDate,
        ended_at: workout.endDate || null,
      };

      if (workout.totalEnergyBurned) insertData.active_energy_kcal = Math.round(workout.totalEnergyBurned);
      if (activityType === 'walking') insertData.activity_type = 'walking';

      toInsert.push(insertData);
      existingDistances.push(distanceKm);
      existingMap.set(activityDate, existingDistances);
    }

    // 벌크 insert — 한 번의 왕복으로 전체 처리
    if (toInsert.length > 0) {
      // 100건씩 청크로 나눠 insert (supabase row 제한 방지)
      for (let i = 0; i < toInsert.length; i += 100) {
        const chunk = toInsert.slice(i, i + 100);
        const { error, count } = await supabase.from('activities').insert(chunk, { count: 'exact' });
        if (!error) {
          syncedCount += count ?? chunk.length;
        }
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

// GPS 경로 동기화 (커스텀 플러그인 사용)
async function syncRouteData(userId: string): Promise<number> {
  try {
    const { WorkoutRoute } = await import('./workout-route');
    const supabase = getSupabase();

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const { routes } = await WorkoutRoute.getRoutes({
      startDate: threeYearsAgo.toISOString(),
      endDate: new Date().toISOString(),
      limit: 500,
    });

    if (!routes || routes.length === 0) return 0;

    let updatedCount = 0;

    for (const route of routes) {
      const activityDate = route.startDate.split('T')[0];
      const distanceKm = route.distance / 1000;

      // route_data가 없는 기존 activity 찾기 (같은 날짜 + 유사 거리)
      const { data: existing } = await supabase
        .from('activities')
        .select('id, distance_km, route_data')
        .eq('user_id', userId)
        .eq('activity_date', activityDate)
        .is('route_data', null);

      const match = (existing || []).find(
        (e) => Math.abs(Number(e.distance_km) - distanceKm) < 0.5
      );

      if (match) {
        // 기존 activity에 route_data 추가
        const { error } = await supabase
          .from('activities')
          .update({
            route_data: {
              type: 'LineString',
              coordinates: route.coordinates,
            },
          })
          .eq('id', match.id);

        if (!error) updatedCount++;
      }
    }

    return updatedCount;
  } catch (e) {
    console.warn('GPS 경로 동기화 실패 (플러그인 미지원 가능):', e);
    return 0;
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

    // GPS 경로도 동기화
    const routeCount = await syncRouteData(userId);
    if (routeCount > 0) {
      result.message += ` (GPS 경로 ${routeCount}건 추가)`;
    }

    return result;
  }

  return { success: false, message: '지원하지 않는 플랫폼입니다.', synced: 0 };
}
