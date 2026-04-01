'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchDashboardData, DailyRun } from '@/lib/supabase-data';
import { supabase } from '@/lib/supabase';
import type { Member, MonthlyRecord } from '@/types';

interface DataContextType {
  members: Member[];
  records: MonthlyRecord[];
  runningLogs: DailyRun[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
  members: [], records: [], runningLogs: [], loading: true, refresh: async () => {},
});

export function useData() { return useContext(DataContext); }

// ===== 유틸리티 =====
export function getTotalDistance(records: MonthlyRecord[], memberId: string): number {
  return records.filter(r => r.member_id === memberId).reduce((sum, r) => sum + r.achieved_km, 0);
}

export function getMemberRecords(records: MonthlyRecord[], memberId: string): MonthlyRecord[] {
  return records.filter(r => r.member_id === memberId);
}

export function getLeaderboard(members: Member[], records: MonthlyRecord[], year: number, month: number) {
  return members.map(m => {
    const record = records.find(r => r.member_id === m.id && r.year === year && r.month === month);
    const distance = record?.achieved_km ?? 0;
    const { goal, isFallback } = getGoalWithFallback(records, m.id, year, month);
    const rate = goal > 0 ? (distance / goal) * 100 : 0;
    return { member: m, distance, goal, rate, isFallback };
  }).filter(e => e.goal > 0 || e.distance > 0).sort((a, b) => b.distance - a.distance);
}

// getGoalWithFallback는 아래에 정의됨 - 순서 이슈로 여기서 선언
export function getGoalWithFallback(records: MonthlyRecord[], memberId: string, year: number, month: number): { goal: number; isFallback: boolean } {
  const current = records.find(r => r.member_id === memberId && r.year === year && r.month === month);
  if (current && current.goal_km > 0) return { goal: current.goal_km, isFallback: false };
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prev = records.find(r => r.member_id === memberId && r.year === prevYear && r.month === prevMonth);
  if (prev && prev.goal_km > 0) return { goal: prev.goal_km, isFallback: true };
  return { goal: 0, isFallback: false };
}

export function getClubMonthlyTotals(records: MonthlyRecord[]) {
  const monthSet = new Map<string, { year: number; month: number; total: number; members: number }>();
  for (const r of records) {
    const key = `${r.year}-${r.month}`;
    if (!monthSet.has(key)) monthSet.set(key, { year: r.year, month: r.month, total: 0, members: 0 });
    const entry = monthSet.get(key)!;
    entry.total += r.achieved_km;
    if (r.achieved_km > 0) entry.members += 1;
  }
  return Array.from(monthSet.values())
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
    .map(e => ({ label: e.year === 2025 ? `'25.${e.month}월` : `'26.${e.month}월`, ...e }));
}

export function getFinisherRate(members: Member[], records: MonthlyRecord[], year: number, month: number): number {
  const lb = getLeaderboard(members, records, year, month);
  const withGoal = lb.filter(e => e.goal > 0);
  if (withGoal.length === 0) return 0;
  return (withGoal.filter(e => e.distance >= e.goal).length / withGoal.length) * 100;
}

export function getAllTimeLeaderboard(members: Member[], records: MonthlyRecord[]) {
  return members.map(m => {
    const mr = records.filter(r => r.member_id === m.id && r.achieved_km > 0);
    return { member: m, totalDistance: mr.reduce((sum, r) => sum + r.achieved_km, 0), months: mr.length };
  }).sort((a, b) => b.totalDistance - a.totalDistance);
}

// ===== 월별 멤버별 러닝 일수 계산 =====
export function getMemberMonthlyRunDays(runningLogs: DailyRun[], memberId: string, year: number, month: number): number {
  const days = new Set<string>();
  for (const l of runningLogs) {
    if (l.member_id !== memberId) continue;
    const d = new Date(l.run_date);
    if (d.getFullYear() === year && d.getMonth() + 1 === month && l.distance_km >= 3) {
      days.add(l.run_date);
    }
  }
  return days.size;
}

