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

    const goToDashboard = () => {
      // 여러 번 호출 방지
      try { router.replace('/dashboard'); } catch {}
      // 폴백: router가 동작하지 않을 경우
      setTimeout(() => {
        if (window.location.pathname.includes('callback')) {
          window.location.href = '/dashboard';
        }
      }, 2000);
    };

    const handleAuth = async () => {
      try {
        // 1. PKCE code 교환
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            await new Promise(r => setTimeout(r, 500));
            goToDashboard();
            return;
          }
          if (error) console.warn('[Auth Callback] code 교환 실패:', error.message);
        }

        // 2. URL hash에서 토큰 추출
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
              await new Promise(r => setTimeout(r, 500));
              goToDashboard();
              return;
            }
          }
        }

        // 3. 세션이 이미 설정되었는지 재시도 (최대 3초)
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            goToDashboard();
            return;
          }
        }

        // 모든 시도 실패
        console.warn('[Auth Callback] 세션 확인 실패, 로그인 페이지로 이동');
        router.replace('/login');
      } catch (err) {
        console.error('[Auth Callback] 처리 실패:', err);
        // 에러 발생해도 세션이 이미 있을 수 있음
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          goToDashboard();
        } else {
          router.replace('/login');
        }
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
