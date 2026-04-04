import { Capacitor } from '@capacitor/core';
import { getSupabase } from './supabase';

// 플랫폼 감지
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
}

// 동기화 결과 타입
export interface SyncResult {
  success: boolean;
  message: string;
  synced: number;
}

// Health Connect (Android) 동기화
async function syncFromHealthConnect(memberId: string): Promise<SyncResult> {
  if (getPlatform() !== 'android') {
    return { success: false, message: 'Android가 아닙니다', synced: 0 };
  }

  try {
    const { HealthConnect } = await import('@devmaxime/capacitor-health-connect');

    // Health Connect 설치 확인
    const { availability } = await HealthConnect.checkAvailability();
    if (availability === 'NotInstalled') {
      return { success: false, message: 'Health Connect 앱이 필요합니다. Play Store에서 "Health Connect"를 검색하여 설치해주세요. (무료, Google 공식 앱)\n\n최신 폰(Galaxy S23 이상)은 이미 내장되어 있습니다.', synced: 0 };
    }
    if (availability === 'NotSupported') {
      return { success: false, message: '이 기기에서는 Health Connect가 지원되지 않습니다. 아래 직접 입력으로 기록해주세요.', synced: 0 };
    }

    // 권한 요청
    const permissions = await HealthConnect.requestPermissions({
      read: ['ActivitySession'],
      write: [],
    });

    if (!permissions.read.includes('ActivitySession')) {
      return { success: false, message: '운동 기록 읽기 권한이 필요합니다. 설정에서 권한을 허용해주세요.', synced: 0 };
    }

    // 최근 7일 데이터
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ActivitySession에서 러닝 기록 읽기
    const { records } = await HealthConnect.readRecords({
      type: 'ActivitySession',
      start: weekAgo.toISOString(),
      end: now.toISOString(),
    });

    // 러닝 세션만 필터 (records에서 exerciseType이나 activityType 확인)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runningSessions = (records as any[]).filter((r) => {
      const type = (r.activityType || r.exerciseType || '').toString().toLowerCase();
      return type.includes('running') || type.includes('jogging') || type === '56';
    });

    if (runningSessions.length === 0) {
      // 러닝 필터가 안 먹힐 수 있으니, 전체 세션도 시도
      // Distance 집계로 대체
      return await syncViaDistanceAggregate(memberId, weekAgo, now);
    }

    let syncedCount = 0;
    const supabase = getSupabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const session of runningSessions as any[]) {
      const startTime = session.startTime || session.start;
      const endTime = session.endTime || session.end;
      if (!startTime) continue;

      const runDate = startTime.split('T')[0];
      const distanceKm = session.distance
        ? Number(session.distance) / 1000
        : session.distanceKm
          ? Number(session.distanceKm)
          : 0;
      const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      if (distanceKm < 0.1) continue;

      // 중복 체크
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
        duration_minutes: durationMinutes > 0 ? durationMinutes : null,
        memo: 'Health Connect 자동 동기화',
      });

      if (!error) {
        syncedCount++;
        await updateMonthlyRecord(memberId, runDate, supabase);
      }
    }

    return {
      success: true,
      message: syncedCount > 0
        ? `${syncedCount}건의 러닝 기록을 동기화했습니다!`
        : '새로운 기록이 없습니다 (이미 동기화됨).',
      synced: syncedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return { success: false, message: `동기화 실패: ${message}`, synced: 0 };
  }
}

// Distance 집계 방식 (ActivitySession에 거리가 없을 때 대체)
async function syncViaDistanceAggregate(
  memberId: string,
  start: Date,
  end: Date
): Promise<SyncResult> {
  try {
    const { HealthConnect } = await import('@devmaxime/capacitor-health-connect');

    // 일별 거리 집계
    const { aggregates } = await HealthConnect.aggregateRecords({
      type: 'Distance',
      start: start.toISOString(),
      end: end.toISOString(),
      groupBy: 'day',
    });

    if (!aggregates || aggregates.length === 0) {
      return { success: true, message: '최근 7일간 운동 기록이 없습니다.', synced: 0 };
    }

    let syncedCount = 0;
    const supabase = getSupabase();

    for (const agg of aggregates) {
      const distanceKm = agg.unit === 'km' ? agg.value : agg.value / 1000;
      if (distanceKm < 0.5) continue; // 500m 미만 무시 (걷기 등)

      const runDate = agg.startTime.split('T')[0];

      // 중복 체크
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
        memo: 'Health Connect 자동 동기화 (일별 합산)',
      });

      if (!error) {
        syncedCount++;
        await updateMonthlyRecord(memberId, runDate, supabase);
      }
    }

    return {
      success: true,
      message: syncedCount > 0
        ? `${syncedCount}건의 러닝 기록을 동기화했습니다!`
        : '새로운 기록이 없습니다 (이미 동기화됨).',
      synced: syncedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return { success: false, message: `거리 집계 실패: ${message}`, synced: 0 };
  }
}

// HealthKit (iOS) 동기화 - Mac에서 빌드 후 구현 예정
async function syncFromHealthKit(_memberId: string): Promise<SyncResult> {
  return {
    success: false,
    message: 'iOS HealthKit 동기화는 준비 중입니다. Mac에서 빌드 후 사용 가능합니다.',
    synced: 0,
  };
}

// monthly_records 업데이트 헬퍼
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
      message: '건강 데이터 동기화는 모바일 앱에서만 사용할 수 있습니다.',
      synced: 0,
    };
  }

  const platform = getPlatform();
  if (platform === 'android') {
    return syncFromHealthConnect(memberId);
  } else if (platform === 'ios') {
    return syncFromHealthKit(memberId);
  }

  return { success: false, message: '지원하지 않는 플랫폼입니다.', synced: 0 };
}
