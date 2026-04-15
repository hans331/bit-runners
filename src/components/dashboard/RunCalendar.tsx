'use client';

import { useState } from 'react';
import { useData, getCalendarData } from '@/components/DataProvider';

export default function RunCalendar() {
  const { runningLogs, members } = useData();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const days = getCalendarData(runningLogs, members, year, month);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=일
  const totalMembers = members.filter(m => m.status === 'active').length;

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedDayData = selectedDay ? days.find(d => d.day === selectedDay) : null;

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800/50 text-[var(--muted)]';
    const ratio = count / totalMembers;
    if (ratio >= 0.5) return 'bg-emerald-500 text-white';
    if (ratio >= 0.3) return 'bg-emerald-400 text-white';
    if (ratio >= 0.15) return 'bg-emerald-300 dark:bg-emerald-600 text-emerald-900 dark:text-white';
    return 'bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-100';
  };

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-[var(--foreground)]">러닝 캘린더</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--card-border)] text-[var(--muted)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="text-base font-semibold text-[var(--foreground)] w-28 text-center">{year}.{month}월</span>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--card-border)] text-[var(--muted)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(d => (
          <div key={d} className={`text-center text-sm font-medium py-1.5 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-[var(--muted)]'}`}>{d}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map(day => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day === selectedDay ? null : day.day)}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all hover:ring-2 hover:ring-[var(--accent)] ${getColor(day.count)} ${selectedDay === day.day ? 'ring-2 ring-[var(--accent)]' : ''}`}
          >
            <span className="text-sm leading-none">{day.day}</span>
            {day.count > 0 && <span className="text-base font-bold leading-none mt-0.5">{day.count}명</span>}
          </button>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--card-border)] text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-500" /> 50%+</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-300 dark:bg-emerald-600" /> 15%+</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-amber-200 dark:bg-amber-700" /> 1명+</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800" /> 0명</span>
      </div>

      {/* 선택한 날의 상세 */}
      {selectedDayData && selectedDayData.count > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
          <p className="text-sm font-semibold text-[var(--foreground)] mb-2">{month}/{selectedDayData.day} 러닝 ({selectedDayData.count}명)</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedDayData.runners.sort((a, b) => b.distance - a.distance).map(r => (
              <span key={r.name} className="text-sm bg-[var(--card-border)] text-[var(--foreground)] px-2.5 py-1.5 rounded-xl">
                {r.name} <span className="font-mono font-semibold text-[var(--accent)]">{r.distance.toFixed(1)}km</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
