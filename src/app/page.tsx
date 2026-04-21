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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 gap-3 px-6">
      <div className="animate-[fadeInUp_0.4s_ease-out]">
        <AppLogo size={84} />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Routinist</h1>
      <p className="text-base font-semibold text-emerald-600">Run Your Routine!</p>
      <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mt-2" />
    </div>
  );
}
