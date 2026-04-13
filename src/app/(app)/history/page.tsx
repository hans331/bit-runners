'use client';

import { useState, useMemo } from 'react';
import { useUserData } from '@/components/UserDataProvider';
import { getMonthlyDistance, formatPace, formatDuration } from '@/lib/routinist-data';
import Link from 'next/link';

export default function HistoryPage() {
  const { activities, loading } = useUserData();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthlyActivities = useMemo(() =>
    activities.filter(a => {
      const d = new Date(a.activity_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }),
    [activities, year, month]
  );

  const monthlyDistance = getMonthlyDistance(activities, year, month);
  const totalDuration = monthlyActivities.reduce((s, a) => s + (a.duration_seconds || 0), 0);

  // 캘린더 데이터
  const runDates = new Set(monthlyActivities.map(a => a.activity_date));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
      <h2 className="text-xl font-extrabold text-[var(--foreground)]">기록</h2>

      {/* 월 선택 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--card-border)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="text-lg font-bold text-[var(--foreground)]">{year}년 {month}월</span>
        <button onClick={nextMonth} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--card-border)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* 월간 요약 */}
      <div className="card p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[var(--accent)]">{monthlyDistance.toFixed(1)}</p>
            <p className="text-xs text-[var(--muted)]">km</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{monthlyActivities.length}</p>
            <p className="text-xs text-[var(--muted)]">러닝</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{totalDuration > 0 ? formatDuration(totalDuration) : '-'}</p>
            <p className="text-xs text-[var(--muted)]">시간</p>
          </div>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="card p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
          {['일','월','화','수','목','금','토'].map(d => (
            <span key={d} className="text-[var(--muted)] py-1">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasRun = runDates.has(dateStr);
            return (
              <div
                key={day}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium ${
                  hasRun
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--foreground)]'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* 활동 리스트 */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : monthlyActivities.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">이 달의 기록이 없습니다.</p>
        ) : (
          monthlyActivities.map(a => (
            <Link
              key={a.id}
              href={`/activity?id=${a.id}`}
              className="card flex items-center gap-3 p-4 hover:bg-[var(--card-border)]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {a.distance_km.toFixed(2)} km
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(a.activity_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                  {a.duration_seconds && ` · ${formatDuration(a.duration_seconds)}`}
                  {a.pace_avg_sec_per_km && ` · ${formatPace(a.pace_avg_sec_per_km)}/km`}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
