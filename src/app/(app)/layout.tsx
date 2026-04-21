'use client';

import { useAuth } from '@/components/AuthProvider';
import { UserDataProvider } from '@/components/UserDataProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Home, Map, Trophy, User, ShoppingBag } from 'lucide-react';
import { syncHealthData, isNativeApp } from '@/lib/health-sync';
import AppLogo from '@/components/AppLogo';
import SwipeNav from '@/components/SwipeNav';

// 5탭 구조: 통계는 홈에 흡수, 쇼핑은 수익 모델이라 최상위로 승격 (Cafe24 연동)
// activeFor: 해당 경로에서도 이 탭이 활성화된 것으로 표시 (내 정보 하위 페이지들)
const TABS: {
  href: string;
  label: string;
  Icon: typeof Home;
  activeFor?: string[];
}[] = [
  { href: '/dashboard', label: '홈', Icon: Home },
  { href: '/map', label: '지도', Icon: Map },
  { href: '/social', label: '랭킹', Icon: Trophy },
  { href: '/shop', label: '쇼핑', Icon: ShoppingBag },
  {
    href: '/profile',
    label: '내 정보',
    Icon: User,
    activeFor: ['/messages', '/mileage', '/goals', '/connect', '/awards', '/support', '/privacy'],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '홈',
  '/map': '러닝 지도',
  '/social': '랭킹',
  '/profile': '내 정보',
  '/goals': '목표 설정',
  '/history': '히스토리',
  '/connect': '건강 앱 연동',
  '/calendar': '캘린더',
  '/shop': 'Routinist Store',
  '/messages': '쪽지함',
  '/mileage': '마일리지',
  '/support': '고객 지원',
  '/privacy': '개인정보처리방침',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastSyncRef = useRef<number>(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading) { setLoadingTimeout(false); return; }
    const t = setTimeout(() => setLoadingTimeout(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  // Apple Health 동기화 전략:
  // 1) 앱 열 때 (foreground 진입) 자동 pull
  // 2) 백그라운드에서 포그라운드 복귀 시 자동 pull
  // 3) 수동 새로고침 버튼 (connect 페이지)
  // 폴링 인터벌은 배터리 낭비라 제거. 진정한 백그라운드 push는 HKObserverQuery + enableBackgroundDelivery 필요
  // (현재 @capgo/capacitor-health 미지원 → 커스텀 네이티브 플러그인 TODO)
  useEffect(() => {
    if (!user) return;

    const doSync = async () => {
      const now = Date.now();
      if (now - lastSyncRef.current < 2 * 60 * 1000) return; // 2분 내 중복 실행 방지
      lastSyncRef.current = now;

      if (isNativeApp()) {
        try {
          await syncHealthData(user.id);
        } catch {}
      }
    };

    doSync(); // 앱 로드 시 한 번

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
    // 단일 로딩 화면 — iOS LaunchScreen 과 배경 톤 통일(밝은 민트/화이트).
    // 8초 이상 멈추면 "다시 시도" 버튼 제공 → OAuth 실패 시 무한 대기 방지.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 gap-3 px-6">
        <div className="animate-[fadeInUp_0.4s_ease-out]">
          <AppLogo size={84} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Routinist</h1>
        <p className="text-base font-semibold text-emerald-600">Run Your Routine!</p>
        {!loadingTimeout ? (
          <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mt-2" />
        ) : (
          <div className="mt-3 flex flex-col items-center gap-2">
            <p className="text-sm text-slate-600">로그인이 지연되고 있어요</p>
            <button
              onClick={() => window.location.replace('/login')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-base font-semibold shadow-sm"
            >
              다시 로그인하기
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) return null;

  // h-[100dvh] + overflow-hidden 으로 flex 컨테이너를 뷰포트 높이에 고정.
  // 이전 min-h-screen 구조에서 iOS WebView 의 바운스/에러 상태 시 sticky bottom 탭바가
  // 스크롤에 밀려 올라가는 버그가 발생 — 내부 main 에서만 스크롤되도록 제한.
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[var(--background)]">
      <SwipeNav />
      {/* 헤더 — 동적 타이틀 */}
      <header className="flex-shrink-0 z-40 border-b border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard"><AppLogo size={28} /></Link>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              {PAGE_TITLES[pathname] || Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k + '/'))?.[1] || 'Routinist'}
            </h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 — 유일한 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <UserDataProvider>{children}</UserDataProvider>
      </main>

      {/* 하단 5탭 네비게이션 — flex-shrink-0 로 고정, sticky 제거 */}
      <nav className="flex-shrink-0 z-40 border-t border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          {TABS.map((tab) => {
            const isActive =
              pathname === tab.href ||
              pathname.startsWith(tab.href + '/') ||
              (tab.activeFor?.some(p => pathname === p || pathname.startsWith(p + '/')) ?? false);
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
                <tab.Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
