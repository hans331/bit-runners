'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchRoutesForUser } from '@/lib/map-data';
import { loadGoogleMaps, API_KEY } from '@/lib/google-maps';
import Link from 'next/link';
import type { Activity } from '@/types';

type FilterMode = '1d' | '3d' | '7d' | '30d' | 'all';

const RUNNING_QUOTES = [
  '달리는 것은 나 자신과의 약속이다',
  '어제보다 한 걸음 더, 그것이 성장이다',
  '느려도 괜찮아, 멈추지만 않으면 돼',
  '달릴 때 가장 솔직한 나를 만난다',
  '매일 달리는 사람은 매일 이기는 사람이다',
  '시작이 반이다, 오늘도 신발 끈을 묶자',
  '땀은 노력의 증거, 기록은 성장의 증거',
  '같은 길도 매번 다른 이야기가 된다',
  '달리기는 가장 정직한 운동이다',
  '오늘 뛴 거리가 내일의 자신감이 된다',
  '바람을 가르며 달리는 순간, 모든 고민은 사라진다',
  '달리기는 혼자 하지만, 결코 외롭지 않다',
  '1km든 10km든, 달린 사람이 이기는 거야',
  '꾸준함이 재능을 이긴다',
  '내가 달리는 이유는 어제의 나를 넘기 위해서',
  '러닝은 명상이다, 발로 하는 명상',
  '오늘 달리지 않으면, 내일 후회한다',
  '같은 코스를 달려도 매번 새로운 기록이 된다',
  '달리기를 멈추면 시간도 멈춘다',
  '한 발짝씩, 그렇게 멀리 간다',
];

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
          strokeColor: '#FF4500',
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map: googleMapRef.current,
        });

        polyline.addListener('click', () => setSelectedActivity(activity));
        polylinesRef.current.push(polyline);
      });
    } else {
      // 3일/7일/30일/전체 모드: 덧칠 히트맵
      // 각 활동의 전체 경로를 하나의 폴리라인으로 렌더링
      // 같은 경로를 여러 번 달리면 점점 진하고 굵어짐

      // 활동별 경로 횟수 카운트
      const routeVisits = new Map<string, number>();
      filtered.forEach(activity => {
        if (!activity.route_data?.coordinates?.length) return;
        // 경로의 시작/끝점으로 대략적인 경로 ID 생성
        const coords = activity.route_data.coordinates;
        const startKey = coordKey(coords[0][1], coords[0][0], 3);
        const endKey = coordKey(coords[coords.length - 1][1], coords[coords.length - 1][0], 3);
        const routeId = `${startKey}-${endKey}`;
        routeVisits.set(routeId, (routeVisits.get(routeId) || 0) + 1);
      });
      const maxVisits = Math.max(...routeVisits.values(), 1);

      // 방문 횟수가 적은 것부터 그려서 많이 달린 경로가 위에 올라옴
      const sortedActivities = [...filtered]
        .filter(a => a.route_data?.coordinates?.length)
        .sort((a, b) => {
          const getVisits = (act: typeof a) => {
            const c = act.route_data!.coordinates;
            const sk = coordKey(c[0][1], c[0][0], 3);
            const ek = coordKey(c[c.length - 1][1], c[c.length - 1][0], 3);
            return routeVisits.get(`${sk}-${ek}`) || 1;
          };
          return getVisits(a) - getVisits(b);
        });

      sortedActivities.forEach(activity => {
        const coords = activity.route_data!.coordinates;
        const startKey = coordKey(coords[0][1], coords[0][0], 3);
        const endKey = coordKey(coords[coords.length - 1][1], coords[coords.length - 1][0], 3);
        const visits = routeVisits.get(`${startKey}-${endKey}`) || 1;
        const ratio = visits / maxVisits;

        const path = coords.map(([lng, lat]) => {
          const point = { lat, lng };
          bounds.extend(point);
          hasPoints = true;
          return point;
        });

        // 두께: 3px(1회) → 12px(최다)
        const weight = 3 + ratio * 9;
        const opacity = 0.5 + ratio * 0.5;

        // 색상: 연한 초록 → 초록 → 노랑 → 주황 → 빨강 (5단계)
        let r: number, g: number, b: number;
        if (ratio < 0.25) {
          const t = ratio / 0.25;
          r = Math.round(100 - t * 100); g = Math.round(180 + t * 40); b = Math.round(255 - t * 155);
        } else if (ratio < 0.5) {
          const t = (ratio - 0.25) / 0.25;
          r = Math.round(t * 255); g = Math.round(220 - t * 20); b = Math.round(100 - t * 100);
        } else if (ratio < 0.75) {
          const t = (ratio - 0.5) / 0.25;
          r = 255; g = Math.round(200 - t * 100); b = 0;
        } else {
          const t = (ratio - 0.75) / 0.25;
          r = Math.round(255 - t * 30); g = Math.round(100 - t * 100); b = 0;
        }

        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: `rgb(${r},${g},${b})`,
          strokeOpacity: opacity,
          strokeWeight: weight,
          map: googleMapRef.current,
        });
        polylinesRef.current.push(polyline);
      });
    }

    if (hasPoints) {
      googleMapRef.current.fitBounds(bounds, 40);
    }
  }, [mapLoaded, allActivities, filterMode, filteredActivities]);

  const filtered = filteredActivities();
  const totalKm = filtered.reduce((sum, a) => sum + Number(a.distance_km), 0);
  const routeCount = filtered.filter(a => a.route_data).length;

  // 일별 명언 로테이션
  const todayQuote = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return RUNNING_QUOTES[dayOfYear % RUNNING_QUOTES.length];
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-8">
      <h1 className="text-xl font-bold text-[var(--foreground)]">내 러닝 지도</h1>

      {/* 오늘의 명언 */}
      <div className="card p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border-0">
        <p className="text-sm text-center italic text-[var(--foreground)]">"{todayQuote}"</p>
      </div>

      {/* 기간 필터 */}
      <div className="flex gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setFilterMode(f.id); setSelectedActivity(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
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
            <p className="text-3xl font-extrabold text-[var(--foreground)]">{totalKm.toFixed(1)} km</p>
            <p className="text-xs text-[var(--muted)]">총 거리</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[var(--foreground)]">{routeCount}</p>
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
            <p className="text-xs text-[var(--muted)]">Google Maps API 키를 설정하면 지도가 표시됩니다</p>
          </div>
        )}
      </div>

      {/* 히트맵 범례 */}
      {filterMode !== '1d' && routeCount > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>1회</span>
            <span>달릴수록 굵고 진하게</span>
            <span>최다</span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{
            background: 'linear-gradient(to right, rgb(100,180,255), rgb(0,220,100), rgb(255,200,0), rgb(255,100,0), rgb(225,0,0))'
          }}>
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to right, transparent 0%, transparent 100%)',
              maskImage: 'linear-gradient(to right, 1px, 4px, 8px, 12px, 16px)',
            }} />
          </div>
          <div className="flex justify-between">
            <div className="w-6 h-1 rounded-full" style={{ background: 'rgb(100,180,255)' }} />
            <div className="w-6 h-1.5 rounded-full" style={{ background: 'rgb(0,220,100)' }} />
            <div className="w-6 h-2 rounded-full" style={{ background: 'rgb(255,200,0)' }} />
            <div className="w-6 h-2.5 rounded-full" style={{ background: 'rgb(255,100,0)' }} />
            <div className="w-6 h-3 rounded-full" style={{ background: 'rgb(225,0,0)' }} />
          </div>
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
              <p className="text-base font-bold text-[var(--foreground)]">{selectedActivity.distance_km.toFixed(2)} km</p>
              <p className="text-xs text-[var(--muted)]">
                {new Date(selectedActivity.activity_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Link href={`/activity?id=${selectedActivity.id}`} className="text-sm text-[var(--accent)] font-semibold">상세 보기</Link>
          </div>
        </div>
      )}

      {!loading && routeCount === 0 && (
        <div className="card p-6 text-center space-y-3">
          <p className="text-4xl">🗺️</p>
          <p className="text-base font-semibold text-[var(--foreground)]">아직 GPS 러닝 기록이 없습니다</p>
          <div className="text-xs text-[var(--muted)] space-y-1">
            <p>Apple Health 연동으로 가져온 기록에는</p>
            <p>GPS 경로가 포함되지 않습니다.</p>
            <p className="mt-3 font-medium">GPS 경로를 보려면:</p>
            <p>Strava, Nike Run Club 등에서 달리면</p>
            <p>경로가 자동으로 지도에 표시됩니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
