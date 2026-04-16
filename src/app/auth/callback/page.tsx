'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { Suspense } from 'react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = getSupabase();
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      console.error('[Auth Callback] OAuth error:', errorParam);
      router.replace('/login');
      return;
    }

    const handleAuth = async () => {
      try {
        if (code) {
          // PKCE: authorization code → session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (data.session) {
            // onAuthStateChange가 세션을 감지할 시간을 줌
            await new Promise(r => setTimeout(r, 300));
            router.replace('/dashboard');
            return;
          }
        }

        // code가 없거나 실패 시 → 해시 토큰 확인 + 기존 세션 폴백
        // URL hash에서 토큰 추출 시도
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && data.session) {
              await new Promise(r => setTimeout(r, 300));
              router.replace('/dashboard');
              return;
            }
          }
        }

        // 최종 폴백: 세션이 이미 설정되었는지 재시도 (최대 5초)
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace('/dashboard');
            return;
          }
        }

        // 모든 시도 실패
        console.warn('[Auth Callback] 세션 확인 실패, 로그인 페이지로 이동');
        router.replace('/login');
      } catch (err) {
        console.error('[Auth Callback] 처리 실패:', err);
        router.replace('/login');
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-xs text-[var(--muted)]">로그인 처리 중...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
