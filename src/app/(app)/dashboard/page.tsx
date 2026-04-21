'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import PullToRefresh from '@/components/PullToRefresh';
import {
  getStreak,
  getMaxStreak,
  getMonthlyDistance,
  getWeeklyActivities,
  formatPace,
  formatDuration,
} from '@/lib/routinist-data';
import {
  fetchDistanceByPeriod,
  fetchPersonalBests,
  fetchDayOfWeekStats,
  fetchHourOfDayStats,
  fetchPaceTrend,
  type PeriodDistance,
  type PersonalBest,
  type DayOfWeekStat,
  type HourOfDayStat,
  type PaceTrend,
} from '@/lib/stats-data';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts';
import Onboarding from '@/components/Onboarding';
import LazyMount from '@/components/LazyMount';
import HomeRankingHero from '@/components/home/HomeRankingHero';
import HealthRefreshChip from '@/components/home/HealthRefreshChip';
import TodayLocalTop from '@/components/home/TodayLocalTop';
import RoutinePhotoCarousel from '@/components/home/RoutinePhotoCarousel';
import FriendsLeaderboard from '@/components/home/FriendsLeaderboard';
import OnThisDayCard from '@/components/home/OnThisDayCard';
import LiveRunningIndicator from '@/components/home/LiveRunningIndicator';
import RankNeighbors from '@/components/home/RankNeighbors';
import Link from 'next/link';
import {
  ChevronRight, Flag, MapPin, Zap, Trophy, Flame, Clock, Calendar,
  BarChart3, TrendingUp,
} from 'lucide-react';
import { chartStyle } from '@/lib/chart-theme';

type PeriodMode = 'weekly' | 'monthly' | 'quarterly' | 'half' | 'yearly';
type ChartType = 'bar' | 'line';

const PERIOD_OPTIONS: { id: PeriodMode; label: string }[] = [
  { id: 'weekly', label: '주간' },
  { id: 'monthly', label: '월간' },
  { id: 'quarterly', label: '분기' },
  { id: 'half', label: '반기' },
  { id: 'yearly', label: '연간' },
];

