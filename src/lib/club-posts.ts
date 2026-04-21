// 클럽 피드 (트위터/스레드 스타일 짧은 게시글) + 공지 핀 + 좋아요/댓글

import { getSupabase } from './supabase';

export interface ClubPost {
  id: string;
  body: string;
  photo_url: string | null;
  is_notice: boolean;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  author_role: 'owner' | 'admin' | 'member' | null;
}

export interface ClubPostComment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles?: { display_name: string; avatar_url: string | null };
}

export async function fetchClubFeed(clubId: string, limit = 30): Promise<ClubPost[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_club_feed', { p_club_id: clubId, p_limit: limit });
  if (error) throw error;
  return (data as ClubPost[]) ?? [];
}

export async function createClubPost(params: {
  clubId: string;
  authorId: string;
  body: string;
  photoUrl?: string | null;
  isNotice?: boolean;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('club_posts')
    .insert({
      club_id: params.clubId,
      author_id: params.authorId,
      body: params.body,
      photo_url: params.photoUrl ?? null,
      is_notice: params.isNotice ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClubPost(postId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('club_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function toggleClubPostNotice(postId: string, isNotice: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase.from('club_posts').update({ is_notice: isNotice }).eq('id', postId);
  if (error) throw error;
}

export async function toggleClubPostLike(postId: string, userId: string, currentlyLiked: boolean) {
  const supabase = getSupabase();
  if (currentlyLiked) {
    const { error } = await supabase.from('club_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('club_post_likes').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}

export async function fetchClubPostComments(postId: string): Promise<ClubPostComment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('club_post_comments')
    .select('id, body, created_at, author_id, profiles(display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as ClubPostComment[]) ?? [];
}

export async function createClubPostComment(postId: string, authorId: string, body: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('club_post_comments').insert({
    post_id: postId, author_id: authorId, body,
  });
  if (error) throw error;
}

export async function uploadClubPostPhoto(userId: string, file: File): Promise<string> {
  const supabase = getSupabase();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/club-post/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('activity-photos').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('activity-photos').getPublicUrl(path);
  return data.publicUrl;
}
