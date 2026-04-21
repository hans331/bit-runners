// 루틴포토 (Routinist Photos) — 데이터 접근 레이어
// 2026-04-21 컨셉 피벗: opt-out 기본, 좋아요, 친구/동네 가중치 트렌딩

import { getSupabase } from './supabase';

export interface RoutinePhoto {
  photo_id: string;
  photo_url: string;
  caption: string | null;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  region_gu: string | null;
  distance_km: number;
  activity_date: string;
  like_count: number;
  liked_by_me?: boolean;
  created_at: string;
}

// 메인 하단 캐러셀 — 최근 7일 × 친구×1.5 × 동네×1.3 가중치 트렌딩
export async function fetchTrendingPhotos(limit = 20): Promise<RoutinePhoto[]> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc('routine_photos_trending', {
    viewer_id: user.id,
    limit_n: limit,
  });
  if (error) { console.warn('[routine_photos] trending 실패', error); return []; }
  return (data ?? []) as RoutinePhoto[];
}

// 최신 순 (포토 탭 '최신')
export async function fetchRecentPhotos(limit = 50): Promise<RoutinePhoto[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('public_gallery_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.warn('[routine_photos] recent 실패', error); return []; }
  return (data ?? []).map(mapRow);
}

// 친구만 (포토 탭 '친구')
export async function fetchFriendPhotos(friendIds: string[], limit = 50): Promise<RoutinePhoto[]> {
  if (friendIds.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('public_gallery_feed')
    .select('*')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.warn('[routine_photos] friends 실패', error); return []; }
  return (data ?? []).map(mapRow);
}

// 내 구(區) (포토 탭 '동네')
export async function fetchRegionPhotos(regionGu: string, limit = 50): Promise<RoutinePhoto[]> {
  if (!regionGu) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('public_gallery_feed')
    .select('*')
    .eq('region_gu', regionGu)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.warn('[routine_photos] region 실패', error); return []; }
  return (data ?? []).map(mapRow);
}

// 내가 좋아요한 (포토 탭 '좋아요함')
export async function fetchMyLikedPhotos(limit = 50): Promise<RoutinePhoto[]> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc('my_liked_photos', {
    viewer_id: user.id,
    limit_n: limit,
  });
  if (error) { console.warn('[routine_photos] liked 실패', error); return []; }
  return (data ?? []) as RoutinePhoto[];
}

// 좋아요 토글 — optimistic update
export async function togglePhotoLike(photoId: string, currentlyLiked: boolean): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authed');

  if (currentlyLiked) {
    const { error } = await supabase
      .from('photo_likes')
      .delete()
      .eq('photo_id', photoId)
      .eq('user_id', user.id);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('photo_likes')
      .insert({ photo_id: photoId, user_id: user.id });
    if (error) throw error;
    return true;
  }
}

// 내가 좋아요한 사진 ID 일괄 조회 (트렌딩 결과와 결합용)
export async function fetchMyLikedIds(): Promise<Set<string>> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data, error } = await supabase
    .from('photo_likes')
    .select('photo_id')
    .eq('user_id', user.id);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { photo_id: string }) => r.photo_id));
}

// view 행을 RoutinePhoto 로 변환 (뷰는 photo_id 대신 id 가 다르니 일치시킴)
function mapRow(row: Record<string, unknown>): RoutinePhoto {
  return {
    photo_id: (row.photo_id as string) ?? (row.id as string),
    photo_url: row.photo_url as string,
    caption: (row.caption as string) ?? null,
    user_id: row.user_id as string,
    display_name: row.display_name as string,
    avatar_url: (row.avatar_url as string) ?? null,
    region_gu: (row.region_gu as string) ?? null,
    distance_km: Number(row.distance_km ?? 0),
    activity_date: row.activity_date as string,
    like_count: Number(row.like_count ?? 0),
    created_at: row.created_at as string,
  };
}
