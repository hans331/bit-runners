'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchRoutesForUser } from '@/lib/map-data';
import { loadGoogleMaps, API_KEY } from '@/lib/google-maps';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import type { Activity } from '@/types';

type FilterMode = 'all' | 'month';

export default function HeatmapPage() {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // 지도 초기화
  useEffect(() => {
    if (!API_KEY) return;
    loadGoogleMaps().then(() => {
      if (!mapRef.current || googleMapRef.current) return;
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 37.5665, lng: 126.978 },
        zoom: 11,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
      });
      setMapLoaded(true);
    }).catch(() => {});
  }, []);

  const loadRoutes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = filterMode === 'month'
        ? await fetchRoutesForUser(user.id, selectedYear, selectedMonth)
        : await fetchRoutesForUser(user.id);
      setActivities(data);
    } catch {} finally { setLoading(false); }
  }, [user, filterMode, selectedYear, selectedMonth]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  // 폴리라인 렌더링
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    // 기존 폴리라인 제거
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    activities.forEach((activity) => {
      if (!activity.route_data?.coordinates?.length) return;

      const path = activity.route_data.coordinates.map(([lng, lat]) => {
        const point = { lat, lng };
        bounds.extend(point);
        hasPoints = true;
        return point;
      });

      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map: googleMapRef.current,
      });

      polyline.addListener('click', () => setSelectedActivity(activity));
      polylinesRef.current.push(polyline);
    });

    if (hasPoints) {
      googleMapRef.current.fitBounds(bounds, 40);
    }
  }, [mapLoaded, activities]);

  const totalKm = activities.reduce((sum, a) => sum + Number(a.distance_km), 0);
  const routeCount = activities.filter((a) => a.route_data).length;

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-[var(--foreground)]">내 러닝 지도</h1>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterMode === 'all' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card)] text-[var(--muted)]'}`}
        >전체</button>
        <button
          onClick={() => setFilterMode('month')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterMode === 'month' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card)] text-[var(--muted)]'}`}
        ><Calendar size={12} className="inline mr-1" />월별</button>

        {filterMode === 'month' && (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={prevMonth} className="text-[var(--muted)] text-sm">&lt;</button>
            <span className="text-sm font-semibold text-[var(--foreground)]">{selectedYear}.{String(selectedMonth).padStart(2, '0')}</span>
            <button onClick={nextMonth} className="text-[var(--muted)] text-sm">&gt;</button>
          </div>
        )}
      </div>

      {/* 통계 요약 */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-2 text-center">
          <div>
            <p className="text-xl font-bold text-[var(--foreground)]">{totalKm.toFixed(1)} km</p>
            <p className="text-xs text-[var(--muted)]">총 거리</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--foreground)]">{routeCount}</p>
            <p className="text-xs text-[var(--muted)]">GPS 기록 수</p>
          </div>
        </div>
      </div>

      {/* 지도 */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ height: '400px' }}>
        {API_KEY ? (
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="h-full bg-[var(--card)] flex items-center justify-center border border-[var(--card-border)] rounded-2xl">
            <p className="text-sm text-[var(--muted)]">Google Maps API 키를 설정하면 지도가 표시됩니다</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      )}

      {selectedActivity && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">{selectedActivity.distance_km.toFixed(2)} km</p>
              <p className="text-xs text-[var(--muted)]">
                {new Date(selectedActivity.activity_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Link href={`/activity?id=${selectedActivity.id}`} className="text-xs text-[var(--accent)] font-semibold">상세 보기</Link>
          </div>
        </div>
      )}

      {!loading && routeCount === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--muted)]">아직 GPS 러닝 기록이 없습니다</p>
          <Link href="/track" className="text-sm text-[var(--accent)] font-semibold mt-2 inline-block">달리기 시작하기</Link>
        </div>
      )}
    </div>
  );
}
