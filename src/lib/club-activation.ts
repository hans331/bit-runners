// 클럽 활성화 기능 — 챌린지 / 이벤트 / 응원 이모지 / 주간 MVP 공통 API

import { getSupabase } from './supabase';

// ============ 챌린지 ============

export interface ClubChallenge {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  target_km: number | null;
  target_run_count: number | null;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}

export interface ChallengeProgress {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  distance_km: number;
  run_count: number;
  km_pct: number | null;
  count_pct: number | null;
  completed: boolean;
}

export async function fetchClubChallenges(clubId: string): Promise<ClubChallenge[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('club_challenges')
    .select('*')
    .eq('club_id', clubId)
    .order('end_date', { ascending: false });
  if (error) throw error;
  return (data as ClubChallenge[]) ?? [];
}

export async function createClubChallenge(params: {
  clubId: string;
  authorId: string;
  title: string;
  description?: string;
  targetKm?: number;
  targetRunCount?: number;
  startDate: string;
  endDate: string;
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from('club_challenges').insert({
    club_id: params.clubId,
    created_by: params.authorId,
    title: params.title,
    description: params.description ?? null,
    target_km: params.targetKm ?? null,
    target_run_count: params.targetRunCount ?? null,
    start_date: params.startDate,
    end_date: params.endDate,
  });
  if (error) throw error;
}

export async function deleteClubChallenge(challengeId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('club_challenges').delete().eq('id', challengeId);
  if (error) throw error;
}

export async function getClubChallengeProgress(challengeId: string): Promise<ChallengeProgress[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_club_challenge_progress', { p_challenge_id: challengeId });
  if (error) throw error;
  return (data as ChallengeProgress[]) ?? [];
}

// ============ 이벤트 ============

export interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  event_at: string;
  location: string | null;
  max_participants: number | null;
  created_by: string;
  created_by_name: string;
  going_count: number;
  maybe_count: number;
  my_status: 'going' | 'maybe' | 'no' | null;
}

export async function fetchClubEvents(clubId: string): Promise<ClubEvent[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_club_events', { p_club_id: clubId });
  if (error) throw error;
  return (data as ClubEvent[]) ?? [];
}

export async function createClubEvent(params: {
  clubId: string;
  authorId: string;
  title: string;
  description?: string;
  eventAt: string;
  location?: string;
  maxParticipants?: number;
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from('club_events').insert({
    club_id: params.clubId,
    created_by: params.authorId,
    title: params.title,
    description: params.description ?? null,
    event_at: params.eventAt,
    location: params.location ?? null,
    max_participants: params.maxParticipants ?? null,
  });
  if (error) throw error;
}

export async function deleteClubEvent(eventId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('club_events').delete().eq('id', eventId);
  if (error) throw error;
}

export async function rsvpClubEvent(eventId: string, userId: string, status: 'going' | 'maybe' | 'no') {
  const supabase = getSupabase();
  const { error } = await supabase.from('club_event_rsvps').upsert({
    event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString(),
  }, { onConflict: 'event_id,user_id' });
  if (error) throw error;
}

// ============ 응원 이모지 ============

export type CheerEmoji = '👏' | '🔥' | '💪' | '❤️' | '🎉';
export const CHEER_EMOJIS: CheerEmoji[] = ['👏', '🔥', '💪', '❤️', '🎉'];

export interface CheerAgg {
  activity_id: string;
  emoji: string;
  total: number;
  cheered_by_me: boolean;
}

export async function fetchActivityCheers(activityIds: string[]): Promise<Map<string, CheerAgg[]>> {
  if (activityIds.length === 0) return new Map();
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_activity_cheers', { p_activity_ids: activityIds });
  if (error) throw error;
  const map = new Map<string, CheerAgg[]>();
  (data as CheerAgg[] ?? []).forEach(row => {
    const list = map.get(row.activity_id) ?? [];
    list.push(row);
    map.set(row.activity_id, list);
  });
  return map;
}

export async function toggleCheer(activityId: string, userId: string, emoji: CheerEmoji, currentlyCheered: boolean) {
  const supabase = getSupabase();
  if (currentlyCheered) {
    const { error } = await supabase.from('activity_cheers').delete()
      .eq('activity_id', activityId).eq('user_id', userId).eq('emoji', emoji);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('activity_cheers').insert({
      activity_id: activityId, user_id: userId, emoji,
    });
    if (error) throw error;
  }
}

// ============ 주간 MVP ============

export interface WeeklyMvp {
  category: 'distance' | 'runs' | 'streak';
  emoji: string;
  label: string;
  winner_id: string;
  winner_name: string;
  winner_avatar: string | null;
  value: number;
}

export async function fetchClubWeeklyMvp(clubId: string): Promise<WeeklyMvp[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_club_weekly_mvp', { p_club_id: clubId });
  if (error) throw error;
  return (data as WeeklyMvp[]) ?? [];
}
