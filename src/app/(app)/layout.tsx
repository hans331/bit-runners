'use client';

import { useAuth } from '@/components/AuthProvider';
import { UserDataProvider } from '@/components/UserDataProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Home, CalendarDays, Map, Users, User } from 'lucide-react';
import { syncHealthData, isNativeApp } from '@/lib/health-sync';

const TABS = [
  { href: '/dashboard', label: '홈', Icon: Home },
  { href: '/calendar', label: '캘린더', Icon: CalendarDays },
  { href: '/map', label: '지도', Icon: Map },
  { href: '/social', label: '클럽', Icon: Users },
  { href: '/profile', label: '내 정보', Icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // 앱 열 때 + 포그라운드 복귀 시 자동 동기화
  useEffect(() => {
    if (!user) return;

    const doSync = async () => {
      const now = Date.now();
      // 마지막 동기화 후 5분 이내면 스킵
      if (now - lastSyncRef.current < 5 * 60 * 1000) return;
      lastSyncRef.current = now;

      if (isNativeApp()) {
        try {
          await syncHealthData(user.id);
        } catch {}
      }
    };

    // 앱 로드 시 한 번 실행
    doSync();

    // Capacitor 앱 포그라운드 복귀 감지
    let removeListener: (() => void) | null = null;

    if (isNativeApp()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) doSync();
        }).then(handle => {
          removeListener = () => handle.remove();
        });
      }).catch(() => {});
    }

    return () => { removeListener?.(); };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const isTrackPage = pathname === '/track';

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      {/* 헤더 */}
      {!isTrackPage && (
        <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          <div className="px-4 h-14 flex items-center justify-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl">🏃🏻</span>
              <h1 className="text-lg font-extrabold tracking-tight text-[var(--foreground)]">BIT Runners</h1>
            </Link>
          </div>
        </header>
      )}

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <UserDataProvider>{children}</UserDataProvider>
      </main>

      {/* 하단 5탭 네비게이션 */}
      {!isTrackPage && (
        <nav className="sticky bottom-0 z-40 border-t border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-14">
            {TABS.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                  }`}
                >
                  <tab.Icon size={20} />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
