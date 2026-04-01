'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchDashboardData } from '@/lib/supabase-data';
import { supabase } from '@/lib/supabase';
import type { Member, MonthlyRecord } from '@/types';

interface DataContextType {
  members: Member[];
  records: MonthlyRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
  members: [],
  records: [],
  loading: true,
  refresh: async () => {},
});

export function useData() {
  return useContext(DataContext);
}

// 유틸리티 함수들
export function getTotalDistance(records: MonthlyRecord[], memberId: string): number {
  return records
    .filter(r => r.member_id === memberId)
    .reduce((sum, r) => sum + r.achieved_km, 0);
}

export function getMemberRecords(records: MonthlyRecord[], memberId: string): MonthlyRecord[] {
  return records.filter(r => r.member_id === memberId);
}

export function getLeaderboard(members: Member[], records: MonthlyRecord[], year: number, month: number) {
  return members
    .map(m => {
      const record = records.find(r => r.member_id === m.id && r.year === year && r.month === month);
      const distance = record?.achieved_km ?? 0;
      const goal = record?.goal_km ?? 0;
      const rate = goal > 0 ? (distance / goal) * 100 : 0;
      return { member: m, distance, goal, rate };
    })
    .filter(e => e.goal > 0 || e.distance > 0)
    .sort((a, b) => b.distance - a.distance);
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
  return members
    .map(m => {
      const memberRecords = records.filter(r => r.member_id === m.id && r.achieved_km > 0);
      return {
        member: m,
        totalDistance: memberRecords.reduce((sum, r) => sum + r.achieved_km, 0),
        months: memberRecords.length,
      };
    })
    .sort((a, b) => b.totalDistance - a.totalDistance);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchDashboardData();
      setMembers(data.members);
      setRecords(data.records);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Realtime 구독
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_records' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'running_logs' }, () => refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return (
    <DataContext.Provider value={{ members, records, loading, refresh }}>
      {children}
    </DataContext.Provider>
  );
}
