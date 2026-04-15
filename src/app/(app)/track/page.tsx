'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { addActivity } from '@/lib/routinist-data';
import { useUserData } from '@/components/UserDataProvider';
import { Play, Square, Pause, ArrowLeft } from 'lucide-react';
import type { GeoJSONLineString } from '@/types';

import { loadGoogleMaps, API_KEY } from '@/lib/google-maps';

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

function calcDistance(p1: TrackPoint, p2: TrackPoint): number {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(distKm: number, seconds: number): string {
  if (distKm <= 0) return "--'--\"";
  const paceSeconds = Math.round(seconds / distKm);
  const m = Math.floor(paceSeconds / 60);
  const s = paceSeconds % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

type TrackingState = 'idle' | 'tracking' | 'paused' | 'saving';

export default function TrackPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh } = useUserData();

  const [state, setState] = useState<TrackingState>('idle');
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);

  // Google Maps 로드
  useEffect(() => {
    if (!API_KEY || !mapRef.current) return;
    if (googleMapRef.current) return;

    loadGoogleMaps().then(() => {
      if (!mapRef.current) return;
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 37.5665, lng: 126.978 },
        zoom: 16,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
      });

      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          googleMapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }).catch(() => {});
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS를 사용할 수 없습니다');
      return;
    }

    setState('tracking');
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
    setError('');

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint: TrackPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: Date.now(),
        };

        setPoints((prev) => {
          if (prev.length > 0) {
            const d = calcDistance(prev[prev.length - 1], newPoint);
            if (d > 0.003) {
              setDistance((prevDist) => prevDist + d);
              const updated = [...prev, newPoint];

              // 폴리라인 업데이트
              if (googleMapRef.current) {
                const path = updated.map((p) => ({ lat: p.lat, lng: p.lng }));
                if (!polylineRef.current) {
                  polylineRef.current = new google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 1.0,
                    strokeWeight: 5,
                  });
                  polylineRef.current.setMap(googleMapRef.current);
                } else {
                  polylineRef.current.setPath(path);
                }
                googleMapRef.current.panTo({ lat: newPoint.lat, lng: newPoint.lng });
              }

              return updated;
            }
            return prev;
          }
          // 첫 포인트
          googleMapRef.current?.panTo({ lat: newPoint.lat, lng: newPoint.lng });
          return [newPoint];
        });
      },
      (err) => setError(`GPS 오류: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }, []);

  const pauseTracking = useCallback(() => {
    setState('paused');
    pausedTimeRef.current = elapsed;
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [elapsed]);

  const resumeTracking = useCallback(() => {
    startTracking();
  }, [startTracking]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (distance < 0.01 || !user) {
      setState('idle');
      setPoints([]);
      setDistance(0);
      setElapsed(0);
      pausedTimeRef.current = 0;
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      return;
    }

    setState('saving');

    const routeData: GeoJSONLineString = {
      type: 'LineString',
      coordinates: points.map((p) => [p.lng, p.lat]),
    };

    const startedAt = points.length > 0 ? new Date(points[0].timestamp).toISOString() : null;
    const endedAt = new Date().toISOString();

    try {
      await addActivity(
        user.id,
        new Date().toISOString().split('T')[0],
        Math.round(distance * 1000) / 1000,
        elapsed,
        undefined,
        'gps',
        routeData,
        startedAt ?? undefined,
        endedAt,
      );
      await refresh();
      router.replace('/history');
    } catch {
      setError('저장에 실패했습니다');
      setState('paused');
    }
  }, [distance, elapsed, points, user, refresh, router]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isActive = state === 'tracking' || state === 'paused';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] pt-[env(safe-area-inset-top)]">
      {state === 'idle' && (
        <div className="absolute top-[env(safe-area-inset-top)] left-0 z-10 p-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur flex items-center justify-center shadow">
            <ArrowLeft size={20} />
          </button>
        </div>
      )}

      {/* 지도 */}
      <div
        ref={mapRef}
        className="bg-gray-200 dark:bg-gray-800 relative"
        style={{ flex: 1, minHeight: 'calc(100vh - 180px)' }}
      >
        {!API_KEY && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-[var(--muted)]">Google Maps API 키를 설정하면 지도가 표시됩니다</p>
          </div>
        )}
      </div>

      {/* 실시간 통계 오버레이 */}
      {isActive && (
        <div className="absolute top-16 left-4 right-4 bg-black/70 backdrop-blur-sm text-white rounded-2xl p-4 z-10">
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-3xl font-bold">{distance.toFixed(2)}</p>
              <p className="text-sm opacity-70">km</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{formatTime(elapsed)}</p>
              <p className="text-sm opacity-70">시간</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{formatPace(distance, elapsed)}</p>
              <p className="text-sm opacity-70">페이스</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-red-500/10 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* 컨트롤 */}
      <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[var(--background)]">
        {state === 'idle' && (
          <button
            onClick={startTracking}
            className="w-full flex items-center justify-center gap-3 bg-[var(--accent)] text-white font-bold text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            <Play size={28} fill="white" /> 달리기 시작
          </button>
        )}
        {state === 'tracking' && (
          <div className="flex gap-3">
            <button onClick={pauseTracking} className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform">
              <Pause size={22} /> 일시정지
            </button>
            <button onClick={stopTracking} className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform">
              <Square size={22} fill="white" /> 종료
            </button>
          </div>
        )}
        {state === 'paused' && (
          <div className="flex gap-3">
            <button onClick={resumeTracking} className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent)] text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform">
              <Play size={22} fill="white" /> 재개
            </button>
            <button onClick={stopTracking} className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform">
              <Square size={22} fill="white" /> 종료 & 저장
            </button>
          </div>
        )}
        {state === 'saving' && (
          <div className="flex items-center justify-center gap-3 py-5">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <p className="text-[var(--muted)] font-semibold">저장 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}
