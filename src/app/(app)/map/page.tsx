'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchRoutesForUser } from '@/lib/map-data';
import { loadGoogleMaps, API_KEY } from '@/lib/google-maps';
import Link from 'next/link';
import type { Activity } from '@/types';
import PullToRefresh from '@/components/PullToRefresh';

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

// 좌표를 그리드 키로 변환 (~11m 단위 버킷)
function coordKey(lat: number, lng: number, precision: number = 4): string {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
}

interface Segment {
  count: number;
  p1: { lat: number; lng: number };
  p2: { lat: number; lng: number };
}

// 활동들의 경로를 세그먼트 단위로 분해 + 누적 횟수 집계
// 동일 GPS 그리드(≈11m²)를 반복 통과하면 count 증가 → 크레파스 덧칠 효과
function buildSegmentMap(activities: Activity[]): Map<string, Segment> {
  const segments = new Map<string, Segment>();

  activities.forEach(activity => {
    if (!activity.route_data?.coordinates?.length) return;
    const coords = activity.route_data.coordinates;

    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const k1 = coordKey(lat1, lng1);
      const k2 = coordKey(lat2, lng2);
      if (k1 === k2) continue; // 같은 버킷 내 미세 이동 스킵
      const key = k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;

      const existing = segments.get(key);
      if (existing) {
        existing.count++;
      } else {
        segments.set(key, {
          count: 1,
          p1: { lat: lat1, lng: lng1 },
          p2: { lat: lat2, lng: lng2 },
        });
      }
    }
  });

  return segments;
}

// 크레파스 색상 스케일: 덧칠할수록 진해지고, 30+는 검정 계열
function chipStyle(visits: number): { color: string; weight: number; opacity: number } {
  if (visits <= 1)  return { color: '#B8F5D8', weight: 2.0, opacity: 0.7 };
  if (visits <= 3)  return { color: '#6EE7B7', weight: 2.5, opacity: 0.8 };
  if (visits <= 7)  return { color: '#22C55E', weight: 3.0, opacity: 0.85 };
  if (visits <= 15) return { color: '#15803D', weight: 3.5, opacity: 0.9 };
  if (visits <= 30) return { color: '#14532D', weight: 4.0, opacity: 0.95 };
  return              { color: '#0F172A', weight: 4.5, opacity: 1.0 }; // 30+ (1년 기준 많이 달린 곳)
}

const CHIP_LEGEND = [
  { label: '1', color: '#B8F5D8' },
  { label: '~3', color: '#6EE7B7' },
  { label: '~7', color: '#22C55E' },
  { label: '~15', color: '#15803D' },
  { label: '~30', color: '#14532D' },
  { label: '30+', color: '#0F172A' },
];

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

  // 전체 경로 데이터 로드
  const loadRoutes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchRoutesForUser(user.id);
      setAllActivities(data);
    } catch {} finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

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
      // 1일 모드: 단일 경로들 — 클릭 가능, 연한 민트색으로 가늘게
      filtered.forEach(activity => {
        if (!activity.route_data?.coordinates?.length) return;
        const path = activity.route_data.coordinates.map(([lng, lat]) => {
          const point = { lat, lng };
          bounds.extend(point);
          hasPoints = true;
          return point;
        });

        const style = chipStyle(1);
        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: style.color,
          strokeOpacity: style.opacity,
          strokeWeight: style.weight,
          map: googleMapRef.current,
        });
        polyline.addListener('click', () => setSelectedActivity(activity));
        polylinesRef.current.push(polyline);
      });
    } else {
      // 3일/7일/30일/전체: 크레파스 덧칠 방식 (세그먼트 단위)
      // 같은 GPS 그리드(≈11m)를 반복 통과할수록 진해지고 굵어짐
      const segments = buildSegmentMap(filtered);

      // 방문 횟수가 적은 것부터 그려서 많이 달린 세그먼트가 위로 올라옴
      const sorted = [...segments.values()].sort((a, b) => a.count - b.count);

      sorted.forEach(seg => {
        bounds.extend(seg.p1); bounds.extend(seg.p2);
        hasPoints = true;
        const style = chipStyle(seg.count);
        const polyline = new google.maps.Polyline({
          path: [seg.p1, seg.p2],
          geodesic: true,
          strokeColor: style.color,
          strokeOpacity: style.opacity,
          strokeWeight: style.weight,
          map: googleMapRef.current,
          clickable: false,
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
    <PullToRefresh onRefresh={loadRoutes}>
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">

      {/* 오늘의 명언 */}
      <div className="card p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border-0">
        <p className="text-sm text-center italic text-[var(--foreground)]">"{todayQuote}"</p>
      </div>

      {/* 기간 필터 + 잔디 칩 범례 (스크롤 없이 바로 보임) */}
      <div className="space-y-2">
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
        {filterMode !== '1d' && (
          <div className="card px-3 py-2">
            <div className="flex items-center justify-center gap-1 text-xs text-[var(--muted)]">
              <span className="mr-1">덧칠 횟수</span>
              {CHIP_LEGEND.map(c => (
                <div key={c.label} className="flex items-center gap-0.5">
                  <span className="w-3.5 h-3.5 rounded-sm" style={{ background: c.color }} />
                  <span className="text-[10px]">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 통계 요약 (작게) */}
      <div className="card p-3">
        <div className="grid grid-cols-2 text-center">
          <div>
            <p className="text-xl font-extrabold text-[var(--foreground)]">{totalKm.toFixed(1)} km</p>
            <p className="text-xs text-[var(--muted)]">총 거리</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-[var(--foreground)]">{routeCount}</p>
            <p className="text-xs text-[var(--muted)]">GPS 기록</p>
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
        <div className="card p-6 text-center space-y-4">
          <p className="text-4xl">🗺️</p>
          <p className="text-base font-semibold text-[var(--foreground)]">아직 GPS 러닝 기록이 없습니다</p>
          <p className="text-xs text-[var(--muted)]">
            Apple Health만 연동하면 거리·시간은 보이지만 GPS 경로는 포함되지 않아요.<br />
            아래 앱에서 달리면 자동으로 이 지도에 경로가 쌓입니다.
          </p>

          <div className="space-y-2 pt-2">
            <Link
              href="/connect"
              className="block w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm"
            >
              ❤️ Apple Health 연동하기
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://apps.apple.com/kr/app/nike-run-club/id387771637"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 rounded-xl border border-[var(--card-border)] text-[var(--foreground)] font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                👟 Nike Run Club
              </a>
              <a
                href="https://apps.apple.com/kr/app/%EB%9F%B0%EB%8D%B0%EC%9D%B4-%EC%B4%88%EB%B3%B4-%EB%8B%AC%EB%A6%AC%EA%B8%B0-%EC%95%B1/id1061944231"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 rounded-xl border border-[var(--card-border)] text-[var(--foreground)] font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                🏃 런데이
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
