'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { getProfile, handleOAuthCallback } from '@/lib/auth';
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

// 로그인 진단 로그 — 사용자가 실기기에서 /login?debug=1 을 열면 화면에서 확인 가능
function authLog(msg: string, extra?: unknown) {
  try {
    const line = `[${new Date().toISOString()}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`;
    console.log('[Auth]', msg, extra ?? '');
    if (typeof window !== 'undefined') {
      const key = 'routinist_auth_log';
      const prev = window.localStorage.getItem(key) || '';
      const next = (prev + '\n' + line).split('\n').slice(-50).join('\n');
      window.localStorage.setItem(key, next);
    }
  } catch {}
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

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        authLog('onAuthStateChange', { event, hasSession: !!s });
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

    let removeUrlListener: (() => void) | null = null;

    const processCallbackUrl = async (url: string) => {
      authLog('딥링크 수신', { url: url.slice(0, 200) });
      if (!(url.includes('auth/callback') || url.includes('access_token') || url.includes('code='))) {
        authLog('auth 관련 URL 아님 — 스킵');
        return;
      }
      let resolvedSession: Session | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const s = await handleOAuthCallback(url);
          if (s) {
            authLog('OAuth 콜백 성공', { attempt: attempt + 1 });
            resolvedSession = s;
            break;
          }
        } catch (e) {
          lastError = e;
          authLog('OAuth 콜백 에러', { attempt: attempt + 1, error: String(e) });
        }
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
      }
      if (!resolvedSession) {
        const supabase = getSupabase();
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        resolvedSession = existingSession;
        if (resolvedSession) authLog('폴백: 기존 세션 발견');
      }
      if (resolvedSession) {
        await new Promise(r => setTimeout(r, 300));
        if (!window.location.pathname.startsWith('/dashboard')) {
          window.location.replace('/dashboard');
        }
      } else {
        authLog('모든 OAuth 시도 실패', { lastError: String(lastError) });
      }
    };

    import('@capacitor/app').then(({ App }) => {
      // 1) 앱이 이미 열린 상태에서 딥링크가 들어오는 경우
      App.addListener('appUrlOpen', async ({ url }) => {
        await processCallbackUrl(url);
      }).then(handle => {
        removeUrlListener = () => handle.remove();
      });

      // 2) 콜드 스타트: 앱이 완전히 종료됐다가 딥링크로 되살아난 경우
      //    appUrlOpen 이벤트가 리스너 등록 전에 발생해 유실될 수 있음 → getLaunchUrl로 회수
      App.getLaunchUrl().then(result => {
        if (result?.url) {
          authLog('콜드 스타트 launchUrl', { url: result.url.slice(0, 200) });
          processCallbackUrl(result.url);
        }
      }).catch(() => {});
    }).catch(() => {});

    return () => { removeUrlListener?.(); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
