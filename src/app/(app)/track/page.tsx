'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { addActivity } from '@/lib/routinist-data';
import { useUserData } from '@/components/UserDataProvider';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { Play, Square, Pause, ArrowLeft } from 'lucide-react';
import type { GeoJSONLineString } from '@/types';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const hasKey = !!API_KEY && API_KEY !== 'YOUR_KEY_HERE';

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

function TrackingPolyline({ points }: { points: TrackPoint[] }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#3B82F6',
        strokeOpacity: 1.0,
        strokeWeight: 5,
      });
      polylineRef.current.setMap(map);
    } else {
      polylineRef.current.setPath(path);
    }

    // 마지막 포인트로 이동
    if (points.length > 0) {
      const last = points[points.length - 1];
      map.panTo({ lat: last.lat, lng: last.lng });
    }

    return () => {
      // cleanup은 컴포넌트 언마운트 시에만
    };
  }, [map, points]);

  // 언마운트 시 폴리라인 제거
  useEffect(() => {
    return () => { polylineRef.current?.setMap(null); };
  }, []);

  return null;
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
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);

  // 현재 위치 가져오기 (초기 지도 센터)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCurrentPos({ lat: 37.5665, lng: 126.978 }), // 서울 기본값
      { enableHighAccuracy: true }
    );
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS를 사용할 수 없습니다');
      return;
    }

    setState('tracking');
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
    setError('');

    // 타이머
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // GPS 워치
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint: TrackPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: Date.now(),
        };

        setPoints((prev) => {
          const updated = [...prev, newPoint];
          // 거리 계산
          if (prev.length > 0) {
            const d = calcDistance(prev[prev.length - 1], newPoint);
            if (d > 0.003) { // 3m 이상 이동 시에만
              setDistance((prevDist) => prevDist + d);
              return updated;
            }
            return prev; // 미세 이동은 무시
          }
          return updated;
        });

        setCurrentPos({ lat: newPoint.lat, lng: newPoint.lng });
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
        undefined, // memo
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

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isActive = state === 'tracking' || state === 'paused';

  const mapContent = hasKey && currentPos ? (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={currentPos}
        defaultZoom={16}
        gestureHandling="greedy"
        disableDefaultUI
        mapId="routinist-track"
        style={{ width: '100%', height: '100%' }}
      >
        {points.length > 0 && <TrackingPolyline points={points} />}
      </Map>
    </APIProvider>
  ) : (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        {!currentPos ? (
          <>
            <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-[var(--muted)]">위치를 찾는 중...</p>
          </>
        ) : (
          <p className="text-xs text-[var(--muted)]">Google Maps API 키를 설정하면 지도가 표시됩니다</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] pt-[env(safe-area-inset-top)]">
      {/* 뒤로가기 (비활성 시) */}
      {state === 'idle' && (
        <div className="absolute top-[env(safe-area-inset-top)] left-0 z-10 p-4">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur flex items-center justify-center shadow">
            <ArrowLeft size={20} />
          </button>
        </div>
      )}

      {/* 지도 */}
      <div className="flex-1 bg-gray-200 dark:bg-gray-800 relative">
        {mapContent}

        {/* 실시간 통계 오버레이 */}
        {isActive && (
          <div className="absolute top-4 left-4 right-4 bg-black/70 backdrop-blur-sm text-white rounded-2xl p-4 z-10">
            <div className="grid grid-cols-3 text-center">
              <div>
                <p className="text-3xl font-bold">{distance.toFixed(2)}</p>
                <p className="text-xs opacity-70">km</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{formatTime(elapsed)}</p>
                <p className="text-xs opacity-70">시간</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{formatPace(distance, elapsed)}</p>
                <p className="text-xs opacity-70">페이스</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 text-center">
          <p className="text-xs text-red-500">{error}</p>
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
            <button
              onClick={pauseTracking}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform"
            >
              <Pause size={22} /> 일시정지
            </button>
            <button
              onClick={stopTracking}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform"
            >
              <Square size={22} fill="white" /> 종료
            </button>
          </div>
        )}

        {state === 'paused' && (
          <div className="flex gap-3">
            <button
              onClick={resumeTracking}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent)] text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform"
            >
              <Play size={22} fill="white" /> 재개
            </button>
            <button
              onClick={stopTracking}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform"
            >
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
