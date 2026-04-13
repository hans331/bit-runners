import { getSupabase } from './supabase';
import type { Profile, Club, ClubMember, Follow, RegionalRanking } from '@/types';

// =============================================
// 팔로우
// =============================================

export async function followUser(followingId: string) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { error } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: followingId,
  });
  if (error) throw error;
}

export async function unfollowUser(followingId: string) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { error } = await supabase.from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function fetchFollowers(userId: string): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId);
  if (error) throw error;
  return (data || []).map((d) => d.profiles as unknown as Profile);
}

export async function fetchFollowing(userId: string): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id, profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId);
  if (error) throw error;
  return (data || []).map((d) => d.profiles as unknown as Profile);
}

export async function isFollowing(followingId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const supabase = getSupabase();
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

// =============================================
// 유저 검색
// =============================================

export async function searchUsers(query: string, limit = 20): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', `%${query}%`)
    .eq('is_public', true)
    .limit(limit);
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function fetchPublicUsers(limit = 50): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_public', true)
    .order('total_distance_km', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Profile[];
}

// =============================================
// 클럽
// =============================================

export async function fetchClubs(): Promise<Club[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .order('member_count', { ascending: false });
  if (error) throw error;
  return (data || []) as Club[];
}

export async function fetchClub(clubId: string): Promise<Club | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .maybeSingle();
  if (error) throw error;
  return data as Club | null;
}

export async function fetchClubMembers(clubId: string): Promise<ClubMember[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('club_members')
    .select('*, profiles(*)')
    .eq('club_id', clubId)
    .order('joined_at');
  if (error) throw error;
  return (data || []).map((d) => ({
    ...d,
    profile: d.profiles as unknown as Profile,
  })) as ClubMember[];
}

export async function createClub(name: string, description?: string): Promise<Club> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { data, error } = await supabase
    .from('clubs')
    .insert({ name, description: description || null, created_by: user.id })
    .select()
    .single();
  if (error) throw error;

  // 생성자를 owner로 추가
  await supabase.from('club_members').insert({
    club_id: data.id,
    user_id: user.id,
    role: 'owner',
  });

  return data as Club;
}

export async function joinClub(clubId: string) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { error } = await supabase.from('club_members').insert({
    club_id: clubId,
    user_id: user.id,
    role: 'member',
  });
  if (error) throw error;
}

export async function leaveClub(clubId: string) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { error } = await supabase.from('club_members')
    .delete()
    .eq('club_id', clubId)
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function getMyClubs(): Promise<Club[]> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('club_members')
    .select('club_id, clubs(*)')
    .eq('user_id', user.id);
  if (error) throw error;
  return (data || []).map((d) => d.clubs as unknown as Club);
}

export async function isClubMember(clubId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('club_members')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .maybeSingle();
  return !!data;
}

// =============================================
// 지역 랭킹
// =============================================

export async function fetchRegionalRankings(
  regionGu: string,
  year: number,
  month: number,
  limit = 50,
): Promise<RegionalRanking[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('regional_rankings')
    .select('*')
    .eq('region_gu', regionGu)
    .eq('year', year)
    .eq('month', month)
    .order('rank_in_gu')
    .limit(limit);
  if (error) throw error;
  return (data || []) as RegionalRanking[];
}
