'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { getStreak, getMonthlyDistance, formatPace, formatDuration } from '@/lib/routinist-data';
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
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts';
import Link from 'next/link';
import { Trophy, Flame, Clock, Calendar, ChevronRight, BarChart3, TrendingUp } from 'lucide-react';

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
    if (cellDate > today) return 'bg-white dark:bg-white/10';
    return 'bg-gray-100 dark:bg-gray-100/20';
  }
  if (km < 3) return 'bg-green-200 dark:bg-green-800/40';
  if (km < 5) return 'bg-green-300 dark:bg-green-700/50';
  if (km < 7) return 'bg-green-400 dark:bg-green-700/60';
  if (km < 10) return 'bg-green-500 dark:bg-green-600/70';
  return 'bg-green-600 dark:bg-green-600/80';
}

export default function StatsPage() {
  const { user, profile } = useAuth();
  const { activities } = useUserData();

  const [monthlyData, setMonthlyData] = useState<PeriodDistance[]>([]);
  const [weeklyData, setWeeklyData] = useState<PeriodDistance[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest | null>(null);
  const [dayStats, setDayStats] = useState<DayOfWeekStat[]>([]);
  const [hourStats, setHourStats] = useState<HourOfDayStat[]>([]);
  const [paceTrend, setPaceTrend] = useState<PaceTrend[]>([]);
  const [loading, setLoading] = useState(true);

  // 상세 차트 상태
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [detailYear, setDetailYear] = useState(new Date().getFullYear());
  const [detailData, setDetailData] = useState<PeriodDistance[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 메인 데이터 로드
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

      const results = await Promise.allSettled([
        withTimeout(fetchDistanceByPeriod(user.id, 'monthly', year), 10000, []),
        withTimeout(fetchDistanceByPeriod(user.id, 'weekly', year), 10000, []),
        withTimeout(fetchPersonalBests(user.id), 10000, null),
        withTimeout(fetchDayOfWeekStats(user.id), 10000, []),
        withTimeout(fetchHourOfDayStats(user.id), 10000, []),
        withTimeout(fetchPaceTrend(user.id), 10000, []),
      ]);

      const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
        r.status === 'fulfilled' ? r.value : fallback;

      setMonthlyData(val(results[0], []));
      setWeeklyData(val(results[1], []));
      setPersonalBests(val(results[2], null));
      setDayStats(val(results[3], []));
      setHourStats(val(results[4], []));
      setPaceTrend(val(results[5], []));

      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn(`[Stats] Query ${i} failed:`, r.reason);
      });
    } catch (err) {
      console.warn('[Stats] 데이터 로드 실패:', err);
    } finally { setLoading(false); }
  }, [user, year]);

  useEffect(() => { loadData(); }, [loadData]);

  // 상세 차트 데이터 로드
  const loadDetailData = useCallback(async () => {
    if (!user) return;
    setDetailLoading(true);
    try {
      const result = await fetchDistanceByPeriod(user.id, periodMode, detailYear);
      setDetailData(result);
    } catch {} finally { setDetailLoading(false); }
  }, [user, periodMode, detailYear]);

  useEffect(() => { loadDetailData(); }, [loadDetailData]);

  // 미니 캘린더 데이터
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
      const key = a.activity_date;
      map.set(key, (map.get(key) || 0) + Number(a.distance_km));
    });
    return map;
  }, [calendarActivities]);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const runDays = new Set(calendarActivities.map(a => a.activity_date)).size;

  // 통계 계산
  const totalKm = profile?.total_distance_km ?? 0;
  const totalRuns = profile?.total_runs ?? 0;
  const streak = getStreak(activities);
  const monthlyDistance = getMonthlyDistance(activities, year, month);

  const yearlyTotal = monthlyData.reduce((s, d) => s + d.distance, 0);
  const yearlyPrevTotal = monthlyData.reduce((s, d) => s + (d.prevDistance || 0), 0);

  // 시간대 분석
  const hourGroups = [
    { label: '새벽 (0~6시)', count: hourStats.slice(0, 6).reduce((s, h) => s + h.runCount, 0) },
    { label: '오전 (6~12시)', count: hourStats.slice(6, 12).reduce((s, h) => s + h.runCount, 0) },
    { label: '오후 (12~18시)', count: hourStats.slice(12, 18).reduce((s, h) => s + h.runCount, 0) },
    { label: '저녁 (18~24시)', count: hourStats.slice(18, 24).reduce((s, h) => s + h.runCount, 0) },
  ];
  const maxHourGroup = hourGroups.reduce((max, g) => g.count > max.count ? g : max, hourGroups[0]);

  // 요일별
  const maxDay = dayStats.reduce((max, d) => d.runCount > max.runCount ? d : max, dayStats[0] || { day: '-', runCount: 0 });

  // 상세 차트 계산
  const detailTotal = detailData.reduce((s, d) => s + d.distance, 0);
  const detailPrevTotal = detailData.reduce((s, d) => s + (d.prevDistance || 0), 0);
  const hasDetailPrev = detailData.some((d) => d.prevDistance !== undefined && d.prevDistance > 0);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] mb-4">내 통계</h1>
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-8">
      {/* 헤더 */}
      <h1 className="text-2xl font-extrabold text-[var(--foreground)]">내 통계</h1>

      {/* ========== 1. 프로필 요약 카드 ========== */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🏃🏻</div>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--foreground)]">{profile?.display_name}</p>
            <p className="text-xs text-[var(--muted)]">통산 {Number(totalKm).toFixed(0)}km · {totalRuns}회 러닝</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-3xl font-extrabold text-[var(--accent)]">{monthlyDistance.toFixed(1)}</p>
            <p className="text-xs text-[var(--muted)]">이달 km</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[var(--foreground)]">{yearlyTotal.toFixed(0)}</p>
            <p className="text-xs text-[var(--muted)]">올해 km</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[var(--foreground)]">{streak}</p>
            <p className="text-xs text-[var(--muted)]">연속일 🔥</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[var(--foreground)]">{totalRuns}</p>
            <p className="text-xs text-[var(--muted)]">총 러닝</p>
          </div>
        </div>
      </div>

      {/* ========== 2. 미니 캘린더 ========== */}
      <Link href="/calendar" className="block">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[var(--foreground)]">{month}월 캘린더</h3>
            <div className="flex items-center gap-1 text-xs text-[var(--accent)] font-semibold">
              <span>{runDays}일 러닝</span>
              <ChevronRight size={14} />
            </div>
          </div>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-1">
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <span key={d} className={`${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[var(--muted)]'}`}>{d}</span>
            ))}
          </div>
          {/* 날짜 그리드 */}
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
                  <span className={`text-[11px] font-medium ${km >= 7 ? 'text-white' : 'text-[var(--foreground)]'}`}>{day}</span>
                </div>
              );
            })}
          </div>
          {/* 범례 */}
          <div className="flex items-center gap-2 mt-2 justify-center text-[10px] text-[var(--muted)]">
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-white border border-gray-200" /> 0</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-green-200" /> ~3</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-green-400" /> ~7</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-green-600" /> 10+</span>
          </div>
        </div>
      </Link>

      {/* ========== 3. 월별 거리 차트 (작년 비교) ========== */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[var(--foreground)]">월별 거리 추이</h3>
          <span className="text-xs text-[var(--muted)]">
            {yearlyPrevTotal > 0 && (
              <span className={yearlyTotal >= yearlyPrevTotal ? 'text-green-500' : 'text-red-500'}>
                전년 대비 {yearlyTotal >= yearlyPrevTotal ? '+' : ''}{(yearlyTotal - yearlyPrevTotal).toFixed(0)}km
              </span>
            )}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 14 }}
              formatter={(value) => [`${value}km`]}
            />
            {yearlyPrevTotal > 0 && (
              <Bar dataKey="prevDistance" name={`${year - 1}년`} fill="#94a3b8" radius={[3, 3, 0, 0]} />
            )}
            <Bar dataKey="distance" name={`${year}년`} fill="#3B82F6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ========== 4. 주간 러닝 트렌드 ========== */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-3">최근 12주 러닝</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 13, fill: 'var(--muted)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 14 }}
              formatter={(value) => [`${value}km`]}
            />
            <Bar dataKey="distance" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ========== 5. 페이스 추이 ========== */}
      {paceTrend.some(p => p.avgPace !== null) && (
        <div className="card p-5">
          <h3 className="text-base font-bold text-[var(--foreground)] mb-3">페이스 추이 (최근 12개월)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={paceTrend.filter(p => p.avgPace !== null)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--muted)' }}
                reversed
                domain={['dataMin - 20', 'dataMax + 20']}
                tickFormatter={(v: number) => `${Math.floor(v / 60)}'${String(v % 60).padStart(2, '0')}"`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 14 }}
                formatter={(value) => [formatPace(Number(value)), '평균 페이스']}
              />
              <Line type="monotone" dataKey="avgPace" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-[var(--muted)] mt-2 text-center">아래로 갈수록 빠른 페이스 (1km+ 러닝만 포함)</p>
        </div>
      )}

      {/* ========== 6. 개인 베스트 ========== */}
      {personalBests && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-yellow-500" />
            <h3 className="text-base font-bold text-[var(--foreground)]">개인 베스트</h3>
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
            {personalBests.mostCalories && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-xs text-[var(--muted)] mb-1">최다 칼로리</p>
                <p className="text-2xl font-extrabold text-[var(--foreground)]">{personalBests.mostCalories.calories}kcal</p>
                <p className="text-xs text-[var(--muted)]">{personalBests.mostCalories.date}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== 7. 요일별 패턴 (레이더 차트) ========== */}
      {dayStats.length > 0 && dayStats.some(d => d.runCount > 0) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-blue-500" />
            <h3 className="text-base font-bold text-[var(--foreground)]">요일별 러닝 패턴</h3>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">
            주로 <span className="font-semibold text-[var(--accent)]">{maxDay.day}요일</span>에 달려요 ({maxDay.runCount}회)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={dayStats}>
              <PolarGrid stroke="var(--card-border)" />
              <PolarAngleAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
              <Radar name="러닝 횟수" dataKey="runCount" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
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
      )}

      {/* ========== 8. 시간대별 분포 ========== */}
      {hourStats.some(h => h.runCount > 0) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-orange-500" />
            <h3 className="text-base font-bold text-[var(--foreground)]">시간대별 러닝 분포</h3>
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
      )}

      {/* ========== 9. 연속 달리기 스트릭 ========== */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-orange-500" />
          <h3 className="text-base font-bold text-[var(--foreground)]">연속 달리기 스트릭</h3>
        </div>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-extrabold text-orange-500">{streak}</p>
            <p className="text-xs text-[var(--muted)]">현재 연속일</p>
          </div>
          <div className="w-px h-12 bg-[var(--card-border)]" />
          <div className="text-center">
            <p className="text-4xl font-extrabold text-[var(--foreground)]">{totalRuns}</p>
            <p className="text-xs text-[var(--muted)]">총 러닝 횟수</p>
          </div>
        </div>
      </div>

      {/* ========== 10. 상세 기간별 차트 ========== */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-3">기간별 상세 통계</h3>

        {/* 연도 선택 */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <button onClick={() => setDetailYear((y) => y - 1)} className="text-[var(--muted)] text-xl font-extrabold">&lt;</button>
          <span className="text-lg font-extrabold text-[var(--foreground)]">{detailYear}</span>
          <button onClick={() => setDetailYear((y) => y + 1)} className="text-[var(--muted)] text-xl font-extrabold">&gt;</button>
        </div>

        {/* 총 거리 */}
        <div className="text-center mb-3">
          <p className="text-3xl font-extrabold text-[var(--accent)]">{detailTotal.toFixed(1)} km</p>
          {hasDetailPrev && detailPrevTotal > 0 && (
            <p className={`text-sm mt-1 ${detailTotal >= detailPrevTotal ? 'text-green-500' : 'text-red-500'}`}>
              전년 대비 {detailTotal >= detailPrevTotal ? '+' : ''}{(detailTotal - detailPrevTotal).toFixed(1)}km
              ({detailPrevTotal > 0 ? ((detailTotal / detailPrevTotal - 1) * 100).toFixed(0) : 0}%)
            </p>
          )}
        </div>

        {/* 기간 탭 */}
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

        {/* 차트 타입 토글 */}
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

        {/* 차트 */}
        {detailLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            {chartType === 'bar' ? (
              <BarChart data={detailData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} unit="km" />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 14 }}
                  formatter={(value) => [`${value}km`]}
                />
                {hasDetailPrev && (
                  <Bar dataKey="prevDistance" name={`${detailYear - 1}년`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                )}
                <Bar dataKey="distance" name={`${detailYear}년`} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                {hasDetailPrev && <Legend wrapperStyle={{ fontSize: 14 }} />}
              </BarChart>
            ) : (
              <LineChart data={detailData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} unit="km" />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 14 }}
                  formatter={(value) => [`${value}km`]}
                />
                {hasDetailPrev && (
                  <Line type="monotone" dataKey="prevDistance" name={`${detailYear - 1}년`} stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
                )}
                <Line type="monotone" dataKey="distance" name={`${detailYear}년`} stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
                {hasDetailPrev && <Legend wrapperStyle={{ fontSize: 14 }} />}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* 기간별 상세 내역 */}
      {detailData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--foreground)] px-5 pt-4 pb-2">상세 내역</h3>
          <div className="divide-y divide-[var(--card-border)]">
            {detailData.map((d) => (
              <div key={d.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-[var(--foreground)]">{d.label}</span>
                <div className="text-right">
                  <p className="text-base font-bold text-[var(--foreground)]">{d.distance.toFixed(1)} km</p>
                  {d.prevDistance !== undefined && d.prevDistance > 0 && (
                    <p className={`text-sm ${d.distance >= d.prevDistance ? 'text-green-500' : 'text-red-500'}`}>
                      전년 {d.prevDistance.toFixed(1)}km
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
