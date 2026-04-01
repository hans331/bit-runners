import { supabase } from './supabase';
import type { Member, MonthlyRecord, MemberStatus } from '@/types';

export interface DailyRun {
  id: string;
  member_id: string;
  run_date: string;
  distance_km: number;
  duration_minutes: number | null;
  memo: string | null;
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('*').order('member_number');
  if (error) throw error;
  return (data || []).map(m => ({
    id: m.id, name: m.name, member_number: m.member_number,
    join_date: m.join_date, join_location: m.join_location, status: m.status as MemberStatus,
  }));
}

export async function fetchMonthlyRecords(): Promise<MonthlyRecord[]> {
  const { data, error } = await supabase.from('monthly_records').select('*').order('year').order('month');
  if (error) throw error;
  return (data || []).map(r => ({
    member_id: r.member_id, year: r.year, month: r.month,
    goal_km: Number(r.goal_km), achieved_km: Number(r.achieved_km),
  }));
}

export async function fetchRunningLogs(): Promise<DailyRun[]> {
  const { data, error } = await supabase.from('running_logs').select('*').order('run_date');
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id, member_id: r.member_id, run_date: r.run_date,
    distance_km: Number(r.distance_km), duration_minutes: r.duration_minutes, memo: r.memo,
  }));
}

export async function updateMemberStatus(memberId: string, status: MemberStatus) {
  const { error } = await supabase.from('members').update({ status }).eq('id', memberId);
  if (error) throw error;
}

export async function addMember(name: string, joinLocation: string | null, joinDate: string | null) {
  const { data: members } = await supabase.from('members').select('member_number').order('member_number', { ascending: false }).limit(1);
  const nextNumber = (members && members.length > 0) ? members[0].member_number + 1 : 1;
  const { data, error } = await supabase.from('members').insert({
    name, member_number: nextNumber, join_date: joinDate || null,
    join_location: joinLocation || null, status: 'active',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function addRunningLog(memberId: string, runDate: string, distanceKm: number, durationMinutes?: number, memo?: string) {
  const { error } = await supabase.from('running_logs').insert({
    member_id: memberId, run_date: runDate, distance_km: distanceKm,
    duration_minutes: durationMinutes || null, memo: memo || null,
  });
  if (error) throw error;

  const date = new Date(runDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const { data: existing } = await supabase.from('monthly_records').select('*')
    .eq('member_id', memberId).eq('year', year).eq('month', month).single();

  if (existing) {
    const { data: logs } = await supabase.from('running_logs').select('distance_km')
      .eq('member_id', memberId)
      .gte('run_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('run_date', month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`);
    const totalFromLogs = (logs || []).reduce((sum, l) => sum + Number(l.distance_km), 0);
    const newAchieved = Math.max(Number(existing.achieved_km), totalFromLogs);
    await supabase.from('monthly_records').update({ achieved_km: newAchieved }).eq('id', existing.id);
  } else {
    await supabase.from('monthly_records').insert({ member_id: memberId, year, month, goal_km: 0, achieved_km: distanceKm });
  }
}

// ===== 월 목표 설정/업데이트 =====
export async function setMonthlyGoal(memberId: string, year: number, month: number, goalKm: number) {
  const { data: existing } = await supabase.from('monthly_records').select('id')
    .eq('member_id', memberId).eq('year', year).eq('month', month).single();

  if (existing) {
    const { error } = await supabase.from('monthly_records').update({ goal_km: goalKm }).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('monthly_records').insert({
      member_id: memberId, year, month, goal_km: goalKm, achieved_km: 0,
    });
    if (error) throw error;
  }
}

export async function fetchDashboardData() {
  const [members, records, runningLogs] = await Promise.all([
    fetchMembers(), fetchMonthlyRecords(), fetchRunningLogs(),
  ]);
  return { members, records, runningLogs };
}
