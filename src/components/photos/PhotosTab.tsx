'use client';

// 소셜 > 포토 탭 — 5개 sub: 인기 / 친구 / 동네 / 최신 / 좋아요함
// Pinterest 2컬럼 그리드

import { useEffect, useState } from 'react';
import { Flame, Users, MapPin, Clock, Heart } from 'lucide-react';
import PhotoGrid from './PhotoGrid';
import {
  fetchTrendingPhotos,
  fetchRecentPhotos,
  fetchFriendPhotos,
  fetchRegionPhotos,
  fetchMyLikedPhotos,
  type RoutinePhoto,
} from '@/lib/routine-photos';
import { fetchFollowing } from '@/lib/social-data';
import { useAuth } from '@/components/AuthProvider';

type Sub = 'trending' | 'friends' | 'region' | 'recent' | 'liked';

const SUBS: { id: Sub; label: string; Icon: typeof Flame }[] = [
  { id: 'trending', label: '인기', Icon: Flame },
  { id: 'friends', label: '친구', Icon: Users },
  { id: 'region', label: '동네', Icon: MapPin },
  { id: 'recent', label: '최신', Icon: Clock },
  { id: 'liked', label: '좋아요', Icon: Heart },
];

export default function PhotosTab() {
  const { user, profile } = useAuth();
  const [sub, setSub] = useState<Sub>('trending');
  const [photos, setPhotos] = useState<RoutinePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      let result: RoutinePhoto[] = [];
      try {
        if (sub === 'trending') {
          result = await fetchTrendingPhotos(50);
        } else if (sub === 'friends') {
          const following = await fetchFollowing(user.id);
          result = await fetchFriendPhotos(following.map(f => f.id), 50);
        } else if (sub === 'region') {
          if (profile?.region_gu) {
            result = await fetchRegionPhotos(profile.region_gu, 50);
          }
        } else if (sub === 'recent') {
          result = await fetchRecentPhotos(50);
        } else if (sub === 'liked') {
          result = await fetchMyLikedPhotos(50);
        }
      } catch (e) {
        console.warn('[PhotosTab] load 실패', e);
      }
      if (!cancelled) {
        setPhotos(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sub, user, profile?.region_gu]);

  return (
    <div className="space-y-4">
      {/* Sub 탭 — 가로 스크롤 pill */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {SUBS.map(s => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              sub === s.id
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]'
            }`}
          >
            <s.Icon size={14} />
            {s.label}
          </button>
        ))}
      </div>

      {/* 빈 상태 메시지 커스터마이징 */}
      <PhotoGrid
        photos={photos}
        loading={loading}
        emptyText={
          sub === 'friends'
            ? '친구가 올린 사진이 없어요. 친구 탭에서 러너를 팔로우해보세요!'
            : sub === 'region' && !profile?.region_gu
            ? '지역을 설정하면 내 동네 사진이 여기 보여요'
            : sub === 'region'
            ? `${profile?.region_gu} 에서 올린 사진이 아직 없어요`
            : sub === 'liked'
            ? '아직 좋아요한 사진이 없어요'
            : '아직 사진이 없어요. 첫 번째가 되어보세요!'
        }
      />
    </div>
  );
}
