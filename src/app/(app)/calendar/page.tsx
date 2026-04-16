'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { getMonthlyDistance, formatDuration } from '@/lib/routinist-data';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActivityPhoto } from '@/types';

// 거리에 따른 배경색 반환
function distanceColor(km: number, dateStr: string): string {
  if (km <= 0) {
    // 미래 날짜는 흰색/다크 회색, 오늘 포함 과거는 연한 회색
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(dateStr + 'T00:00:00');
    if (cellDate > today) return 'bg-white dark:bg-zinc-800';
    return 'bg-gray-100 dark:bg-zinc-700';
  }
  if (km < 3) return 'bg-pink-100 dark:bg-pink-800/50';
  if (km < 5) return 'bg-yellow-100 dark:bg-yellow-700/50';
  if (km < 7) return 'bg-green-200 dark:bg-green-700/60';
  if (km < 10) return 'bg-green-400 dark:bg-green-600/70';
  return 'bg-green-600 dark:bg-green-500/80 text-white';
}

// 거리에 따른 텍스트 색
function distanceTextColor(km: number): string {
  if (km >= 10) return 'text-white';
  if (km >= 7) return 'text-white';
  return 'text-[var(--foreground)]';
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { activities, loading } = useUserData();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // 사진 데이터
  const [photos, setPhotos] = useState<Map<string, string>>(new Map());

  // 월간 활동 데이터
  const monthlyActivities = useMemo(() =>
    activities.filter(a => {
      const d = new Date(a.activity_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }),
    [activities, year, month]
  );

  // 날짜별 거리 합산
  const dateDistanceMap = useMemo(() => {
    const map = new Map<string, number>();
    monthlyActivities.forEach(a => {
      const key = a.activity_date;
      map.set(key, (map.get(key) || 0) + Number(a.distance_km));
    });
    return map;
  }, [monthlyActivities]);

  // 날짜별 활동 ID (상세 이동용)
  const dateActivityMap = useMemo(() => {
    const map = new Map<string, string[]>();
    monthlyActivities.forEach(a => {
      const key = a.activity_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a.id);
    });
    return map;
  }, [monthlyActivities]);

  // 사진 로드
  const loadPhotos = useCallback(async () => {
    if (!user || monthlyActivities.length === 0) return;
    const supabase = getSupabase();
    const activityIds = monthlyActivities.map(a => a.id);

    const { data } = await supabase
      .from('activity_photos')
      .select('activity_id, photo_url')
      .in('activity_id', activityIds)
      .order('sort_order', { ascending: true });

    if (!data?.length) return;

    // activity_id → activity_date 매핑
    const actDateMap = new Map<string, string>();
    monthlyActivities.forEach(a => actDateMap.set(a.id, a.activity_date));

    const photoMap = new Map<string, string>();
    data.forEach(p => {
      const date = actDateMap.get(p.activity_id);
      if (date && !photoMap.has(date)) {
        photoMap.set(date, p.photo_url);
      }
    });

    setPhotos(photoMap);
  }, [user, monthlyActivities]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const monthlyDistance = getMonthlyDistance(activities, year, month);
  const totalDuration = monthlyActivities.reduce((s, a) => s + (a.duration_seconds || 0), 0);
  const runDays = new Set(monthlyActivities.map(a => a.activity_date)).size;

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
      <h2 className="text-xl font-extrabold text-[var(--foreground)]">러닝 캘린더</h2>

      {/* 월 선택 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--card-border)] transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="text-2xl font-extrabold text-[var(--foreground)]">{year}년 {month}월</span>
        <button onClick={nextMonth} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--card-border)] transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 월간 요약 */}
      <div className="card p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[var(--accent)]">{monthlyDistance.toFixed(1)}</p>
            <p className="text-xs text-[var(--muted)]">km</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{runDays}</p>
            <p className="text-xs text-[var(--muted)]">러닝 일수</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{totalDuration > 0 ? formatDuration(totalDuration) : '-'}</p>
            <p className="text-xs text-[var(--muted)]">시간</p>
          </div>
        </div>
      </div>

      {/* ========== DayOne 스타일 캘린더 ========== */}
      <div className="card p-4">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
          {['일','월','화','수','목','금','토'].map((d, i) => (
            <span key={d} className={`py-1 font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[var(--muted)]'}`}>{d}</span>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {/* 빈 칸 */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* 날짜 */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const km = dateDistanceMap.get(dateStr) || 0;
            const actIds = dateActivityMap.get(dateStr);
            const photoUrl = photos.get(dateStr);
            const hasPhoto = !!photoUrl;
            const bgColor = distanceColor(km, dateStr);
            const textColor = distanceTextColor(km);

            const cell = (
              <div
                className={`aspect-square rounded-lg relative overflow-hidden flex flex-col items-center justify-center ${
                  hasPhoto ? '' : bgColor
                } ${km > 0 ? 'ring-1 ring-green-300/50' : ''}`}
              >
                {/* 사진 배경 */}
                {hasPhoto && (
                  <>
                    <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30" />
                  </>
                )}

                {/* 날짜 */}
                <span className={`text-sm font-semibold relative z-10 ${
                  hasPhoto ? 'text-white' : textColor
                }`}>
                  {day}
                </span>

                {/* 거리 */}
                {km > 0 && (
                  <span className={`text-sm font-medium relative z-10 ${
                    hasPhoto ? 'text-white/90' : 'text-[var(--muted)]'
                  }`}>
                    {km.toFixed(1)}
                  </span>
                )}
              </div>
            );

            // 활동이 있으면 클릭 가능
            if (actIds?.length === 1) {
              return <Link key={day} href={`/activity?id=${actIds[0]}`}>{cell}</Link>;
            } else if (actIds && actIds.length > 1) {
              // 같은 날 여러 활동이면 첫 활동으로 이동
              return <Link key={day} href={`/activity?id=${actIds[0]}`}>{cell}</Link>;
            }
            return <div key={day}>{cell}</div>;
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-2 mt-4 justify-center text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600" /> 0km</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink-100 dark:bg-pink-800/50" /> ~3</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-700/50" /> ~5</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 dark:bg-green-700/60" /> ~7</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 dark:bg-green-600/70" /> ~10</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 dark:bg-green-500/80" /> 10+</span>
        </div>
      </div>

      {/* 이달 활동 리스트 */}
      {!loading && monthlyActivities.length > 0 && (
        <div className="card p-5">
          <h3 className="text-base font-bold text-[var(--foreground)] mb-3">이달의 러닝</h3>
          <div className="space-y-2">
            {monthlyActivities.map(a => (
              <Link
                key={a.id}
                href={`/activity?id=${a.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--card-border)]/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{a.distance_km.toFixed(2)} km</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(a.activity_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                    {a.duration_seconds && ` · ${formatDuration(a.duration_seconds)}`}
                  </p>
                </div>
                <ChevronRight size={14} className="text-[var(--muted)]" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
