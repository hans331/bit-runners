'use client';

import { useState } from 'react';
import { signInWithProvider } from '@/lib/auth';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';
import type { Provider } from '@supabase/supabase-js';
import AppLogo from '@/components/AppLogo';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      window.location.replace('/dashboard');
    }
  }, [user, loading]);

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleLogin = async (provider: Provider) => {
    setError(null);
    setSigningIn(true);
    setLoadingProvider(provider);
    try {
      await signInWithProvider(provider);
      // 웹에서는 리다이렉트됨. 네이티브에서는 브라우저 열림.
      // 10초 후에도 로그인 화면이면 상태 리셋
      setTimeout(() => {
        setSigningIn(false);
        setLoadingProvider(null);
      }, 10000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.';
      setError(`${provider} 로그인 실패: ${msg}`);
      setSigningIn(false);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-[#0a0f1a] dark:via-[#0f1729] dark:to-[#0a1a1a]">
      {/* 배경 장식 원 */}
      <div className="absolute top-[-80px] right-[-60px] w-64 h-64 rounded-full bg-blue-200/30 dark:bg-blue-900/20 blur-3xl" />
      <div className="absolute bottom-[-60px] left-[-40px] w-48 h-48 rounded-full bg-green-200/30 dark:bg-green-900/20 blur-3xl" />

      {/* 로고 */}
      <div className="text-center mb-12 relative z-10">
        <div className="mx-auto mb-4">
          <AppLogo size={80} />
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Routinist</h1>
        <p className="text-sm text-[var(--muted)] mt-2">달리기로 만드는 나만의 루틴</p>
      </div>

      {/* 소셜 로그인 버튼 */}
      <div className="w-full max-w-sm space-y-3 relative z-10">
        {/* 카카오 */}
        <button
          onClick={() => handleLogin('kakao')}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-semibold py-3.5 rounded-xl transition-all text-base disabled:opacity-50"
        >
          {loadingProvider === 'kakao' ? (
            <div className="animate-spin w-5 h-5 border-2 border-[#191919] border-t-transparent rounded-full" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.12c-.1.36.3.65.62.45l4.9-3.22c.4.04.8.06 1.22.06 5.52 0 10-3.36 10-7.65C22 6.36 17.52 3 12 3z"/>
            </svg>
          )}
          {loadingProvider === 'kakao' ? '카카오 로그인 중...' : '카카오로 시작하기'}
        </button>

        {/* 구글 */}
        <button
          onClick={() => handleLogin('google')}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-xl transition-all text-base border border-gray-300 disabled:opacity-50"
        >
          {loadingProvider === 'google' ? (
            <div className="animate-spin w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loadingProvider === 'google' ? 'Google 로그인 중...' : 'Google로 시작하기'}
        </button>

        {/* 애플 */}
        <button
          onClick={() => handleLogin('apple')}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white font-semibold py-3.5 rounded-xl transition-all text-base disabled:opacity-50"
        >
          {loadingProvider === 'apple' ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          {loadingProvider === 'apple' ? 'Apple 로그인 중...' : 'Apple로 시작하기'}
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
