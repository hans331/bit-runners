'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { getProfile, handleOAuthCallback } from '@/lib/auth';
// getSupabase is also used in deep link fallback
import type { Profile } from '@/types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await getProfile(userId);
    setProfile(p);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    const supabase = getSupabase();

    // 초기 세션 로드
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await loadProfile(s.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // Capacitor 딥링크 처리 — OAuth 콜백 URL을 받아서 세션 설정
  useEffect(() => {
    const isNative = typeof window !== 'undefined' &&
      (window as any).Capacitor !== undefined;
    if (!isNative) return;

    let removeListener: (() => void) | null = null;

    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async ({ url }) => {
        console.log('[Auth] 딥링크 수신:', url);
        // routinist://auth/callback#access_token=... 또는 ?code=...
        if (url.includes('auth/callback') || url.includes('access_token') || url.includes('code=')) {
          // 최대 3번 시도
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const session = await handleOAuthCallback(url);
              if (session) {
                console.log('[Auth] OAuth 콜백 성공 (시도 ' + (attempt + 1) + ')');
                return;
              }
              // 세션이 null이면 잠시 대기 후 재시도
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            } catch (e) {
              console.error(`[Auth] OAuth callback 시도 ${attempt + 1} 실패:`, e);
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
          // 모든 시도 실패해도 세션이 이미 설정됐을 수 있음
          const supabase = getSupabase();
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            console.log('[Auth] 기존 세션 발견, 로그인 성공');
          } else {
            console.warn('[Auth] 모든 OAuth 시도 실패');
          }
        }
      }).then(handle => {
        removeListener = () => handle.remove();
      });
    }).catch(() => {});

    return () => { removeListener?.(); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
