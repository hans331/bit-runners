'use client';

// 루틴포토 단일 카드 — 썸네일 + 좋아요 + 러닝 기록 오버레이.
// 친근·귀여운 컨셉: 둥근 카드, 더블탭 하트 애니메이션, soft shadow.

import { useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin } from 'lucide-react';
import type { RoutinePhoto } from '@/lib/routine-photos';
import { togglePhotoLike } from '@/lib/routine-photos';

interface Props {
  photo: RoutinePhoto;
  onToggle?: (photoId: string, liked: boolean) => void;
  compact?: boolean;
}

export default function PhotoCard({ photo, onToggle, compact }: Props) {
  const [liked, setLiked] = useState(!!photo.liked_by_me);
  const [likes, setLikes] = useState(photo.like_count);
  const [animate, setAnimate] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLike = async (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    setAnimate(true);
    setTimeout(() => setAnimate(false), 400);
    try {
      await togglePhotoLike(photo.photo_id, liked);
      onToggle?.(photo.photo_id, next);
    } catch {
      // revert
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  let lastTap = 0;
  const handleTap = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!liked) handleLike(e);
    }
    lastTap = now;
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[var(--card)] shadow-sm group ${compact ? 'w-40' : 'w-full'}`}
      onTouchEnd={handleTap}
    >
      <Link href={`/social/user?id=${photo.user_id}`} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.photo_url}
          alt=""
          className={`w-full object-cover ${compact ? 'h-52' : 'aspect-square'}`}
          loading="lazy"
        />

        {/* 하단 오버레이 — 글래스모피즘 */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3">
          <p className="text-white text-sm font-bold truncate">{photo.display_name}</p>
          <div className="flex items-center gap-2 text-[11px] text-white/90 mt-0.5">
            <span className="font-semibold">{Number(photo.distance_km).toFixed(1)}km</span>
            {photo.region_gu && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {photo.region_gu}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* 좋아요 하트 */}
      <button
        onClick={handleLike}
        disabled={busy}
        aria-label="좋아요"
        className={`absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center transition-transform ${animate ? 'scale-125' : 'scale-100'}`}
      >
        <Heart
          size={18}
          fill={liked ? '#ef4444' : 'none'}
          className={liked ? 'text-red-500' : 'text-gray-600'}
          strokeWidth={2.2}
        />
      </button>

      {/* 좋아요 카운트 배지 */}
      {likes > 0 && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[11px] font-bold text-gray-800 flex items-center gap-0.5 shadow-sm">
          <Heart size={10} fill="#ef4444" className="text-red-500" strokeWidth={0} />
          {likes}
        </div>
      )}

      {/* 더블탭 하트 오버레이 */}
      {animate && liked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart size={72} fill="#ef4444" className="text-red-500 drop-shadow-lg animate-ping opacity-80" strokeWidth={0} />
        </div>
      )}
    </div>
  );
}
