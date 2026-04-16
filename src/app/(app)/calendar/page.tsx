'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { getMonthlyDistance, formatDuration } from '@/lib/routinist-data';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import type { ActivityPhoto } from '@/types';

// Git 잔디 스타일 — 초록 단일 그라데이션
function distanceColor(km: number, dateStr: string): string {
  if (km <= 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(dateStr + 'T00:00:00');
    // 미래 날짜: 아주 연한 연두
    if (cellDate > today) return 'bg-green-50 dark:bg-green-950/20';
    // 오늘 이전 미러닝: 연한 회색
    return 'bg-gray-100 dark:bg-zinc-800/50';
  }
  if (km < 3) return 'bg-green-200 dark:bg-green-900/40';
  if (km < 5) return 'bg-green-300 dark:bg-green-800/50';
  if (km < 7) return 'bg-green-400 dark:bg-green-700/60';
  if (km < 10) return 'bg-green-500 dark:bg-green-600/70';
  return 'bg-green-600 dark:bg-green-500/80';
}

function distanceTextColor(km: number): string {
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
  const [customPhotos, setCustomPhotos] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null); // 날짜 상세 모달

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

  // 커스텀 캘린더 사진 로드
  const loadCustomPhotos = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('calendar_photos')
      .select('date, photo_url')
      .eq('user_id', user.id)
      .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lte('date', `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`);

    if (data?.length) {
      const map = new Map<string, string>();
      data.forEach(p => map.set(p.date, p.photo_url));
      setCustomPhotos(map);
    }
  }, [user, year, month]);

  useEffect(() => { loadCustomPhotos(); }, [loadCustomPhotos]);

  // 사진 선택 핸들러
  const handlePhotoSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedDate) return;

    setUploading(true);
    try {
      const supabase = getSupabase();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `calendar/${user.id}/${selectedDate}.${ext}`;

      await supabase.storage.from('photos').upload(path, file, { upsert: true });

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
      const photoUrl = urlData.publicUrl + '?t=' + Date.now();

      // calendar_photos 테이블에 저장 (upsert)
      await supabase.from('calendar_photos').upsert({
        user_id: user.id,
        date: selectedDate,
        photo_url: photoUrl,
      }, { onConflict: 'user_id,date' });

      setCustomPhotos(prev => {
        const next = new Map(prev);
        next.set(selectedDate, photoUrl);
        return next;
      });
    } catch (err) {
      console.warn('사진 업로드 실패:', err);
    } finally {
      setUploading(false);
      setSelectedDate(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploading && (
        <div className="card p-3 text-center">
          <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-[var(--muted)] mt-1">사진 업로드 중...</p>
        </div>
      )}

      {/* 월 선택 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--card-border)] transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="text-2xl font-bold text-[var(--foreground)]">{year}년 {month}월</span>
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
            const photoUrl = customPhotos.get(dateStr) || photos.get(dateStr);
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

                {/* 사진 추가 아이콘 (활동이 있는 날만) */}
                {km > 0 && !hasPhoto && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePhotoSelect(dateStr); }}
                    className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/20 flex items-center justify-center z-20"
                  >
                    <Camera size={8} className="text-white" />
                  </button>
                )}
              </div>
            );

            // 활동이 있으면 상세 모달 열기
            if (km > 0) {
              return (
                <div key={day} onClick={() => setShowDetail(dateStr)} className="cursor-pointer">
                  {cell}
                </div>
              );
            }
            return <div key={day}>{cell}</div>;
          })}
        </div>

        {/* 범례 — git 잔디 블록 스타일 */}
        <div className="flex items-center gap-1.5 mt-4 justify-center text-xs text-[var(--muted)]">
          <span>0</span>
          <span className="w-4 h-4 rounded-sm bg-gray-100 dark:bg-zinc-800/50" />
          <span className="w-4 h-4 rounded-sm bg-green-200 dark:bg-green-900/40" />
          <span className="w-4 h-4 rounded-sm bg-green-400 dark:bg-green-700/60" />
          <span className="w-4 h-4 rounded-sm bg-green-500 dark:bg-green-600/70" />
          <span className="w-4 h-4 rounded-sm bg-green-600 dark:bg-green-500/80" />
          <span>10+</span>
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
      {/* ========== 날짜 상세 모달 ========== */}
      {showDetail && (() => {
        const dayActivities = monthlyActivities.filter(a => a.activity_date === showDetail);
        const dayKm = dayActivities.reduce((s, a) => s + Number(a.distance_km), 0);
        const dayDuration = dayActivities.reduce((s, a) => s + (a.duration_seconds || 0), 0);
        const dayPhoto = customPhotos.get(showDetail) || photos.get(showDetail);
        const dateObj = new Date(showDetail + 'T00:00:00');
        const dateLabel = dateObj.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(null)}>
            <div className="w-full max-w-lg bg-[var(--card-bg)] rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
              {/* 핸들 */}
              <div className="w-10 h-1 rounded-full bg-[var(--card-border)] mx-auto" />

              {/* 날짜 */}
              <h3 className="text-lg font-bold text-[var(--foreground)] text-center">{dateLabel}</h3>

              {/* 사진 미리보기 */}
              {dayPhoto && (
                <div className="rounded-2xl overflow-hidden h-40">
                  <img src={dayPhoto} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* 통계 */}
              {dayActivities.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="card p-3">
                    <p className="text-2xl font-extrabold text-[var(--accent)]">{dayKm.toFixed(1)}</p>
                    <p className="text-xs text-[var(--muted)]">km</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-2xl font-extrabold text-[var(--foreground)]">{dayActivities.length}</p>
                    <p className="text-xs text-[var(--muted)]">러닝</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-2xl font-extrabold text-[var(--foreground)]">{dayDuration > 0 ? formatDuration(dayDuration) : '-'}</p>
                    <p className="text-xs text-[var(--muted)]">시간</p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-[var(--muted)]">이 날은 러닝 기록이 없습니다</p>
              )}

              {/* 활동 리스트 */}
              {dayActivities.map(a => (
                <Link
                  key={a.id}
                  href={`/activity?id=${a.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--card-border)]/30"
                  onClick={() => setShowDetail(null)}
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{a.distance_km.toFixed(2)} km</p>
                    <p className="text-xs text-[var(--muted)]">{a.duration_seconds ? formatDuration(a.duration_seconds) : ''}</p>
                  </div>
                  <ChevronRight size={14} className="text-[var(--muted)]" />
                </Link>
              ))}

              {/* 사진 추가/변경 */}
              <button
                onClick={() => { handlePhotoSelect(showDetail); setShowDetail(null); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm"
              >
                <Camera size={16} />
                {dayPhoto ? '사진 변경하기' : '사진으로 꾸미기'}
              </button>

              {/* 공유 기능: 러닝 데이터 오버레이 이미지 공유 */}
              {dayActivities.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const shareText = `${dateLabel}\n🏃 ${dayKm.toFixed(1)}km${dayDuration > 0 ? ` · ${formatDuration(dayDuration)}` : ''}\n\n#Routinist #러닝`;
                      if (navigator.share) {
                        await navigator.share({ title: 'Routinist 러닝 기록', text: shareText });
                      } else {
                        await navigator.clipboard.writeText(shareText);
                        alert('러닝 기록이 클립보드에 복사되었습니다!');
                      }
                    } catch {}
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--card-border)] text-[var(--foreground)] font-semibold text-sm"
                >
                  📤 러닝 기록 공유하기
                </button>
              )}

              <button
                onClick={() => setShowDetail(null)}
                className="w-full py-2.5 rounded-xl text-sm text-[var(--muted)] font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
