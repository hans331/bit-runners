'use client';

// 메인 하단 루틴포토 가로 슬라이딩 캐러셀.
// 기존 RoutinistGallery 3×3 그리드 대체. 트렌딩 RPC 사용 (친구×1.5, 내 구×1.3 가중치).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Camera, Flame } from 'lucide-react';
import PhotoCard from '@/components/photos/PhotoCard';
import { fetchTrendingPhotos, type RoutinePhoto } from '@/lib/routine-photos';

export default function RoutinePhotoCarousel() {
  const [photos, setPhotos] = useState<RoutinePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchTrendingPhotos(12);
      if (!cancelled) {
        setPhotos(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="mt-4 mx-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-40 h-52 rounded-2xl bg-[var(--card-border)]/30 animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <Link href="/calendar" className="mt-4 mx-4 block card p-5 bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/20 dark:to-orange-950/20 border-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center flex-shrink-0">
            <Camera size={22} className="text-pink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--foreground)]">첫 번째 루틴포토가 되어보세요!</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">캘린더에서 러닝 사진을 공유하면 여기에 떠요</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mx-4 mb-2">
        <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-1.5">
          <Flame size={18} className="text-orange-500" />
          이번 주 인기 루틴포토
        </h3>
        <Link href="/social?tab=photos" className="text-xs font-semibold text-orange-600 flex items-center gap-0.5">
          더보기 <ChevronRight size={14} />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-4" style={{ scrollSnapType: 'x mandatory' }}>
        {photos.map(p => (
          <div key={p.photo_id} style={{ scrollSnapAlign: 'start' }} className="flex-shrink-0">
            <PhotoCard photo={p} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
