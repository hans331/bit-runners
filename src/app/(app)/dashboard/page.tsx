'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { getMonthlyDistance, getWeeklyActivities, getStreak, formatPace, formatDuration } from '@/lib/routinist-data';
import Onboarding from '@/components/Onboarding';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // 첫 사용자: display_name이 기본값이고 활동이 없으면 온보딩
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('onboarding_done');
    if (!dismissed && profile && profile.display_name === '러너' && profile.total_runs === 0) {
      setShowOnboarding(true);
    }
  }, [profile]);

  if (showOnboarding) {
    return <Onboarding onComplete={() => { setShowOnboarding(false); localStorage.setItem('onboarding_done', '1'); }} />;
  }
  const { activities, goals, loading } = useUserData();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const monthlyDistance = getMonthlyDistance(activities, year, month);
  const weeklyActivities = getWeeklyActivities(activities);
  const weeklyDistance = weeklyActivities.reduce((s, a) => s + a.distance_km, 0);
  const streak = getStreak(activities);

  const currentGoal = goals.find(g => g.year === year && g.month === month);
  const goalKm = currentGoal?.goal_km || 0;
  const goalProgress = goalKm > 0 ? Math.min((monthlyDistance / goalKm) * 100, 100) : 0;

  const recentActivities = activities.slice(0, 5);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
      {/* 인사 */}
      <div className="pt-2">
        <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
          {profile?.display_name ?? '러너'}님,
        </h2>
        <p className="text-sm text-[var(--muted)]">오늘도 달려볼까요?</p>
      </div>

      {/* 월간 누적 거리 카드 */}
      <div className="card p-6 text-center">
        <p className="text-xs text-[var(--muted)] mb-1">{month}월 누적 거리</p>
        <p className="text-5xl font-extrabold text-[var(--accent)]">
          {monthlyDistance.toFixed(1)}<span className="text-lg ml-1">km</span>
        </p>
        {goalKm > 0 && (
          <>
            <div className="mt-4 bg-[var(--card-border)] rounded-full h-3 overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full rounded-full transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">
              목표 {goalKm}km 중 {goalProgress.toFixed(0)}% 달성
            </p>
          </>
        )}
        {goalKm === 0 && (
          <Link href="/goals" className="inline-block text-xs text-[var(--accent)] mt-3 underline">
            목표 설정하기
          </Link>
        )}
      </div>

      {/* 이번 주 활동 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">이번 주 활동</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{weeklyActivities.length}</p>
            <p className="text-xs text-[var(--muted)]">러닝 횟수</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{weeklyDistance.toFixed(1)}</p>
            <p className="text-xs text-[var(--muted)]">km</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{streak}</p>
            <p className="text-xs text-[var(--muted)]">연속일</p>
          </div>
        </div>
      </div>

      {/* 빠른 시작 */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/track"
          className="bg-[var(--accent)] hover:opacity-90 text-white font-semibold py-4 rounded-2xl text-center text-base transition-all shadow-lg"
        >
          달리기 시작
        </Link>
        <Link
          href="/log"
          className="bg-[var(--card-border)] hover:bg-[var(--muted)]/20 text-[var(--foreground)] font-semibold py-4 rounded-2xl text-center text-base transition-all"
        >
          직접 입력
        </Link>
      </div>

      {/* 이달의 레이스 */}
      <Link href="/stats" className="card p-5 flex items-center gap-4 block">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">이달의 레이스 🏁</p>
          <p className="text-xs text-[var(--muted)]">클럽 멤버들의 목표 달성 현황을 확인하세요</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </Link>

      {/* 내 러닝 지도 */}
      <Link href="/map" className="card p-5 flex items-center gap-4 block">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">내 러닝 지도</p>
          <p className="text-xs text-[var(--muted)]">달린 경로를 세계 지도에서 확인하세요</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </Link>

      {/* 최근 활동 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">최근 활동</h3>
          {activities.length > 0 && (
            <Link href="/history" className="text-xs text-[var(--accent)]">전체보기</Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : recentActivities.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">
            아직 기록이 없습니다.<br/>달리기를 시작해보세요!
          </p>
        ) : (
          <div className="space-y-2">
            {recentActivities.map(a => (
              <Link
                key={a.id}
                href={`/activity?id=${a.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--card-border)]/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                  {a.source === 'gps' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {a.distance_km.toFixed(2)} km
                    {a.duration_seconds && (
                      <span className="text-[var(--muted)] font-normal ml-2">
                        {formatDuration(a.duration_seconds)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(a.activity_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                    {a.pace_avg_sec_per_km && ` · ${formatPace(a.pace_avg_sec_per_km)}/km`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
