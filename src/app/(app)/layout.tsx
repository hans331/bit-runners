'use client';

import { useAuth } from '@/components/AuthProvider';
import { UserDataProvider } from '@/components/UserDataProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Map, Users, User, Plus, PenLine } from 'lucide-react';

const TABS = [
  { href: '/dashboard', label: '대시보드', Icon: LayoutDashboard },
  { href: '/map', label: '지도', Icon: Map },
  // 중앙 FAB 자리 (별도 렌더링)
  { href: '/social', label: '소셜', Icon: Users },
  { href: '/profile', label: '내 정보', Icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

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
      {/* 헤더 - 달리기 화면에서는 숨김 */}
      {!isTrackPage && (
        <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          <div className="px-4 h-14 flex items-center justify-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl">🏃🏻</span>
              <h1 className="text-lg font-extrabold tracking-tight text-[var(--foreground)]">Routinist</h1>
            </Link>
          </div>
        </header>
      )}

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <UserDataProvider>{children}</UserDataProvider>
      </main>

      {/* 하단 4탭 + 중앙 FAB 네비게이션 */}
      {!isTrackPage && (
        <nav className="sticky bottom-0 z-40 border-t border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-16 relative">
            {/* 왼쪽 2탭 */}
            {TABS.slice(0, 2).map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                  }`}
                >
                  <tab.Icon size={22} />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </Link>
              );
            })}

            {/* 중앙 FAB - 달리기 시작 */}
            <div className="flex flex-col items-center -mt-7">
              <Link
                href="/track"
                className="w-14 h-14 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 active:scale-95 transition-transform"
              >
                <Plus size={28} strokeWidth={2.5} />
              </Link>
              <span className="text-[10px] font-medium text-[var(--muted)] mt-0.5">달리기</span>
            </div>

            {/* 오른쪽 2탭 */}
            {TABS.slice(2).map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                  }`}
                >
                  <tab.Icon size={22} />
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
