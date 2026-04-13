import { getSupabase } from './supabase';
import type { ActivityComment, ActivityCheer, Profile } from '@/types';

// =============================================
// 댓글
// =============================================

export async function fetchComments(activityId: string): Promise<ActivityComment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('activity_comments')
    .select('*, profiles(*)')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((d) => ({
    ...d,
    profile: d.profiles as unknown as Profile,
  })) as ActivityComment[];
}

export async function addComment(activityId: string, body: string): Promise<ActivityComment> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { data, error } = await supabase
    .from('activity_comments')
    .insert({ activity_id: activityId, user_id: user.id, body })
    .select('*, profiles(*)')
    .single();
  if (error) throw error;
  return { ...data, profile: data.profiles as unknown as Profile } as ActivityComment;
}

export async function deleteComment(commentId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('activity_comments').delete().eq('id', commentId);
  if (error) throw error;
}

// =============================================
// 응원 (쿠도스)
// =============================================

export async function fetchCheers(activityId: string): Promise<ActivityCheer[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('activity_cheers')
    .select('*')
    .eq('activity_id', activityId);
  if (error) throw error;
  return (data || []) as ActivityCheer[];
}

export async function toggleCheer(activityId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  // 이미 응원했는지 확인
  const { data: existing } = await supabase
    .from('activity_cheers')
    .select('activity_id')
    .eq('activity_id', activityId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('activity_cheers')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', user.id);
    return false; // 응원 취소
  } else {
    await supabase.from('activity_cheers')
      .insert({ activity_id: activityId, user_id: user.id });
    return true; // 응원 추가
  }
}

export async function getCheerCount(activityId: string): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from('activity_cheers')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', activityId);
  if (error) return 0;
  return count ?? 0;
}

export async function hasCheered(activityId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('activity_cheers')
    .select('activity_id')
    .eq('activity_id', activityId)
    .eq('user_id', user.id)
    .maybeSingle();
  return !!data;
}
