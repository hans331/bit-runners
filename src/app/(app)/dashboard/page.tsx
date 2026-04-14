'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { getMonthlyDistance, getWeeklyActivities, getStreak, formatPace, formatDuration } from '@/lib/routinist-data';
import { getMyClubs } from '@/lib/social-data';
import { fetchClubMemberProgress, type MemberProgress } from '@/lib/stats-data';
import Onboarding from '@/components/Onboarding';
import Link from 'next/link';
import { Trophy, ChevronRight, Flag, MapPin, Zap } from 'lucide-react';
import type { Club } from '@/types';

function MiniRace({ members }: { members: MemberProgress[] }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (members.length === 0) return null;

  // 상위 5명만 표시
  const top5 = members.slice(0, 5);

  return (
    <div className="space-y-2">
      {top5.map((m, i) => {
        const isFinished = m.progress >= 100;
        return (
          <div key={m.user_id} className="flex items-center gap-2">
            {/* 순위 */}
            <span className={`w-5 text-xs font-bold text-center ${
              i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-[var(--muted)]'
            }`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            {/* 아바타 */}
            <div className="w-6 h-6 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px]">🏃</div>
              )}
            </div>
            {/* 이름 + 거리 */}
            <span className="text-xs font-medium text-[var(--foreground)] truncate flex-1">{m.display_name}</span>
            <span className="text-xs text-[var(--muted)]">{m.distance_km.toFixed(1)}km</span>
            {/* 프로그레스 바 */}
            <div className="w-16 h-1.5 bg-[var(--card-border)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ease-out ${isFinished ? 'bg-green-500' : 'bg-[var(--accent)]'}`}
                style={{
                  width: animated ? `${m.progress}%` : '0%',
                  transitionDuration: `${800 + i * 150}ms`,
                }}
              />
            </div>
            {isFinished && <span className="text-xs">🏅</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [raceMembers, setRaceMembers] = useState<MemberProgress[]>([]);
  const [finishers, setFinishers] = useState<MemberProgress[]>([]);
  const [clubName, setClubName] = useState('');

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('onboarding_done');
    if (!dismissed && profile && profile.display_name === '러너' && profile.total_runs === 0) {
      setShowOnboarding(true);
    }
  }, [profile]);

  // 클럽 레이스 데이터 로드
  const loadRaceData = useCallback(async () => {
    if (!user) return;
    try {
      const clubs = await getMyClubs();
      if (clubs.length > 0) {
        const club = clubs[0];
        setClubName(club.name);
        const now = new Date();
        const data = await fetchClubMemberProgress(club.id, now.getFullYear(), now.getMonth() + 1);
        setRaceMembers(data);
        setFinishers(data.filter(m => m.progress >= 100));
      }
    } catch {}
  }, [user]);

  useEffect(() => { loadRaceData(); }, [loadRaceData]);

  if (showOnboarding) {
    return <Onboarding onComplete={() => { setShowOnboarding(false); localStorage.setItem('onboarding_done', '1'); }} />;
  }

  const { activities, goals, loading } = useUserData();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const monthlyDistance = getMonthlyDistance(activities, year, month);
  const weeklyActivities = getWeeklyActivities(activities);
  const weeklyDistance = weeklyActivities.reduce((s, a) => s + a.distance_km, 0);
  const streak = getStreak(activities);

  const currentGoal = goals.find(g => g.year === year && g.month === month);
  const goalKm = currentGoal?.goal_km || 0;
  const goalProgress = goalKm > 0 ? Math.min((monthlyDistance / goalKm) * 100, 100) : 0;
  const goalRemaining = goalKm > 0 ? Math.max(goalKm - monthlyDistance, 0) : 0;
  const dailyNeeded = daysRemaining > 0 && goalRemaining > 0 ? goalRemaining / daysRemaining : 0;

  const recentActivities = activities.slice(0, 3);

  // 이번 달 러닝 일수 계산
  const monthlyRuns = activities.filter(a => {
    const d = new Date(a.activity_date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
      {/* 인사 + 날짜 */}
      <div className="pt-2 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
            {profile?.display_name ?? '러너'}님
          </h2>
          <p className="text-sm text-[var(--muted)]">{year}년 {month}월 · D-{daysRemaining}</p>
        </div>
        <Link href="/log" className="text-xs text-[var(--accent)] font-semibold flex items-center gap-1">
          <Zap size={14} /> 직접 입력
        </Link>
      </div>

      {/* ========== 핵심: 월간 이어달리기 카드 ========== */}
      <div className="card p-6 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-[var(--accent)]/5 rounded-full translate-y-6 -translate-x-6" />

        <div className="relative">
          <p className="text-xs font-semibold text-[var(--accent)] mb-2">{month}월의 이어달리기 🏃</p>
          <div className="flex items-end gap-2">
            <p className="text-5xl font-extrabold text-[var(--foreground)] leading-none">
              {monthlyDistance.toFixed(1)}
            </p>
            <p className="text-lg text-[var(--muted)] font-bold mb-1">km</p>
          </div>

          {goalKm > 0 ? (
            <>
              {/* 프로그레스 바 */}
              <div className="mt-4 bg-[var(--card-border)] rounded-full h-4 overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-[var(--accent)] to-blue-400 h-full rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${goalProgress}%` }}
                >
                  {goalProgress > 10 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white">
                      {goalProgress.toFixed(0)}%
                    </span>
                  )}
                </div>
                {/* 골 마커 */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Flag size={10} className={goalProgress >= 100 ? 'text-green-500' : 'text-[var(--muted)]'} />
                </div>
              </div>

              <div className="flex justify-between mt-2 text-xs text-[var(--muted)]">
                <span>목표 {goalKm}km</span>
                {goalProgress >= 100 ? (
                  <span className="text-green-500 font-semibold">🎉 목표 달성!</span>
                ) : (
                  <span>남은 거리 {goalRemaining.toFixed(1)}km · 하루 {dailyNeeded.toFixed(1)}km</span>
                )}
              </div>
            </>
          ) : (
            <Link href="/goals" className="inline-block text-xs text-[var(--accent)] mt-3 font-semibold underline">
              이번 달 목표 설정하기 →
            </Link>
          )}
        </div>
      </div>

      {/* 주간 + 통산 미니 스탯 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-[var(--foreground)]">{weeklyActivities.length}</p>
          <p className="text-[10px] text-[var(--muted)]">이번 주</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-[var(--foreground)]">{weeklyDistance.toFixed(1)}</p>
          <p className="text-[10px] text-[var(--muted)]">주간 km</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-[var(--foreground)]">{streak}</p>
          <p className="text-[10px] text-[var(--muted)]">연속일 🔥</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-[var(--foreground)]">{monthlyRuns.length}</p>
          <p className="text-[10px] text-[var(--muted)]">이달 러닝</p>
        </div>
      </div>

      {/* ========== 이달의 레이스 (인라인) ========== */}
      {raceMembers.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🏁</span>
              <h3 className="text-sm font-bold text-[var(--foreground)]">이달의 레이스</h3>
              {clubName && <span className="text-[10px] text-[var(--muted)] bg-[var(--card-border)] px-2 py-0.5 rounded-full">{clubName}</span>}
            </div>
            <Link href="/stats" className="text-xs text-[var(--accent)] font-semibold flex items-center gap-0.5">
              전체 보기 <ChevronRight size={14} />
            </Link>
          </div>
          <MiniRace members={raceMembers} />
        </div>
      )}

      {/* ========== 명예의 전당 ========== */}
      {finishers.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-yellow-500" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">명예의 전당</h3>
            <span className="text-[10px] text-[var(--muted)]">{month}월 목표 달성자</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {finishers.map(f => (
              <div key={f.user_id} className="flex items-center gap-1.5 bg-yellow-500/10 rounded-full px-3 py-1.5">
                <div className="w-5 h-5 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px]">🏃</div>
                  )}
                </div>
                <span className="text-xs font-semibold text-[var(--foreground)]">{f.display_name}</span>
                <span className="text-xs">🏅</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== 최근 활동 ========== */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">최근 활동</h3>
          {activities.length > 0 && (
            <Link href="/history" className="text-xs text-[var(--accent)] font-semibold flex items-center gap-0.5">
              전체 기록 <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[var(--muted)]">아직 기록이 없습니다</p>
            <Link href="/track" className="text-xs text-[var(--accent)] font-semibold mt-1 inline-block">
              첫 달리기 시작하기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivities.map(a => (
              <Link
                key={a.id}
                href={`/activity?id=${a.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--card-border)]/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                  {a.source === 'gps' ? <MapPin size={16} /> : <Zap size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {a.distance_km.toFixed(2)} km
                    {a.duration_seconds && (
                      <span className="text-[var(--muted)] font-normal ml-2 text-xs">
                        {formatDuration(a.duration_seconds)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(a.activity_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                    {a.pace_avg_sec_per_km ? ` · ${formatPace(a.pace_avg_sec_per_km)}/km` : ''}
                  </p>
                </div>
                <ChevronRight size={14} className="text-[var(--muted)]" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
