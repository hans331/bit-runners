// Capacitor를 정적 import하지 않음 — Vercel 빌드 호환을 위해 window.Capacitor 사용
import { getSupabase } from './supabase';

export interface SyncResult {
  success: boolean;
  message: string;
  synced: number;
}

// 런타임에 window.Capacitor로 플랫폼 감지 (정적 import 없음)
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

// HealthKit (iOS) 동기화
async function syncFromHealthKit(memberId: string): Promise<SyncResult> {
  if (getPlatform() !== 'ios') {
    return { success: false, message: 'iOS가 아닙니다', synced: 0 };
  }

  try {
    const { CapacitorHealthkit, SampleNames } = await import('@perfood/capacitor-healthkit');

    try {
      await CapacitorHealthkit.isAvailable();
    } catch {
      return { success: false, message: '이 기기에서 Apple Health를 사용할 수 없습니다.', synced: 0 };
    }

    await CapacitorHealthkit.requestAuthorization({
      all: [''],
      read: ['activity', 'distance', 'duration', 'calories'],
      write: [''],
    });

    const now = new Date();
    const startDate = new Date('2025-01-01T00:00:00');

    const { resultData } = await CapacitorHealthkit.queryHKitSampleType<{
      startDate: string;
      endDate: string;
      totalDistance: number;
      duration: number;
      workoutActivityName: string;
      uuid: string;
    }>({
      sampleName: SampleNames.WORKOUT_TYPE,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      limit: 0,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runningSessions = (resultData || []).filter((r: any) => {
      const name = (r.workoutActivityName || '').toLowerCase();
      return name.includes('running') || name.includes('jogging') || name.includes('run');
    });

    if (runningSessions.length === 0) {
      return await syncViaHealthKitDistance(memberId, startDate, now);
    }

    let syncedCount = 0;
    const supabase = getSupabase();

    for (const session of runningSessions) {
      const startTime = session.startDate;
      if (!startTime) continue;

      const runDate = startTime.split('T')[0];
      const distanceKm = session.totalDistance ? Number(session.totalDistance) / 1000 : 0;
      const durationMinutes = session.duration ? Math.round(Number(session.duration) / 60) : null;

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

// HealthKit 걷기+달리기 거리로 대체 동기화
async function syncViaHealthKitDistance(
  memberId: string,
  start: Date,
  end: Date
): Promise<SyncResult> {
  try {
    const { CapacitorHealthkit, SampleNames } = await import('@perfood/capacitor-healthkit');

    const { resultData } = await CapacitorHealthkit.queryHKitSampleType<{
      startDate: string;
      endDate: string;
      value: number;
      uuid: string;
    }>({
      sampleName: SampleNames.DISTANCE_WALKING_RUNNING,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 0,
    });

    if (!resultData || resultData.length === 0) {
      return { success: true, message: 'Apple Health에 러닝 기록이 없습니다.', synced: 0 };
    }

    const dailyDistance: Record<string, number> = {};
    for (const record of resultData) {
      const date = record.startDate.split('T')[0];
      const distanceKm = Number(record.value) / 1000;
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
