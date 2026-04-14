'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchRoutesForUser } from '@/lib/map-data';
import { loadGoogleMaps, API_KEY } from '@/lib/google-maps';
import Link from 'next/link';
import type { Activity } from '@/types';

type FilterMode = '1d' | '3d' | '7d' | '30d' | 'all';

const FILTERS: { id: FilterMode; label: string }[] = [
  { id: '1d', label: '1일' },
  { id: '3d', label: '3일' },
  { id: '7d', label: '7일' },
  { id: '30d', label: '30일' },
  { id: 'all', label: '전체' },
];

// 좌표를 그리드 키로 변환 (경로 중복 감지용)
function coordKey(lat: number, lng: number, precision: number = 4): string {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
}

// 경로 세그먼트별 방문 횟수 계산
function buildHeatSegments(activities: Activity[]): Map<string, number> {
  const segmentCount = new Map<string, number>();

  activities.forEach(activity => {
    if (!activity.route_data?.coordinates?.length) return;
    const coords = activity.route_data.coordinates;

    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      // 세그먼트 키: 두 점의 그리드 좌표 (방향 무관하게 정렬)
      const k1 = coordKey(lat1, lng1);
      const k2 = coordKey(lat2, lng2);
      const key = k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
      segmentCount.set(key, (segmentCount.get(key) || 0) + 1);
    }
  });

  return segmentCount;
}

export default function MapPage() {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('7d');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // 지도 초기화
  useEffect(() => {
    if (!API_KEY) return;
    loadGoogleMaps().then(() => {
      if (!mapRef.current || googleMapRef.current) return;
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 37.5665, lng: 126.978 },
        zoom: 12,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
      setMapLoaded(true);
    }).catch(() => {});
  }, []);

  // 전체 경로 데이터 로드 (한 번만)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchRoutesForUser(user.id).then(data => {
      setAllActivities(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  // 필터링된 활동
  const filteredActivities = useCallback(() => {
    if (filterMode === 'all') return allActivities;
    const days = parseInt(filterMode);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return allActivities.filter(a => a.activity_date >= cutoffStr);
  }, [allActivities, filterMode]);

  // 크레파스 히트맵 렌더링
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    // 기존 폴리라인 제거
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    const filtered = filteredActivities();
    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    if (filterMode === '1d') {
      // 1일 모드: 단순 경로 표시 (클릭 가능)
      filtered.forEach(activity => {
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
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: googleMapRef.current,
        });

        polyline.addListener('click', () => setSelectedActivity(activity));
        polylinesRef.current.push(polyline);
      });
    } else {
      // 3일/7일/30일/전체 모드: 크레파스 덧칠 효과
      // 세그먼트별 방문 횟수 계산
      const segmentCounts = buildHeatSegments(filtered);
      const maxVisits = Math.max(...segmentCounts.values(), 1);

      // 각 활동의 경로를 세그먼트별로 다른 굵기/투명도로 그리기
      filtered.forEach(activity => {
        if (!activity.route_data?.coordinates?.length) return;
        const coords = activity.route_data.coordinates;

        for (let i = 0; i < coords.length - 1; i++) {
          const [lng1, lat1] = coords[i];
          const [lng2, lat2] = coords[i + 1];

          const k1 = coordKey(lat1, lng1);
          const k2 = coordKey(lat2, lng2);
          const key = k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
          const visits = segmentCounts.get(key) || 1;

          // 방문 횟수에 비례한 굵기와 진한 정도
          const ratio = visits / maxVisits;
          const weight = 2 + ratio * 8; // 2~10px
          const opacity = 0.2 + ratio * 0.7; // 0.2~0.9

          // 색상: 적을수록 연파랑, 많을수록 진파랑~보라
          const r = Math.round(59 - ratio * 30);
          const g = Math.round(130 - ratio * 60);
          const b = Math.round(246 - ratio * 50);

          const p1 = { lat: lat1, lng: lng1 };
          const p2 = { lat: lat2, lng: lng2 };
          bounds.extend(p1);
          bounds.extend(p2);
          hasPoints = true;

          const polyline = new google.maps.Polyline({
            path: [p1, p2],
            geodesic: true,
            strokeColor: `rgb(${r},${g},${b})`,
            strokeOpacity: opacity,
            strokeWeight: weight,
            map: googleMapRef.current,
          });

          polylinesRef.current.push(polyline);
        }
      });
    }

    if (hasPoints) {
      googleMapRef.current.fitBounds(bounds, 40);
    }
  }, [mapLoaded, allActivities, filterMode, filteredActivities]);

  const filtered = filteredActivities();
  const totalKm = filtered.reduce((sum, a) => sum + Number(a.distance_km), 0);
  const routeCount = filtered.filter(a => a.route_data).length;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-8">
      <h1 className="text-xl font-extrabold text-[var(--foreground)]">내 러닝 지도</h1>

      {/* 기간 필터 */}
      <div className="flex gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setFilterMode(f.id); setSelectedActivity(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === f.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card)] text-[var(--muted)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 통계 요약 */}
      <div className="card p-4">
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
      <div className="rounded-2xl overflow-hidden" style={{ height: '450px' }}>
        {API_KEY ? (
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="h-full bg-[var(--card)] flex items-center justify-center border border-[var(--card-border)] rounded-2xl">
            <p className="text-sm text-[var(--muted)]">Google Maps API 키를 설정하면 지도가 표시됩니다</p>
          </div>
        )}
      </div>

      {/* 크레파스 효과 설명 */}
      {filterMode !== '1d' && routeCount > 0 && (
        <div className="card p-3 text-center">
          <p className="text-[11px] text-[var(--muted)]">
            🖍️ 같은 경로를 많이 달릴수록 선이 <span className="font-semibold text-[var(--accent)]">굵고 진하게</span> 표시됩니다
          </p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      )}

      {selectedActivity && (
        <div className="card p-4">
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
          <p className="text-xs text-[var(--muted)] mt-1">Apple Health에서 기록을 가져오면 경로가 표시됩니다</p>
        </div>
      )}
    </div>
  );
}
