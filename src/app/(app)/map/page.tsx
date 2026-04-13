'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchRoutesForUser } from '@/lib/map-data';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { Activity } from '@/types';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const hasKey = !!API_KEY && API_KEY !== 'YOUR_KEY_HERE';

function AllRoutesPolylines({ activities, onRouteClick }: { activities: Activity[]; onRouteClick: (a: Activity) => void }) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

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
      });

      polyline.addListener('click', () => onRouteClick(activity));
      polyline.setMap(map);
      polylinesRef.current.push(polyline);
    });

    if (hasPoints) {
      map.fitBounds(bounds, 40);
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, [map, activities, onRouteClick]);

  return null;
}

type FilterMode = 'all' | 'month';

export default function HeatmapPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const loadRoutes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = filterMode === 'month'
        ? await fetchRoutesForUser(user.id, selectedYear, selectedMonth)
        : await fetchRoutesForUser(user.id);
      setActivities(data);
    } catch {} finally {
      setLoading(false);
    }
  }, [user, filterMode, selectedYear, selectedMonth]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const totalKm = activities.reduce((sum, a) => sum + Number(a.distance_km), 0);
  const routeCount = activities.filter((a) => a.route_data).length;

  const handleRouteClick = useCallback((a: Activity) => {
    setSelectedActivity(a);
  }, []);

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
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-lg font-bold text-[var(--foreground)] flex-1">내 러닝 지도</h1>
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
        {hasKey ? (
          <APIProvider apiKey={API_KEY}>
            <Map
              defaultCenter={{ lat: 37.5665, lng: 126.978 }}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI
              mapId="routinist-heatmap"
              style={{ width: '100%', height: '100%' }}
            >
              {!loading && <AllRoutesPolylines activities={activities} onRouteClick={handleRouteClick} />}
            </Map>
          </APIProvider>
        ) : (
          <div className="h-full bg-[var(--card)] flex items-center justify-center border border-[var(--card-border)] rounded-2xl">
            <div className="text-center">
              <p className="text-sm text-[var(--muted)]">Google Maps API 키를 설정하면</p>
              <p className="text-sm text-[var(--muted)]">달린 경로가 지도에 표시됩니다</p>
              <p className="text-[10px] text-[var(--muted)] mt-2">.env.local → NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      )}

      {/* 선택된 경로 정보 */}
      {selectedActivity && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {selectedActivity.distance_km.toFixed(2)} km
              </p>
              <p className="text-xs text-[var(--muted)]">
                {new Date(selectedActivity.activity_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Link
              href={`/activity?id=${selectedActivity.id}`}
              className="text-xs text-[var(--accent)] font-semibold"
            >
              상세 보기
            </Link>
          </div>
        </div>
      )}

      {/* GPS 기록이 없을 때 */}
      {!loading && routeCount === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--muted)]">아직 GPS 러닝 기록이 없습니다</p>
          <Link href="/track" className="text-sm text-[var(--accent)] font-semibold mt-2 inline-block">
            달리기 시작하기
          </Link>
        </div>
      )}
    </div>
  );
}
