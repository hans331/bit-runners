'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { Suspense } from 'react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = getSupabase();
    const code = searchParams.get('code');

    if (code) {
      // PKCE: authorization code를 세션으로 교환
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error('Auth error:', error);
          router.replace('/login');
        } else if (data.session) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      });
    } else {
      // code가 없으면 해시 기반 토큰 확인 (implicit flow fallback)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.replace('/dashboard');
        } else {
          // 잠시 대기 후 재확인
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session: s } }) => {
              router.replace(s ? '/dashboard' : '/login');
            });
          }, 2000);
        }
      });
    }
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
