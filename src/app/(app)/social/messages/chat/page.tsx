'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { fetchMessages, sendMessage, markAsRead } from '@/lib/message-data';
import { getSupabase } from '@/lib/supabase';
import { ArrowLeft, Send, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import type { Message, Profile } from '@/types';

function ChatView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const conversationId = searchParams.get('id');

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const loadData = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);
    try {
      const supabase = getSupabase();

      // 대화 정보
      const { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (conv) {
        const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherId).maybeSingle();
        setOtherUser(profile as Profile | null);
      }

      const msgs = await fetchMessages(conversationId);
      setMessages(msgs);

      // 읽음 처리
      await markAsRead(conversationId, user.id);
    } catch {} finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [conversationId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime 구독
  useEffect(() => {
    if (!conversationId) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(scrollToBottom, 100);
        // 읽음 처리
        if (user && newMsg.sender_id !== user.id) {
          markAsRead(conversationId, user.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || sending) return;
    setSending(true);
    try {
      await sendMessage(conversationId, newMessage.trim());
      setNewMessage('');
    } catch {} finally {
      setSending(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-[var(--muted)]">대화를 찾을 수 없습니다</p>
        <button onClick={() => router.back()} className="text-[var(--accent)] text-sm mt-4">뒤로가기</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-lg mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)] flex-shrink-0">
        <Link href="/social/messages" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <Link href={otherUser ? `/profile/view?id=${otherUser.id}` : '#'} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm">🏃🏻</div>
            )}
          </div>
          <span className="text-sm font-semibold text-[var(--foreground)] truncate">
            {otherUser?.display_name ?? '러너'}
          </span>
        </Link>
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--muted)] py-8">첫 메시지를 보내보세요!</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  isMine
                    ? 'bg-[var(--accent)] text-white rounded-br-md'
                    : 'bg-[var(--card)] text-[var(--foreground)] rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className={`text-sm mt-1 ${isMine ? 'text-white/60' : 'text-[var(--muted)]'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 입력 영역 */}
      <div className="flex-shrink-0 border-t border-[var(--card-border)] px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="메시지를 입력하세요"
            maxLength={2000}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="px-3 py-2.5 rounded-xl bg-[var(--accent)] text-white disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" /></div>}>
      <ChatView />
    </Suspense>
  );
}