// ===== 개근상 수상자 (월별 러닝 일수 1위) =====
export function getAttendanceWinner(members: Member[], runningLogs: DailyRun[], year: number, month: number): { member: Member; days: number } | null {
  let maxDays = 0;
  let winner: Member | null = null;
  for (const m of members) {
    const days = getMemberMonthlyRunDays(runningLogs, m.id, year, month);
    if (days > maxDays) { maxDays = days; winner = m; }
  }
  return winner && maxDays > 0 ? { member: winner, days: maxDays } : null;
}

// ===== 훈장 (배지) 시스템 =====
export function getMemberBadges(members: Member[], records: MonthlyRecord[], runningLogs: DailyRun[], memberId: string) {
  // 피니셔 횟수
  const finisherCount = records.filter(r => r.member_id === memberId && r.goal_km > 0 && r.achieved_km >= r.goal_km).length;

  // 롱런상 횟수 (해당 월 거리 1위)
  let longRunCount = 0;
  const monthSet = new Set(records.map(r => `${r.year}-${r.month}`));
  for (const key of monthSet) {
    const [y, m] = key.split('-').map(Number);
    const lb = getLeaderboard(members, records, y, m);
    if (lb.length > 0 && lb[0].member.id === memberId && lb[0].distance > 0) longRunCount++;
  }

  // 개근상 횟수 (해당 월 러닝 일수 1위)
  let attendanceCount = 0;
  for (const key of monthSet) {
    const [y, m] = key.split('-').map(Number);
    const winner = getAttendanceWinner(members, runningLogs, y, m);
    if (winner && winner.member.id === memberId) attendanceCount++;
  }

  // 총 러닝 횟수
  const totalRuns = runningLogs.filter(l => l.member_id === memberId).length;

  return { finisherCount, longRunCount, attendanceCount, totalRuns };
}


// ===== 달력 데이터 =====
export function getCalendarData(runningLogs: DailyRun[], members: Member[], year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: { date: string; day: number; runners: { name: string; distance: number }[]; count: number }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayLogs = runningLogs.filter(l => l.run_date === dateStr);
    const runners = dayLogs.map(l => {
      const member = members.find(m => m.id === l.member_id);
      return { name: member?.name || '?', distance: l.distance_km };
    });
    // 같은 이름 합치기
    const merged = new Map<string, number>();
    runners.forEach(r => merged.set(r.name, (merged.get(r.name) || 0) + r.distance));
    const uniqueRunners = Array.from(merged.entries()).map(([name, distance]) => ({ name, distance }));

    days.push({ date: dateStr, day: d, runners: uniqueRunners, count: uniqueRunners.length });
  }
  return days;
}

// ===== 월별 러닝 횟수 =====
export function getMonthlyRunCounts(runningLogs: DailyRun[], memberId: string) {
  const counts = new Map<string, number>();
  const logs = runningLogs.filter(l => l.member_id === memberId);
  for (const l of logs) {
    const d = new Date(l.run_date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    // 같은 날 여러 기록은 1회로 카운트
    const dayKey = `${key}-${d.getDate()}`;
    if (!counts.has(dayKey)) counts.set(dayKey, 1);
  }
  // 월별로 집계
  const monthly = new Map<string, number>();
  for (const [dayKey] of counts) {
    const [y, m] = dayKey.split('-');
    const monthKey = `${y}-${m}`;
    monthly.set(monthKey, (monthly.get(monthKey) || 0) + 1);
  }
  return monthly;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [runningLogs, setRunningLogs] = useState<DailyRun[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchDashboardData();
      setMembers(data.members);
      setRecords(data.records);
      setRunningLogs(data.runningLogs);
    } catch (err) { console.error('Failed to fetch:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_records' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'running_logs' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return <DataContext.Provider value={{ members, records, runningLogs, loading, refresh }}>{children}</DataContext.Provider>;
}
