'use client';

// Pinterest 스타일 2컬럼 루틴포토 그리드.
// 포토 탭 내 5개 sub (인기/친구/동네/최신/좋아요함) 공통 렌더러.

import PhotoCard from './PhotoCard';
import type { RoutinePhoto } from '@/lib/routine-photos';

interface Props {
  photos: RoutinePhoto[];
  loading?: boolean;
  emptyText?: string;
}

export default function PhotoGrid({ photos, loading, emptyText }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="aspect-square rounded-2xl bg-[var(--card-border)]/30 animate-pulse"
            style={{ aspectRatio: i % 2 === 0 ? '1/1.1' : '1/0.9' }}
          />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-base font-semibold text-[var(--foreground)] leading-relaxed">
          {emptyText ?? '아직 사진이 없어요'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map(p => (
        <PhotoCard key={p.photo_id} photo={p} />
      ))}
    </div>
  );
}
