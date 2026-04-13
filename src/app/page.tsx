'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)]">
      <span className="text-6xl mb-4">🏃🏻</span>
      <h1 className="text-3xl font-extrabold text-[var(--foreground)]">Routinist</h1>
      <p className="text-sm text-[var(--muted)] mt-2">나만의 러닝 루틴</p>
      <div className="mt-8 animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
    </div>
  );
}