function miniCalDistanceColor(km: number, dateStr: string): string {
  if (km <= 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(dateStr + 'T00:00:00');
    if (cellDate > today) return 'bg-green-50 dark:bg-green-950/20';
    return 'bg-gray-100 dark:bg-zinc-800/50';
  }
  if (km < 3) return 'bg-green-200 dark:bg-green-900/40';
  if (km < 5) return 'bg-green-300 dark:bg-green-800/50';
  if (km < 7) return 'bg-green-400 dark:bg-green-700/60';
  if (km < 10) return 'bg-green-500 dark:bg-green-600/70';
  return 'bg-green-600 dark:bg-green-500/80';
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { activities, goals, loading: userDataLoading, refresh } = useUserData();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);

  // 차트 데이터
  const [monthlyData, setMonthlyData] = useState<PeriodDistance[]>([]);
  const [weeklyData, setWeeklyData] = useState<PeriodDistance[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest | null>(null);
  const [dayStats, setDayStats] = useState<DayOfWeekStat[]>([]);
  const [hourStats, setHourStats] = useState<HourOfDayStat[]>([]);
  const [paceTrend, setPaceTrend] = useState<PaceTrend[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // 상세 차트 상태
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [detailYear, setDetailYear] = useState(new Date().getFullYear());
  const [detailData, setDetailData] = useState<PeriodDistance[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayStr = now.toISOString().split('T')[0];

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('onboarding_done');
    if (!dismissed && profile && profile.display_name === '러너' && profile.total_runs === 0) {
      setShowOnboarding(true);
    }
  }, [profile]);

  // 차트 데이터 로드
  const loadStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

      const results = await Promise.allSettled([
        withTimeout(fetchDistanceByPeriod(user.id, 'monthly', year), 5000, []),
        withTimeout(fetchDistanceByPeriod(user.id, 'weekly', year), 5000, []),
        withTimeout(fetchPersonalBests(user.id), 5000, null),
        withTimeout(fetchDayOfWeekStats(user.id), 5000, []),
        withTimeout(fetchHourOfDayStats(user.id), 5000, []),
        withTimeout(fetchPaceTrend(user.id), 5000, []),
      ]);

      const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
        r.status === 'fulfilled' ? r.value : fallback;

      setMonthlyData(val(results[0], []));
      setWeeklyData(val(results[1], []));
      setPersonalBests(val(results[2], null));
      setDayStats(val(results[3], []));
      setHourStats(val(results[4], []));
      setPaceTrend(val(results[5], []));
    } catch (err) {
      console.warn('[Home] 통계 로드 실패:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [user, year]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // 상세 차트 데이터 로드
  const loadDetail = useCallback(async () => {
    if (!user) return;
    setDetailLoading(true);
    try {
      const result = await fetchDistanceByPeriod(user.id, periodMode, detailYear);
      setDetailData(result);
    } catch {} finally { setDetailLoading(false); }
  }, [user, periodMode, detailYear]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // ========== 요약 계산 ==========
  const todayActivities = useMemo(
    () => activities.filter(a => a.activity_date === todayStr),
    [activities, todayStr]
  );
  const todayKm = todayActivities.reduce((s, a) => s + Number(a.distance_km), 0);
  const todayDuration = todayActivities.reduce((s, a) => s + (a.duration_seconds || 0), 0);
  const todayPaceSec = todayKm > 0 && todayDuration > 0 ? todayDuration / todayKm : null;

  // 오늘 안 뛰면 가장 최근 러닝의 페이스 폴백
  const recentPace = useMemo(() => {
    if (todayPaceSec !== null) return null;
    const withPace = activities.find(a => a.pace_avg_sec_per_km && a.pace_avg_sec_per_km > 0);
    if (!withPace) return null;
    return {
      pace: withPace.pace_avg_sec_per_km as number,
      date: withPace.activity_date,
    };
  }, [todayPaceSec, activities]);

  const monthlyDistance = getMonthlyDistance(activities, year, month);
  const monthlyRunDays = useMemo(() => {
    const daySet = new Set(
      activities
        .filter(a => {
          const d = new Date(a.activity_date);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        })
        .map(a => a.activity_date)
    );
    return daySet.size;
  }, [activities, year, month]);

  // 목표
  const currentGoal = goals.find(g => g.year === year && g.month === month);
  const goalKm = currentGoal?.goal_km || 0;
  const goalProgress = goalKm > 0 ? Math.min((monthlyDistance / goalKm) * 100, 100) : 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();
  const goalRemaining = goalKm > 0 ? Math.max(goalKm - monthlyDistance, 0) : 0;
  const dailyNeeded = daysRemaining > 0 && goalRemaining > 0 ? goalRemaining / daysRemaining : 0;

  // 미니 캘린더
  const calendarActivities = useMemo(() =>
    activities.filter(a => {
      const d = new Date(a.activity_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }),
    [activities, year, month]
  );
  const dateDistanceMap = useMemo(() => {
    const map = new Map<string, number>();
    calendarActivities.forEach(a => {
      map.set(a.activity_date, (map.get(a.activity_date) || 0) + Number(a.distance_km));
    });
    return map;
  }, [calendarActivities]);
  const firstDay = new Date(year, month - 1, 1).getDay();

  // 통산 & 스트릭
  const totalKm = Number(profile?.total_distance_km ?? 0);
  const totalRuns = profile?.total_runs ?? 0;
  const streak = getStreak(activities);
  const maxStreak = getMaxStreak(activities);
  const isRecordBreaking = streak > 0 && streak === maxStreak;
  const daysToRecord = streak > 0 && streak < maxStreak ? maxStreak - streak : 0;

  // 월별 (전년 대비 YTD: 같은 월까지만 비교해야 "전년 대비 -676km" 같은 오해가 없음)
  const ytdMonth = new Date().getMonth(); // 0-11
  const yearlyTotal = monthlyData.slice(0, ytdMonth + 1).reduce((s, d) => s + d.distance, 0);
  const yearlyPrevTotal = monthlyData.slice(0, ytdMonth + 1).reduce((s, d) => s + (d.prevDistance || 0), 0);

  // 일별 거리 (최근 30일) — 월별 차트 대신 홈 첫 차트로 사용
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    activities.forEach(a => {
      map.set(a.activity_date, (map.get(a.activity_date) || 0) + Number(a.distance_km));
    });
    const result: { label: string; distance: number; dateStr: string }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        distance: Math.round((map.get(key) || 0) * 10) / 10,
        dateStr: key,
      });
    }
    return result;
  }, [activities]);
  const daily30Total = dailyData.reduce((s, d) => s + d.distance, 0);

  // 요일/시간대
  const hourGroups = [
    { label: '새벽 (0~6시)', count: hourStats.slice(0, 6).reduce((s, h) => s + h.runCount, 0) },
    { label: '오전 (6~12시)', count: hourStats.slice(6, 12).reduce((s, h) => s + h.runCount, 0) },
    { label: '오후 (12~18시)', count: hourStats.slice(12, 18).reduce((s, h) => s + h.runCount, 0) },
    { label: '저녁 (18~24시)', count: hourStats.slice(18, 24).reduce((s, h) => s + h.runCount, 0) },
  ];
  const maxHourGroup = hourGroups.reduce((m, g) => g.count > m.count ? g : m, hourGroups[0]);
  const maxDay = dayStats.reduce(
    (m, d) => d.runCount > m.runCount ? d : m,
    dayStats[0] || { day: '-', runCount: 0, avgDistance: 0 }
  );

  // 상세 차트 계산
  const detailTotal = detailData.reduce((s, d) => s + d.distance, 0);
  const detailPrevTotal = detailData.reduce((s, d) => s + (d.prevDistance || 0), 0);
  const hasDetailPrev = detailData.some((d) => d.prevDistance !== undefined && d.prevDistance > 0);

  // 주간/월간/연간/누적 요약
  const weekActivities = getWeeklyActivities(activities);
  const weekKm = weekActivities.reduce((s, a) => s + Number(a.distance_km), 0);
  const weekRuns = weekActivities.length;

  const recentActivities = activities.slice(0, 5);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadStats(), refresh()]);
  }, [loadStats, refresh]);

  if (showOnboarding) {
    return <Onboarding onComplete={() => { setShowOnboarding(false); localStorage.setItem('onboarding_done', '1'); }} />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-lg mx-auto pb-8">
      {/* ========== 홈 히어로 (경쟁·소셜 중심) ========== */}
      <HomeRankingHero />
      <HealthRefreshChip onSynced={refresh} />
      <LiveRunningIndicator />
      <RankNeighbors />
      <OnThisDayCard />
      <TodayLocalTop />
      <FriendsLeaderboard />

      <div className="p-4 space-y-4">
      {/* ========== 헤더 ========== */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {profile?.display_name ?? '러너'}님의 {month}월
          </h2>
          <p className="text-xs text-[var(--muted)]">통산 {totalKm.toFixed(0)}km · {totalRuns}회 러닝</p>
        </div>
        <Link href="/history" className="text-sm text-[var(--accent)] font-semibold flex items-center gap-0.5">
          히스토리 <ChevronRight size={16} />
        </Link>
      </div>

      {/* Apple Health 미연동 배너 */}
      {activities.length === 0 && (
        <Link href="/connect" className="block card p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❤️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">Apple Health와 연결해보세요</p>
              <p className="text-xs text-[var(--muted)]">러닝 기록을 자동으로 가져와 분석합니다</p>
            </div>
            <ChevronRight size={16} className="text-[var(--accent)]" />
          </div>
        </Link>
      )}

      {/* 지역 미설정 배너 */}
      {profile && !profile.region_gu && (
        <Link href="/profile/edit" className="block card p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">지역을 설정하면 랭킹에 참여할 수 있어요!</p>
              <p className="text-xs text-[var(--muted)]">프로필에서 시/구/동을 선택해보세요</p>
            </div>
            <ChevronRight size={16} className="text-[var(--accent)]" />
          </div>
        </Link>
      )}

      {/* ========== ① 오늘/이달 4칩 요약 ========== */}
      <div className="card p-5">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-extrabold text-[var(--accent)]">{todayKm.toFixed(1)}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">오늘 km</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--foreground)]">
              {todayPaceSec
                ? formatPace(todayPaceSec)
                : recentPace
                  ? formatPace(recentPace.pace)
                  : '-'}
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {todayPaceSec ? '오늘 페이스' : recentPace ? '최근 페이스' : '오늘 페이스'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-green-600">{monthlyDistance.toFixed(1)}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">이달 km</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-orange-500">{monthlyRunDays}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">이달 일수</p>
          </div>
        </div>
      </div>

      {/* ========== ② 이달 목표 ========== */}
      <div className={`card p-5 relative overflow-hidden ${goalKm > 0 && goalProgress >= 100 ? 'goal-achieved' : ''}`}>
        {/* 달성 시 shimmer 배경 */}
        {goalKm > 0 && goalProgress >= 100 && (
          <div className="absolute inset-0 achievement-shimmer pointer-events-none" />
        )}
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--foreground)]">내 {month}월 목표</h3>
            <Link href="/goals" className="text-sm text-[var(--accent)] font-semibold flex items-center gap-0.5">
              설정 <ChevronRight size={14} />
            </Link>
          </div>
          {goalKm > 0 ? (
            <>
              {/* 큰 숫자 제거 — 4칩의 '이달 km'과 중복. 진행률에 집중 */}
              <div className="bg-[var(--card-border)] rounded-full h-5 overflow-hidden relative mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                    goalProgress >= 100
                      ? 'bg-gradient-to-r from-green-400 to-green-500'
                      : 'bg-gradient-to-r from-[var(--accent)] to-blue-400'
                  }`}
                  style={{ width: `${goalProgress}%` }}
                >
                  {goalProgress > 10 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-base font-bold text-white">
                      {goalProgress.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Flag size={10} className={goalProgress >= 100 ? 'text-green-500' : 'text-[var(--muted)]'} />
                </div>
              </div>
              {goalProgress >= 100 ? (
                <div className="mt-2 flex items-center justify-center gap-1 text-green-600 font-bold">
                  <span className="confetti-emoji">🎉</span>
                  <span className="confetti-emoji">🏆</span>
                  <span className="mx-2 text-base">{goalKm}km 목표 달성!</span>
                  <span className="confetti-emoji">✨</span>
                  <span className="confetti-emoji">🎊</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-xs text-[var(--muted)]">
                  <span>/ <span className="font-semibold text-[var(--foreground)]">{goalKm}km</span> 목표</span>
                  <span>남은 {goalRemaining.toFixed(1)}km · 하루 {dailyNeeded.toFixed(1)}km</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-2">
              <p className="text-3xl">🎯</p>
              <p className="text-sm font-medium text-[var(--foreground)]">아직 이번 달 목표가 없습니다</p>
              <Link href="/goals" className="text-sm text-[var(--accent)] font-semibold inline-block">
                목표 설정하기 →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ========== ③ 월 캘린더 — 클릭 시 홈 안에서 바텀시트 모달 ========== */}
      <button type="button" onClick={() => setShowCalendarSheet(true)} className="block w-full text-left active:scale-[0.995] transition">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--foreground)]">{month}월 캘린더</h3>
            <div className="flex items-center gap-1 text-xs text-[var(--accent)] font-semibold">
              <span>{monthlyRunDays}일 러닝</span>
              <ChevronRight size={14} />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <span key={d} className={`${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[var(--muted)]'}`}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const km = dateDistanceMap.get(dateStr) || 0;
              const bg = miniCalDistanceColor(km, dateStr);
              return (
                <div key={day} className={`aspect-square rounded-md flex items-center justify-center ${bg}`}>
                  <span className={`text-xs font-medium ${km >= 7 ? 'text-white' : 'text-[var(--foreground)]'}`}>{day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2 justify-center text-xs text-[var(--muted)]">
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-white border border-gray-200" /> 0</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-green-200" /> ~3</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-green-400" /> ~7</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-green-600" /> 10+</span>
          </div>
        </div>
      </button>

      {/* 캘린더 바텀시트 — 홈 안에서 열리는 확대 뷰 */}
      {showCalendarSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCalendarSheet(false)}>
          <div className="w-full max-w-lg bg-[var(--card-bg)] rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-slide-up max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-[var(--card-border)] mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--foreground)]">{year}년 {month}월</h3>
              <span className="text-sm font-semibold text-emerald-600">{monthlyRunDays}일 러닝</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-sm mb-2">
              {['일','월','화','수','목','금','토'].map((d, i) => (
                <span key={d} className={`font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[var(--muted)]'}`}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`es-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const km = dateDistanceMap.get(dateStr) || 0;
                const bg = miniCalDistanceColor(km, dateStr);
                return (
                  <div key={day} className={`aspect-square rounded-lg flex flex-col items-center justify-center ${bg}`}>
                    <span className={`text-sm font-bold ${km >= 7 ? 'text-white' : 'text-[var(--foreground)]'}`}>{day}</span>
                    {km > 0 && (
                      <span className={`text-[10px] font-semibold ${km >= 7 ? 'text-white/90' : 'text-[var(--muted)]'}`}>{km.toFixed(1)}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-4 justify-center text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-200" /> 0</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200" /> ~3km</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> ~7km</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600" /> 10km+</span>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCalendarSheet(false)} className="flex-1 py-3 rounded-xl text-[var(--muted)] font-semibold text-base">
                닫기
              </button>
              <Link
                href="/calendar"
                onClick={() => setShowCalendarSheet(false)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-base text-center shadow-md"
              >
                전체 캘린더 열기
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========== ④ 일별 거리 추이 (최근 30일) ========== */}
      <LazyMount minHeight={260}>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[var(--foreground)]">일별 거리 추이</h3>
          <span className="text-xs text-[var(--muted)]">최근 30일 · 총 {daily30Total.toFixed(1)}km</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="homeDailyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray={chartStyle.gridDash} stroke="var(--card-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--muted)' }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis tick={{ fontSize: chartStyle.tickFontSize, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 14, fontSize: 13 }}
              formatter={(value) => [`${value}km`]}
              cursor={{ fill: 'var(--card-border)', opacity: 0.3 }}
            />
            <Bar dataKey="distance" fill="url(#homeDailyGrad)" radius={chartStyle.barRadius} animationDuration={chartStyle.animationDuration} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      </LazyMount>

      {/* ========== ⑤ 주간 거리 트렌드 ========== */}
      {weeklyData.length > 0 && (
        <LazyMount minHeight={240}>
        <div className="card p-5">
          <h3 className="text-base font-bold text-[var(--foreground)] mb-3">최근 12주 러닝</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="homeWeeklyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray={chartStyle.gridDash} stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 14, fontSize: 12 }}
                formatter={(value) => [`${value}km`]}
                cursor={{ fill: 'var(--card-border)', opacity: 0.3 }}
              />
              <Bar dataKey="distance" fill="url(#homeWeeklyGrad)" radius={chartStyle.barRadius} animationDuration={chartStyle.animationDuration} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </LazyMount>
      )}

      {/* ========== ⑥ 페이스 추이 ========== */}
      {paceTrend.some(p => p.avgPace !== null) && (
        <LazyMount minHeight={260}>
        <div className="card p-5">
          <h3 className="text-base font-bold text-[var(--foreground)] mb-3">페이스 추이 (최근 12개월)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={paceTrend.filter(p => p.avgPace !== null)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="homePaceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray={chartStyle.gridDash} stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                reversed
                domain={['dataMin - 20', 'dataMax + 20']}
                tickFormatter={(v: number) => `${Math.floor(v / 60)}'${String(Math.round(v % 60)).padStart(2, '0')}"`}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 14, fontSize: 12 }}
                formatter={(value) => [formatPace(Number(value)), '평균 페이스']}
              />
              <Area type="monotone" dataKey="avgPace" stroke="#10B981" strokeWidth={2.5} fill="url(#homePaceGrad)" dot={{ r: 4, fill: '#10B981' }} animationDuration={chartStyle.animationDuration} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-[var(--muted)] mt-2 text-center">아래로 갈수록 빠른 페이스</p>
        </div>
        </LazyMount>
      )}

      {/* ========== ⑦ 개인 베스트 ========== */}
      {personalBests && (
        <LazyMount minHeight={280}>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-yellow-500" />
            <h3 className="text-base font-semibold text-[var(--foreground)]">개인 베스트</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {personalBests.longestRun && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-xs text-[var(--muted)] mb-1">최장 거리</p>
                <p className="text-2xl font-extrabold text-[var(--foreground)]">{personalBests.longestRun.distance_km.toFixed(2)}km</p>
                <p className="text-xs text-[var(--muted)]">{personalBests.longestRun.date}</p>
              </div>
            )}
            {personalBests.fastestPace && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-xs text-[var(--muted)] mb-1">최빠 페이스</p>
                <p className="text-2xl font-extrabold text-[var(--foreground)]">{formatPace(personalBests.fastestPace.pace)}/km</p>
                <p className="text-xs text-[var(--muted)]">{personalBests.fastestPace.date} ({personalBests.fastestPace.distance_km.toFixed(1)}km)</p>
              </div>
            )}
            {personalBests.longestDuration && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-xs text-[var(--muted)] mb-1">최장 시간</p>
                <p className="text-2xl font-extrabold text-[var(--foreground)]">{formatDuration(personalBests.longestDuration.duration)}</p>
                <p className="text-xs text-[var(--muted)]">{personalBests.longestDuration.date}</p>
              </div>
            )}
            {personalBests.mostCalories && personalBests.mostCalories.calories > 0 && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-xs text-[var(--muted)] mb-1">최다 칼로리</p>
                <p className="text-2xl font-extrabold text-[var(--foreground)]">{personalBests.mostCalories.calories}kcal</p>
                <p className="text-xs text-[var(--muted)]">{personalBests.mostCalories.date}</p>
              </div>
            )}
          </div>
        </div>
        </LazyMount>
      )}

      {/* ========== ⑧ 요일별 패턴 ========== */}
      {dayStats.length > 0 && dayStats.some(d => d.runCount > 0) && (
        <LazyMount minHeight={360}>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-blue-500" />
            <h3 className="text-base font-semibold text-[var(--foreground)]">요일별 러닝 패턴</h3>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">
            주로 <span className="font-semibold text-[var(--accent)]">{maxDay.day}요일</span>에 달려요 ({maxDay.runCount}회)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={dayStats}>
              <PolarGrid stroke="var(--card-border)" strokeDasharray={chartStyle.gridDash} />
              <PolarAngleAxis dataKey="day" tick={{ fontSize: 13, fill: 'var(--muted)', fontWeight: 600 }} />
              <Radar name="러닝 횟수" dataKey="runCount" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} animationDuration={chartStyle.animationDuration} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-7 gap-1 mt-3 text-center">
            {dayStats.map(d => (
              <div key={d.day}>
                <p className="text-xs text-[var(--muted)]">{d.day}</p>
                <p className="text-base font-bold text-[var(--foreground)]">{d.runCount}</p>
                <p className="text-xs text-[var(--muted)]">{d.avgDistance}km</p>
              </div>
            ))}
          </div>
        </div>
        </LazyMount>
      )}

      {/* ========== ⑨ 시간대별 분포 ========== */}
      {hourStats.some(h => h.runCount > 0) && (
        <LazyMount minHeight={220}>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-orange-500" />
            <h3 className="text-base font-semibold text-[var(--foreground)]">시간대별 러닝 분포</h3>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">
            주로 <span className="font-semibold text-[var(--accent)]">{maxHourGroup.label}</span>에 달려요
          </p>
          <div className="space-y-2">
            {hourGroups.map((g, i) => {
              const maxCount = Math.max(...hourGroups.map(g => g.count), 1);
              const barWidth = (g.count / maxCount) * 100;
              const colors = ['#6366F1', '#F59E0B', '#EF4444', '#8B5CF6'];
              return (
                <div key={g.label} className="flex items-center gap-2">
                  <span className="w-24 text-sm text-[var(--foreground)] flex-shrink-0">{g.label}</span>
                  <div className="flex-1 h-5 bg-[var(--card-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(barWidth, 2)}%`, backgroundColor: colors[i] }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-[var(--foreground)] w-8 text-right">{g.count}회</span>
                </div>
              );
            })}
          </div>
        </div>
        </LazyMount>
      )}

      {/* ========== ⑩ 연속 달리기 스트릭 (Wordle 스타일 Current/Max) ========== */}
      <LazyMount minHeight={160}>
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-orange-500" />
          <h3 className="text-base font-semibold text-[var(--foreground)]">연속 달리기 스트릭</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-3xl font-extrabold text-orange-500">{streak}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">현재 연속일</p>
          </div>
          <div className="border-x border-[var(--card-border)]">
            <p className="text-3xl font-extrabold text-purple-500">{maxStreak}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">최장 연속일</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[var(--foreground)]">{totalRuns}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">총 러닝</p>
          </div>
        </div>

        {/* 동기부여 문구 */}
        {isRecordBreaking && maxStreak >= 2 && (
          <p className="text-center text-xs font-bold text-orange-500 mt-3 achievement-shimmer rounded-lg py-1.5">
            🔥 최장 기록 갱신 중!
          </p>
        )}
        {daysToRecord > 0 && daysToRecord <= 3 && (
          <p className="text-center text-xs font-semibold text-[var(--accent)] mt-3">
            역대 최장 기록까지 {daysToRecord}일!
          </p>
        )}
      </div>
      </LazyMount>

      {/* ========== ⑪ 상세 기간별 차트 ========== */}
      <LazyMount minHeight={420}>
      <div className="card p-5">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-3">기간별 상세 통계</h3>

        <div className="flex items-center justify-center gap-4 mb-3">
          <button onClick={() => setDetailYear((y) => y - 1)} className="text-[var(--muted)] text-xl font-bold">&lt;</button>
          <span className="text-lg font-bold text-[var(--foreground)]">{detailYear}</span>
          <button onClick={() => setDetailYear((y) => y + 1)} className="text-[var(--muted)] text-xl font-bold">&gt;</button>
        </div>

        <div className="text-center mb-3">
          <p className="text-3xl font-extrabold text-[var(--accent)]">{detailTotal.toFixed(1)} km</p>
          {hasDetailPrev && detailPrevTotal > 0 && (
            <p className={`text-sm mt-1 ${detailTotal >= detailPrevTotal ? 'text-green-500' : 'text-red-500'}`}>
              전년 대비 {detailTotal >= detailPrevTotal ? '+' : ''}{(detailTotal - detailPrevTotal).toFixed(1)}km
              ({detailPrevTotal > 0 ? ((detailTotal / detailPrevTotal - 1) * 100).toFixed(0) : 0}%)
            </p>
          )}
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPeriodMode(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                periodMode === opt.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card-border)]/50 text-[var(--muted)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              chartType === 'bar' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card-border)]/50 text-[var(--muted)]'
            }`}
          >
            <BarChart3 size={14} /> 막대
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              chartType === 'line' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card-border)]/50 text-[var(--muted)]'
            }`}
          >
            <TrendingUp size={14} /> 선
          </button>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            {chartType === 'bar' ? (
              <BarChart data={detailData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="homeDetailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={chartStyle.gridDash} stroke="var(--card-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: chartStyle.tickFontSize, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: chartStyle.tickFontSize, fill: 'var(--muted)' }} unit="km" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 14, fontSize: 13 }}
                  formatter={(value) => [`${value}km`]}
                  cursor={{ fill: 'var(--card-border)', opacity: 0.3 }}
                />
                {hasDetailPrev && (
                  <Bar dataKey="prevDistance" name={`${detailYear - 1}년`} fill="#CBD5E1" radius={chartStyle.barRadius} animationDuration={chartStyle.animationDuration} />
                )}
                <Bar dataKey="distance" name={`${detailYear}년`} fill="url(#homeDetailGrad)" radius={chartStyle.barRadius} animationDuration={chartStyle.animationDuration} />
                {hasDetailPrev && <Legend wrapperStyle={{ fontSize: 13 }} />}
              </BarChart>
            ) : (
              <AreaChart data={detailData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="homeDetailAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={chartStyle.gridDash} stroke="var(--card-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: chartStyle.tickFontSize, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: chartStyle.tickFontSize, fill: 'var(--muted)' }} unit="km" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 14, fontSize: 13 }}
                  formatter={(value) => [`${value}km`]}
                />
                {hasDetailPrev && (
                  <Area type="monotone" dataKey="prevDistance" name={`${detailYear - 1}년`} stroke="#94a3b8" strokeWidth={2} fill="none" dot={{ r: 3, fill: '#94a3b8' }} animationDuration={chartStyle.animationDuration} />
                )}
                <Area type="monotone" dataKey="distance" name={`${detailYear}년`} stroke="#3B82F6" strokeWidth={chartStyle.strokeWidth} fill="url(#homeDetailAreaGrad)" dot={{ r: chartStyle.dotRadius, fill: '#3B82F6' }} activeDot={{ r: chartStyle.activeDotRadius, strokeWidth: 2 }} animationDuration={chartStyle.animationDuration} />
                {hasDetailPrev && <Legend wrapperStyle={{ fontSize: 13 }} />}
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
      </LazyMount>

      {/* ========== ⑫ 주간/월간/연간/누적 요약 ========== */}
      <LazyMount minHeight={200}>
      <div className="card p-5">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">요약</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--card-border)]/30 rounded-xl p-4">
            <p className="text-xs text-[var(--muted)] mb-1">이번 주</p>
            <p className="text-2xl font-extrabold text-[var(--accent)]">{weekKm.toFixed(1)}<span className="text-sm ml-1">km</span></p>
            <p className="text-xs text-[var(--muted)] mt-1">{weekRuns}회 러닝</p>
          </div>
          <div className="bg-[var(--card-border)]/30 rounded-xl p-4">
            <p className="text-xs text-[var(--muted)] mb-1">이번 달</p>
            <p className="text-2xl font-extrabold text-green-600">{monthlyDistance.toFixed(1)}<span className="text-sm ml-1">km</span></p>
            <p className="text-xs text-[var(--muted)] mt-1">{monthlyRunDays}일 · {calendarActivities.length}회</p>
          </div>
          <div className="bg-[var(--card-border)]/30 rounded-xl p-4">
            <p className="text-xs text-[var(--muted)] mb-1">올해</p>
            <p className="text-2xl font-extrabold text-purple-600">{yearlyTotal.toFixed(0)}<span className="text-sm ml-1">km</span></p>
            {yearlyPrevTotal > 0 && (
              <p className={`text-xs mt-1 ${yearlyTotal >= yearlyPrevTotal ? 'text-green-500' : 'text-red-500'}`}>
                전년 {yearlyTotal >= yearlyPrevTotal ? '+' : ''}{(yearlyTotal - yearlyPrevTotal).toFixed(0)}km
              </p>
            )}
          </div>
          <div className="bg-[var(--card-border)]/30 rounded-xl p-4">
            <p className="text-xs text-[var(--muted)] mb-1">누적</p>
            <p className="text-2xl font-extrabold text-orange-600">{totalKm.toFixed(0)}<span className="text-sm ml-1">km</span></p>
            <p className="text-xs text-[var(--muted)] mt-1">{totalRuns}회 러닝</p>
          </div>
        </div>
      </div>
      </LazyMount>

      {/* ========== ⑬ 최근 활동 ========== */}
      <LazyMount minHeight={300}>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[var(--foreground)]">최근 활동</h3>
          {activities.length > 0 && (
            <Link href="/history" className="text-sm text-[var(--accent)] font-semibold flex items-center gap-0.5">
              전체 기록 <ChevronRight size={14} />
            </Link>
          )}
        </div>
        {userDataLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-3xl">👟</p>
            <p className="text-sm font-medium text-[var(--foreground)]">아직 기록이 없습니다</p>
            <Link href="/connect" className="text-sm text-[var(--accent)] font-semibold inline-block">
              건강 앱 연동하기 →
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
                      <span className="text-[var(--muted)] font-normal ml-2 text-sm">
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

      {/* ⑬ 최근 활동 닫기 */}
      </LazyMount>

      {statsLoading && monthlyData.length === 0 && (
        <p className="text-center text-xs text-[var(--muted)]">통계 로딩 중...</p>
      )}
      </div>

      {/* ========== 하단 루틴포토 인기 캐러셀 (친구×1.5, 동네×1.3 가중치) ========== */}
      <LazyMount rootMargin="400px" minHeight={220}>
        <RoutinePhotoCarousel />
      </LazyMount>
    </div>
    </PullToRefresh>
  );
}
