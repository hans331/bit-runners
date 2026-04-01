import { supabase } from './supabase';
import type { Member, MonthlyRecord, MemberStatus } from '@/types';

// ===== 멤버 =====
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('member_number');
  if (error) throw error;
  return (data || []).map(m => ({
    id: m.id,
    name: m.name,
    member_number: m.member_number,
    join_date: m.join_date,
    join_location: m.join_location,
    status: m.status as MemberStatus,
  }));
}

// ===== 월별 기록 =====
export async function fetchMonthlyRecords(): Promise<MonthlyRecord[]> {
  const { data, error } = await supabase
    .from('monthly_records')
    .select('*')
    .order('year')
    .order('month');
  if (error) throw error;
  return (data || []).map(r => ({
    member_id: r.member_id,
    year: r.year,
    month: r.month,
    goal_km: Number(r.goal_km),
    achieved_km: Number(r.achieved_km),
  }));
}

// ===== 회원 상태 변경 =====
export async function updateMemberStatus(memberId: string, status: MemberStatus) {
  const { error } = await supabase
    .from('members')
    .update({ status })
    .eq('id', memberId);
  if (error) throw error;
}

// ===== 신규 회원 등록 =====
export async function addMember(name: string, joinLocation: string | null, joinDate: string | null) {
  // 다음 회원번호 계산
  const { data: members } = await supabase
    .from('members')
    .select('member_number')
    .order('member_number', { ascending: false })
    .limit(1);
  const nextNumber = (members && members.length > 0) ? members[0].member_number + 1 : 1;

  const { data, error } = await supabase
    .from('members')
    .insert({
      name,
      member_number: nextNumber,
      join_date: joinDate || null,
      join_location: joinLocation || null,
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ===== 러닝 기록 입력 =====
export async function addRunningLog(memberId: string, runDate: string, distanceKm: number, durationMinutes?: number, memo?: string) {
  const { error } = await supabase
    .from('running_logs')
    .insert({
      member_id: memberId,
      run_date: runDate,
      distance_km: distanceKm,
      duration_minutes: durationMinutes || null,
      memo: memo || null,
    });
  if (error) throw error;

  // 해당 월의 monthly_records도 업데이트
  const date = new Date(runDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // 기존 레코드 확인
  const { data: existing } = await supabase
    .from('monthly_records')
    .select('*')
    .eq('member_id', memberId)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (existing) {
    // 해당 월 전체 러닝 로그 합산
    const { data: logs } = await supabase
      .from('running_logs')
      .select('distance_km')
      .eq('member_id', memberId)
      .gte('run_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('run_date', month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`);

    const totalFromLogs = (logs || []).reduce((sum, l) => sum + Number(l.distance_km), 0);
    // 기존 achieved_km과 로그 합산 중 더 큰 값 사용 (레거시 데이터 보존)
    const newAchieved = Math.max(Number(existing.achieved_km), totalFromLogs);

    await supabase
      .from('monthly_records')
      .update({ achieved_km: newAchieved })
      .eq('id', existing.id);
  } else {
    // 새 레코드 생성
    await supabase
      .from('monthly_records')
      .insert({
        member_id: memberId,
        year,
        month,
        goal_km: 0,
        achieved_km: distanceKm,
      });
  }
}

// ===== 전체 데이터 한번에 로드 =====
export async function fetchDashboardData() {
  const [members, records] = await Promise.all([
    fetchMembers(),
    fetchMonthlyRecords(),
  ]);
  return { members, records };
}
