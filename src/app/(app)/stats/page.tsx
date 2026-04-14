'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell,
} from 'recharts';
import Link from 'next/link';
import { ArrowLeft, Trophy, Flame, TrendingUp, Clock, Zap, Calendar, Target } from 'lucide-react';

export default function StatsPage() {
  const { user, profile } = useAuth();
  const { activities, goals } = useUserData();

  const [monthlyData, setMonthlyData] = useState<PeriodDistance[]>([]);
  const [weeklyData, setWeeklyData] = useState<PeriodDistance[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest | null>(null);
  const [dayStats, setDayStats] = useState<DayOfWeekStat[]>([]);
  const [hourStats, setHourStats] = useState<HourOfDayStat[]>([]);
  const [paceTrend, setPaceTrend] = useState<PaceTrend[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [monthly, weekly, bests, days, hours, pace] = await Promise.all([
        fetchDistanceByPeriod(user.id, 'monthly', year),
        fetchDistanceByPeriod(user.id, 'weekly', year),
        fetchPersonalBests(user.id),
        fetchDayOfWeekStats(user.id),
        fetchHourOfDayStats(user.id),
        fetchPaceTrend(user.id),
      ]);
      setMonthlyData(monthly);
      setWeeklyData(weekly);
      setPersonalBests(bests);
      setDayStats(days);
      setHourStats(hours);
      setPaceTrend(pace);
    } catch {} finally { setLoading(false); }
  }, [user, year]);

  useEffect(() => { loadData(); }, [loadData]);

  // 통계 계산
  const totalKm = profile?.total_distance_km ?? 0;
  const totalRuns = profile?.total_runs ?? 0;
  const streak = getStreak(activities);
  const monthlyDistance = getMonthlyDistance(activities, year, month);

  const yearlyTotal = monthlyData.reduce((s, d) => s + d.distance, 0);
  const yearlyPrevTotal = monthlyData.reduce((s, d) => s + (d.prevDistance || 0), 0);

  // 시간대 분석 — 피크 시간
  const peakHour = hourStats.reduce((max, h) => h.runCount > max.runCount ? h : max, { hour: 0, label: '0시', runCount: 0 });
  const hourGroups = [
    { label: '새벽 (0~6시)', count: hourStats.slice(0, 6).reduce((s, h) => s + h.runCount, 0) },
    { label: '오전 (6~12시)', count: hourStats.slice(6, 12).reduce((s, h) => s + h.runCount, 0) },
    { label: '오후 (12~18시)', count: hourStats.slice(12, 18).reduce((s, h) => s + h.runCount, 0) },
    { label: '저녁 (18~24시)', count: hourStats.slice(18, 24).reduce((s, h) => s + h.runCount, 0) },
  ];
  const maxHourGroup = hourGroups.reduce((max, g) => g.count > max.count ? g : max, hourGroups[0]);

  // 요일별 — 최다 요일
  const maxDay = dayStats.reduce((max, d) => d.runCount > max.runCount ? d : max, dayStats[0] || { day: '-', runCount: 0 });

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
          <h1 className="text-lg font-bold text-[var(--foreground)]">내 통계</h1>
        </div>
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-lg font-bold text-[var(--foreground)] flex-1">내 통계</h1>
        <Link href="/stats/charts" className="text-xs text-[var(--accent)] font-semibold">상세 차트</Link>
      </div>

      {/* ========== 요약 카드 ========== */}
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
            <p className="text-lg font-bold text-[var(--foreground)]">{profile?.display_name}</p>
            <p className="text-xs text-[var(--muted)]">통산 {Number(totalKm).toFixed(0)}km · {totalRuns}회 러닝</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-[var(--accent)]">{monthlyDistance.toFixed(1)}</p>
            <p className="text-[10px] text-[var(--muted)]">이달 km</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--foreground)]">{yearlyTotal.toFixed(0)}</p>
            <p className="text-[10px] text-[var(--muted)]">올해 km</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--foreground)]">{streak}</p>
            <p className="text-[10px] text-[var(--muted)]">연속일 🔥</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--foreground)]">{totalRuns}</p>
            <p className="text-[10px] text-[var(--muted)]">총 러닝</p>
          </div>
        </div>
      </div>

      {/* ========== 월간 거리 차트 (작년 비교) ========== */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">월별 거리 추이</h3>
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
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 11 }}
              formatter={(value) => [`${value}km`]}
            />
            {yearlyPrevTotal > 0 && (
              <Bar dataKey="prevDistance" name={`${year - 1}년`} fill="#94a3b8" radius={[3, 3, 0, 0]} />
            )}
            <Bar dataKey="distance" name={`${year}년`} fill="#3B82F6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ========== 주간 러닝 트렌드 ========== */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-3">최근 12주 러닝</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 11 }}
              formatter={(value) => [`${value}km`]}
            />
            <Bar dataKey="distance" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ========== 페이스 추이 ========== */}
      {paceTrend.some(p => p.avgPace !== null) && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-3">페이스 추이 (최근 12개월)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={paceTrend.filter(p => p.avgPace !== null)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                reversed
                domain={['dataMin - 20', 'dataMax + 20']}
                tickFormatter={(v: number) => `${Math.floor(v / 60)}'${String(v % 60).padStart(2, '0')}"`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 11 }}
                formatter={(value) => [formatPace(Number(value)), '평균 페이스']}
              />
              <Line type="monotone" dataKey="avgPace" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-[var(--muted)] mt-2 text-center">아래로 갈수록 빠른 페이스 (1km+ 러닝만 포함)</p>
        </div>
      )}

      {/* ========== 개인 베스트 ========== */}
      {personalBests && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-yellow-500" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">개인 베스트</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {personalBests.longestRun && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-[10px] text-[var(--muted)] mb-1">최장 거리</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{personalBests.longestRun.distance_km.toFixed(2)}km</p>
                <p className="text-[10px] text-[var(--muted)]">{personalBests.longestRun.date}</p>
              </div>
            )}
            {personalBests.fastestPace && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-[10px] text-[var(--muted)] mb-1">최빠 페이스</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{formatPace(personalBests.fastestPace.pace)}/km</p>
                <p className="text-[10px] text-[var(--muted)]">{personalBests.fastestPace.date} ({personalBests.fastestPace.distance_km.toFixed(1)}km)</p>
              </div>
            )}
            {personalBests.longestDuration && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-[10px] text-[var(--muted)] mb-1">최장 시간</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{formatDuration(personalBests.longestDuration.duration)}</p>
                <p className="text-[10px] text-[var(--muted)]">{personalBests.longestDuration.date}</p>
              </div>
            )}
            {personalBests.mostCalories && (
              <div className="bg-[var(--card-border)]/30 rounded-xl p-3">
                <p className="text-[10px] text-[var(--muted)] mb-1">최다 칼로리</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{personalBests.mostCalories.calories}kcal</p>
                <p className="text-[10px] text-[var(--muted)]">{personalBests.mostCalories.date}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== 요일별 패턴 (레이더 차트) ========== */}
      {dayStats.length > 0 && dayStats.some(d => d.runCount > 0) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">요일별 러닝 패턴</h3>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">
            주로 <span className="font-semibold text-[var(--accent)]">{maxDay.day}요일</span>에 달려요 ({maxDay.runCount}회)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={dayStats}>
              <PolarGrid stroke="var(--card-border)" />
              <PolarAngleAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <Radar name="러닝 횟수" dataKey="runCount" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
          {/* 요일별 상세 */}
          <div className="grid grid-cols-7 gap-1 mt-3 text-center">
            {dayStats.map(d => (
              <div key={d.day}>
                <p className="text-[10px] text-[var(--muted)]">{d.day}</p>
                <p className="text-xs font-bold text-[var(--foreground)]">{d.runCount}</p>
                <p className="text-[8px] text-[var(--muted)]">{d.avgDistance}km</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== 시간대별 분포 ========== */}
      {hourStats.some(h => h.runCount > 0) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-orange-500" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">시간대별 러닝 분포</h3>
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
                  <span className="w-24 text-xs text-[var(--foreground)] flex-shrink-0">{g.label}</span>
                  <div className="flex-1 h-5 bg-[var(--card-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(barWidth, 2)}%`, backgroundColor: colors[i] }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--foreground)] w-8 text-right">{g.count}회</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== 연속 달리기 스트릭 ========== */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-orange-500" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">연속 달리기 스트릭</h3>
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
    </div>
  );
}
