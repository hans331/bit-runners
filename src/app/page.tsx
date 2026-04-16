'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import AppLogo from '@/components/AppLogo';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // 3초 타임아웃 — 로딩이 너무 오래 걸리면 로그인 페이지로
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading && !timedOut) return;
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, loading, timedOut, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)]">
      <div className="mb-4"><AppLogo size={72} /></div>
      <h1 className="text-3xl font-bold text-[var(--foreground)]">Routinist</h1>
      <p className="text-xs text-[var(--muted)] mt-2">나만의 러닝 루틴</p>
      <div className="mt-8 animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
    </div>
  );
}
