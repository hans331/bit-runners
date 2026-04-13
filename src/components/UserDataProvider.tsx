'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { getSupabase } from '@/lib/supabase';
import { fetchActivities, fetchMonthlyGoals } from '@/lib/routinist-data';
import type { Activity, UserMonthlyGoal } from '@/types';

interface UserDataState {
  activities: Activity[];
  goals: UserMonthlyGoal[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserDataContext = createContext<UserDataState>({
  activities: [],
  goals: [],
  loading: true,
  refresh: async () => {},
});

export function useUserData() {
  return useContext(UserDataContext);
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<UserMonthlyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) {
      setActivities([]);
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      const [acts, gls] = await Promise.all([
        fetchActivities(user.id),
        fetchMonthlyGoals(user.id),
      ]);
      setActivities(acts);
      setGoals(gls);
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  // 초기 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime 구독 — activities, monthly_goals 변경 감지
  useEffect(() => {
    if (!user) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel('user-data-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `user_id=eq.${user.id}`,
      }, () => { loadData(); })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'monthly_goals',
        filter: `user_id=eq.${user.id}`,
      }, () => { loadData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  return (
    <UserDataContext.Provider value={{ activities, goals, loading, refresh }}>
      {children}
    </UserDataContext.Provider>
  );
}
