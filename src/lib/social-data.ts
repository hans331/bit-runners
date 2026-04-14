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

// 내 지역 랭킹 조회 (시/구/동 3단)
export interface MyRegionalRank {
  level: '시' | '구' | '동';
  region: string;
  rank: number;
  total: number;
  myDistance: number;
}

export async function fetchMyRegionalRanks(userId: string, year: number, month: number): Promise<MyRegionalRank[]> {
  const supabase = getSupabase();

  // 내 프로필에서 지역 정보 가져오기
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('region_si, region_gu, region_dong')
    .eq('id', userId)
    .single();

  if (!myProfile?.region_si) return [];

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const results: MyRegionalRank[] = [];

  // 시 단위 랭킹
  if (myProfile.region_si) {
    const { data: siProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('region_si', myProfile.region_si);

    if (siProfiles?.length) {
      const userIds = siProfiles.map(p => p.id);
      const { data: activities } = await supabase
        .from('activities')
        .select('user_id, distance_km')
        .in('user_id', userIds)
        .gte('activity_date', startDate)
        .lt('activity_date', endDate);

      const distMap = new Map<string, number>();
      (activities || []).forEach(a => distMap.set(a.user_id, (distMap.get(a.user_id) || 0) + Number(a.distance_km)));

      const sorted = [...distMap.entries()].sort((a, b) => b[1] - a[1]);
      const myIdx = sorted.findIndex(([uid]) => uid === userId);
      const myDist = distMap.get(userId) || 0;

      results.push({
        level: '시',
        region: myProfile.region_si,
        rank: myIdx >= 0 ? myIdx + 1 : sorted.length + 1,
        total: sorted.length,
        myDistance: Math.round(myDist * 10) / 10,
      });
    }
  }

  // 구 단위 랭킹
  if (myProfile.region_gu) {
    const { data: guProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('region_si', myProfile.region_si)
      .eq('region_gu', myProfile.region_gu);

    if (guProfiles?.length) {
      const userIds = guProfiles.map(p => p.id);
      const { data: activities } = await supabase
        .from('activities')
        .select('user_id, distance_km')
        .in('user_id', userIds)
        .gte('activity_date', startDate)
        .lt('activity_date', endDate);

      const distMap = new Map<string, number>();
      (activities || []).forEach(a => distMap.set(a.user_id, (distMap.get(a.user_id) || 0) + Number(a.distance_km)));

      const sorted = [...distMap.entries()].sort((a, b) => b[1] - a[1]);
      const myIdx = sorted.findIndex(([uid]) => uid === userId);
      const myDist = distMap.get(userId) || 0;

      results.push({
        level: '구',
        region: myProfile.region_gu,
        rank: myIdx >= 0 ? myIdx + 1 : sorted.length + 1,
        total: sorted.length,
        myDistance: Math.round(myDist * 10) / 10,
      });
    }
  }

  // 동 단위 랭킹
  if (myProfile.region_dong) {
    const { data: dongProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('region_si', myProfile.region_si)
      .eq('region_gu', myProfile.region_gu)
      .eq('region_dong', myProfile.region_dong);

    if (dongProfiles?.length) {
      const userIds = dongProfiles.map(p => p.id);
      const { data: activities } = await supabase
        .from('activities')
        .select('user_id, distance_km')
        .in('user_id', userIds)
        .gte('activity_date', startDate)
        .lt('activity_date', endDate);

      const distMap = new Map<string, number>();
      (activities || []).forEach(a => distMap.set(a.user_id, (distMap.get(a.user_id) || 0) + Number(a.distance_km)));

      const sorted = [...distMap.entries()].sort((a, b) => b[1] - a[1]);
      const myIdx = sorted.findIndex(([uid]) => uid === userId);
      const myDist = distMap.get(userId) || 0;

      results.push({
        level: '동',
        region: myProfile.region_dong,
        rank: myIdx >= 0 ? myIdx + 1 : sorted.length + 1,
        total: sorted.length,
        myDistance: Math.round(myDist * 10) / 10,
      });
    }
  }

  return results;
}
