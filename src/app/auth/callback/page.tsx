'use client';

import { useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { handleOAuthCallback } from '@/lib/auth';
import { Suspense } from 'react';

function CallbackHandler() {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const goToDashboard = () => {
      window.location.replace('/dashboard');
    };

    const goToLogin = () => {
      window.location.replace('/login');
    };

    const handleAuth = async () => {
      try {
        const session = await handleOAuthCallback(window.location.href);
        if (session) {
          await new Promise(r => setTimeout(r, 500));
          goToDashboard();
          return;
        }

        const supabase = getSupabase();
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
        goToLogin();
      } catch (err) {
        console.error('[Auth Callback] 처리 실패:', err);
        // 에러 발생해도 세션이 이미 있을 수 있음
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          goToDashboard();
        } else {
          goToLogin();
        }
      }
    };

    handleAuth();
  }, []);

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
