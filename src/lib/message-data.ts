import { getSupabase } from './supabase';
import type { Conversation, Message, Profile } from '@/types';

// 대화 목록 조회 (상대방 프로필 + 마지막 메시지 포함)
export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  if (error) throw error;

  const convs = (data || []) as Conversation[];

  // 상대방 프로필과 마지막 메시지를 병렬로 가져오기
  const enriched = await Promise.all(convs.map(async (c) => {
    const otherId = c.user_a === userId ? c.user_b : c.user_a;

    const [profileRes, msgRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', otherId).maybeSingle(),
      supabase.from('messages').select('*').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    return {
      ...c,
      other_user: profileRes.data as Profile | undefined,
      last_message: msgRes.data as Message | undefined,
    };
  }));

  return enriched;
}

// 대화 메시지 조회
export async function fetchMessages(conversationId: string, limit = 100): Promise<Message[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Message[];
}

// 메시지 보내기
export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

// 대화 시작 (없으면 생성)
export async function getOrCreateConversation(otherUserId: string): Promise<Conversation> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  // 정규 순서: user_a < user_b
  const [userA, userB] = user.id < otherUserId ? [user.id, otherUserId] : [otherUserId, user.id];

  // 기존 대화 확인
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();

  if (existing) return existing as Conversation;

  // 새 대화 생성
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_a: userA, user_b: userB })
    .select()
    .single();
  if (error) throw error;
  return data as Conversation;
}

// 메시지 읽음 처리
export async function markAsRead(conversationId: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

// 안 읽은 메시지 수
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = getSupabase();

  // 내가 참여한 대화의 안 읽은 메시지
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (!convs?.length) return 0;

  const convIds = convs.map((c) => c.id);
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', convIds)
    .neq('sender_id', userId)
    .is('read_at', null);

  return count ?? 0;
}

// 유저 차단
export async function blockUser(blockedId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: blockedId });
}

// 차단 해제
export async function unblockUser(blockedId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId);
}

// 차단 여부 확인
export async function isBlocked(blockedId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_blocks')
    .select('blocker_id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  return !!data;
}
