'use client';

import { useAuth } from '@/components/AuthProvider';
import { UserDataProvider } from '@/components/UserDataProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Home, BarChart3, Map, Trophy, User } from 'lucide-react';
import { syncHealthData, isNativeApp } from '@/lib/health-sync';
import AppLogo from '@/components/AppLogo';

const TABS = [
  { href: '/dashboard', label: '홈', Icon: Home },
  { href: '/stats', label: '통계', Icon: BarChart3 },
  { href: '/map', label: '지도', Icon: Map },
  { href: '/social', label: '랭킹', Icon: Trophy },
  { href: '/profile', label: '내 정보', Icon: User },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '홈',
  '/stats': '내 통계',
  '/map': '러닝 지도',
  '/social': '소셜',
  '/profile': '내 정보',
  '/goals': '목표 설정',
  '/history': '히스토리',
  '/connect': '건강 앱 연동',
  '/calendar': '캘린더',
  '/shop': '쇼핑',
  '/mileage': '마일리지',
  '/support': '고객 지원',
  '/privacy': '개인정보처리방침',
};

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] gap-4">
        <AppLogo size={56} />
        <h1 className="text-xl font-bold text-[var(--foreground)]">Routinist</h1>
        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const isTrackPage = pathname === '/track';

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      {/* 헤더 — 동적 타이틀 */}
      {!isTrackPage && (
        <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/dashboard"><AppLogo size={28} /></Link>
              <h1 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
                {PAGE_TITLES[pathname] || Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k + '/'))?.[1] || 'Routinist'}
              </h1>
            </div>
          </div>
        </header>
      )}

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <UserDataProvider>{children}</UserDataProvider>
      </main>

      {/* 하단 5탭 네비게이션 — pill 활성 효과 */}
      {!isTrackPage && (
        <nav className="sticky bottom-0 z-40 border-t border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-16">
            {TABS.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  <tab.Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
