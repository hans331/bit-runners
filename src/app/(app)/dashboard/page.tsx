'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { getMonthlyDistance, getWeeklyActivities, getStreak, formatPace, formatDuration } from '@/lib/routinist-data';
import { getMyClubs } from '@/lib/social-data';
import {
  fetchClubMemberProgress,
  fetchClubSummary,
  type MemberProgress,
  type ClubSummary,
} from '@/lib/stats-data';
import Onboarding from '@/components/Onboarding';
import Link from 'next/link';
import { ChevronRight, Flag, MapPin, Zap, TrendingUp, Users, Activity } from 'lucide-react';

// 거리 순위 바 차트
function DistanceRanking({ members, currentUserId }: { members: MemberProgress[]; currentUserId?: string }) {
  const [animated, setAnimated] = useState(false);
  const sorted = [...members].sort((a, b) => b.distance_km - a.distance_km);
  const maxDistance = sorted[0]?.distance_km || 1;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-2.5">
      {sorted.map((m, i) => {
        const barWidth = maxDistance > 0 ? (m.distance_km / maxDistance) * 100 : 0;
        const isMe = m.user_id === currentUserId;
        return (
          <div key={m.user_id} className="flex items-center gap-2">
            {/* 순위 */}
            <span className={`w-5 text-xs font-bold text-center flex-shrink-0 ${
              i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-[var(--muted)]'
            }`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            {/* 이름 - 내 이름 터치 시 통계 페이지로 */}
            {isMe ? (
              <Link href="/stats" className="w-14 text-xs truncate flex-shrink-0 font-bold text-[var(--accent)] underline underline-offset-2">
                {m.display_name}
              </Link>
            ) : (
              <span className="w-14 text-xs truncate flex-shrink-0 font-medium text-[var(--foreground)]">
                {m.display_name}
              </span>
            )}
            {/* 바 차트 */}
            <div className="flex-1 h-5 bg-[var(--card-border)] rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all ease-out ${
                  m.progress >= 100
                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                    : i === 0
                      ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                      : i === 1
                        ? 'bg-gradient-to-r from-blue-300 to-blue-400'
                        : 'bg-gradient-to-r from-gray-300 to-gray-400'
                }`}
                style={{
                  width: animated ? `${Math.max(barWidth, 2)}%` : '0%',
                  transitionDuration: `${600 + i * 80}ms`,
                }}
              >
                {barWidth > 20 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white">
                    {m.distance_km.toFixed(1)}km
                  </span>
                )}
              </div>
            </div>
            {/* 거리 (바 밖) */}
            {barWidth <= 20 && (
              <span className="text-xs text-[var(--muted)] w-14 text-right flex-shrink-0">{m.distance_km.toFixed(1)}km</span>
            )}
            {/* 목표 달성 체크 */}
            {m.progress >= 100 && <span className="text-xs flex-shrink-0">✅</span>}
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
  const [clubSummary, setClubSummary] = useState<ClubSummary | null>(null);
  const [clubName, setClubName] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('onboarding_done');
    if (!dismissed && profile && profile.display_name === '러너' && profile.total_runs === 0) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 클럽 데이터 로드
  const loadClubData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const clubs = await getMyClubs();
      if (clubs.length > 0) {
        const club = clubs[0];
        setClubName(club.name);
        const [members, summary] = await Promise.all([
          fetchClubMemberProgress(club.id, year, month),
          fetchClubSummary(club.id, year, month),
        ]);
        setRaceMembers(members);
        setClubSummary(summary);
      }
    } catch {} finally {
      setDataLoading(false);
    }
  }, [user, year, month]);

  useEffect(() => { loadClubData(); }, [loadClubData]);

  if (showOnboarding) {
    return <Onboarding onComplete={() => { setShowOnboarding(false); localStorage.setItem('onboarding_done', '1'); }} />;
  }

  const { activities, goals, loading } = useUserData();

  const monthlyDistance = getMonthlyDistance(activities, year, month);
  const currentGoal = goals.find(g => g.year === year && g.month === month);
  const goalKm = currentGoal?.goal_km || 0;
  const goalProgress = goalKm > 0 ? Math.min((monthlyDistance / goalKm) * 100, 100) : 0;

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();
  const goalRemaining = goalKm > 0 ? Math.max(goalKm - monthlyDistance, 0) : 0;
  const dailyNeeded = daysRemaining > 0 && goalRemaining > 0 ? goalRemaining / daysRemaining : 0;

  const recentActivities = activities.slice(0, 3);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
      {/* 헤더 — 닉네임 터치 시 내 통계 페이지 */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <Link href="/stats" className="text-xl font-extrabold text-[var(--foreground)] flex items-center gap-1">
            {profile?.display_name ?? '러너'}님의 {month}월
            <ChevronRight size={16} className="text-[var(--accent)]" />
          </Link>
          <p className="text-xs text-[var(--muted)]">이름을 터치하면 내 통계를 볼 수 있어요</p>
        </div>
        <Link href="/history" className="text-sm text-[var(--accent)] font-semibold flex items-center gap-0.5">
          히스토리 <ChevronRight size={16} />
        </Link>
      </div>

      {/* ========== 4 요약 카드 (2x2) ========== */}
      <div className="grid grid-cols-2 gap-3">
        {/* 클럽 총 거리 */}
        <div className="card p-4 relative overflow-hidden">
          <div className="absolute top-2 right-3 text-[var(--accent)] opacity-30">
            <TrendingUp size={28} />
          </div>
          <p className="text-[10px] text-[var(--muted)] mb-1">클럽 총 거리</p>
          <p className="text-3xl font-extrabold text-[var(--accent)] italic">
            {clubSummary ? clubSummary.totalDistance.toFixed(0) : '–'}
            <span className="text-sm font-bold not-italic ml-1">km</span>
          </p>
          <p className="text-[10px] text-[var(--muted)] mt-1">
            {clubSummary ? `${clubSummary.activeMembers}명 활동` : '로딩 중'}
          </p>
        </div>

        {/* 인당 평균 */}
        <div className="card p-4 relative overflow-hidden">
          <div className="absolute top-2 right-3 text-green-500 opacity-30">
            <Activity size={28} />
          </div>
          <p className="text-[10px] text-[var(--muted)] mb-1">인당 평균</p>
          <p className="text-3xl font-extrabold text-green-600 italic">
            {clubSummary ? clubSummary.avgDistance.toFixed(1) : '–'}
            <span className="text-sm font-bold not-italic ml-1">km</span>
          </p>
          <p className="text-[10px] text-[var(--muted)] mt-1">활동 멤버 기준</p>
        </div>

        {/* 총 러닝 */}
        <div className="card p-4 relative overflow-hidden">
          <div className="absolute top-2 right-3 text-purple-500 opacity-30">
            <Zap size={28} />
          </div>
          <p className="text-[10px] text-[var(--muted)] mb-1">총 러닝</p>
          <p className="text-3xl font-extrabold text-purple-600 italic">
            {clubSummary ? clubSummary.totalRuns : '–'}
            <span className="text-sm font-bold not-italic ml-1">회</span>
          </p>
          <p className="text-[10px] text-[var(--muted)] mt-1">
            {clubSummary && clubSummary.daysRemaining > 0 ? `D-${clubSummary.daysRemaining}` : '이달 완료'}
          </p>
        </div>

        {/* 활동 멤버 */}
        <div className="card p-4 relative overflow-hidden">
          <div className="absolute top-2 right-3 text-orange-500 opacity-30">
            <Users size={28} />
          </div>
          <p className="text-[10px] text-[var(--muted)] mb-1">활동 멤버</p>
          <p className="text-3xl font-extrabold text-orange-600 italic">
            {clubSummary ? clubSummary.activeMembers : '–'}
            <span className="text-sm font-bold not-italic ml-1">명</span>
          </p>
          <p className="text-[10px] text-[var(--muted)] mt-1">
            {clubSummary ? `전체 ${clubSummary.totalMembers}명` : ''}
          </p>
        </div>
      </div>

      {/* ========== 월간 거리 순위 ========== */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--foreground)]">{month}월 거리 순위</h3>
          <Link href="/stats" className="text-xs text-[var(--accent)] font-semibold flex items-center gap-0.5">
            상세 보기 <ChevronRight size={14} />
          </Link>
        </div>
        {dataLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : raceMembers.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">아직 활동 데이터가 없습니다</p>
        ) : (
          <DistanceRanking members={raceMembers} currentUserId={user?.id} />
        )}
      </div>

      {/* ========== 내 목표 진행 ========== */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">내 {month}월 목표</h3>
          <Link href="/goals" className="text-xs text-[var(--accent)] font-semibold flex items-center gap-0.5">
            설정 <ChevronRight size={14} />
          </Link>
        </div>
        {goalKm > 0 ? (
          <>
            <div className="flex items-end gap-2 mb-3">
              <p className="text-4xl font-extrabold text-[var(--foreground)] leading-none">
                {monthlyDistance.toFixed(1)}
              </p>
              <p className="text-sm text-[var(--muted)] font-bold mb-1">/ {goalKm}km</p>
            </div>
            <div className="bg-[var(--card-border)] rounded-full h-4 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                  goalProgress >= 100
                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                    : 'bg-gradient-to-r from-[var(--accent)] to-blue-400'
                }`}
                style={{ width: `${goalProgress}%` }}
              >
                {goalProgress > 10 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white">
                    {goalProgress.toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Flag size={10} className={goalProgress >= 100 ? 'text-green-500' : 'text-[var(--muted)]'} />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-[var(--muted)]">
              {goalProgress >= 100 ? (
                <span className="text-green-500 font-semibold">🎉 목표 달성!</span>
              ) : (
                <>
                  <span>남은 거리 {goalRemaining.toFixed(1)}km</span>
                  <span>하루 {dailyNeeded.toFixed(1)}km 필요</span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-[var(--muted)]">아직 이번 달 목표가 없습니다</p>
            <Link href="/goals" className="text-xs text-[var(--accent)] font-semibold mt-1 inline-block">
              목표 설정하기 →
            </Link>
          </div>
        )}
      </div>

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
