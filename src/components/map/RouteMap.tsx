'use client';

import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import type { GeoJSONLineString } from '@/types';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface RouteMapProps {
  routeData: GeoJSONLineString;
  height?: string;
}

function RoutePolyline({ routeData }: { routeData: GeoJSONLineString }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !routeData?.coordinates?.length) return;

    const path = routeData.coordinates.map(([lng, lat]) => ({ lat, lng }));

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#3B82F6',
      strokeOpacity: 1.0,
      strokeWeight: 4,
    });
    polylineRef.current.setMap(map);

    // 경로에 맞게 지도 범위 조정
    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 40);

    return () => {
      polylineRef.current?.setMap(null);
    };
  }, [map, routeData]);

  return null;
}

export default function RouteMap({ routeData, height = '240px' }: RouteMapProps) {
  const [hasKey] = useState(!!API_KEY && API_KEY !== 'YOUR_KEY_HERE');

  if (!hasKey) {
    return (
      <div style={{ height }} className="bg-[var(--card)] rounded-2xl flex items-center justify-center border border-[var(--card-border)]">
        <div className="text-center">
          <p className="text-xs text-[var(--muted)]">Google Maps API 키가 필요합니다</p>
          <p className="text-[10px] text-[var(--muted)] mt-1">.env.local에 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY를 설정하세요</p>
        </div>
      </div>
    );
  }

  if (!routeData?.coordinates?.length) {
    return (
      <div style={{ height }} className="bg-[var(--card)] rounded-2xl flex items-center justify-center border border-[var(--card-border)]">
        <p className="text-xs text-[var(--muted)]">경로 데이터가 없습니다</p>
      </div>
    );
  }

  const center = {
    lat: routeData.coordinates[Math.floor(routeData.coordinates.length / 2)][1],
    lng: routeData.coordinates[Math.floor(routeData.coordinates.length / 2)][0],
  };

  return (
    <div style={{ height }} className="rounded-2xl overflow-hidden">
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI
          mapId="routinist-route"
          style={{ width: '100%', height: '100%' }}
        >
          <RoutePolyline routeData={routeData} />
        </Map>
      </APIProvider>
    </div>
  );
}
