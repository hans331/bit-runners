'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithProvider } from '@/lib/auth';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';
import type { Provider } from '@supabase/supabase-js';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleLogin = async (provider: Provider) => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.');
      setSigningIn(false);
    }
  };

  if (loading) {
    // 3초 이상 로딩되면 그냥 로그인 화면 보여주기
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-6">
      {/* 로고 */}
      <div className="text-center mb-12">
        <span className="text-6xl block mb-4">🏃🏻</span>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Routinist</h1>
        <p className="text-xs text-[var(--muted)] mt-2">나만의 러닝 루틴을 만들어보세요</p>
      </div>

      {/* 소셜 로그인 버튼 */}
      <div className="w-full max-w-sm space-y-3">
        {/* 카카오 */}
        <button
          onClick={() => handleLogin('kakao')}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-semibold py-3.5 rounded-xl transition-all text-base disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
            <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.12c-.1.36.3.65.62.45l4.9-3.22c.4.04.8.06 1.22.06 5.52 0 10-3.36 10-7.65C22 6.36 17.52 3 12 3z"/>
          </svg>
          카카오로 시작하기
        </button>

        {/* 구글 */}
        <button
          onClick={() => handleLogin('google')}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-xl transition-all text-base border border-gray-300 disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </button>

        {/* 애플 */}
        <button
          onClick={() => handleLogin('apple')}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white font-semibold py-3.5 rounded-xl transition-all text-base disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Apple로 시작하기
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
      )}

      <p className="mt-8 text-xs text-[var(--muted)] text-center max-w-xs">
        시작하면 <a href="/privacy" className="underline">개인정보처리방침</a>에 동의하는 것으로 간주합니다.
      </p>
    </div>
  );
}
