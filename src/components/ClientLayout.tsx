'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { DataProvider, useData, getTotalDistance, getMemberBadges } from './DataProvider';
import Badges from './Badges';


function Header({ sidebarOpen, onToggleSidebar, onMobileMenu }: { sidebarOpen: boolean; onToggleSidebar: () => void; onMobileMenu: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="px-4 h-16 flex items-center justify-between">
        {/* 좌: 햄버거 메뉴 */}
        <div className="flex items-center w-20 pl-2">
          <button
            onClick={onMobileMenu}
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-[var(--card-border)] active:scale-95 transition-all text-[var(--foreground)]"
            aria-label="메뉴"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex w-11 h-11 items-center justify-center rounded-2xl hover:bg-[var(--card-border)] transition-all text-[var(--foreground)]"
            aria-label="사이드바 토글"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? (
                <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              )}
            </svg>
          </button>
        </div>

        {/* 중앙: 로고 */}
        <Link href="/" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <span className="text-2xl">🏃🏻</span>
          <div className="leading-none">
            <h1 className="text-lg font-extrabold tracking-tight text-[var(--foreground)]">BIT Runners</h1>
            <p className="text-[8px] text-[var(--muted)] tracking-[0.2em] font-medium">BOOST · IMPACT · TOGETHER</p>
          </div>
        </Link>

        {/* 우: 액션 버튼 */}
        <div className="flex items-center gap-2 w-20 justify-end">
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-[var(--card-border)] active:scale-95 transition-all text-[var(--muted)]"
            aria-label="테마 전환"
          >
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isLogPage = pathname === '/log';

  return (
    <ThemeProvider>
      <DataProvider>
        <div className="flex flex-col h-full min-h-screen">
          <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(prev => !prev)} onMobileMenu={() => setMobileOpen(true)} />
          <div className="flex flex-1 overflow-hidden">
            {!isLogPage && (
              <div className={`hidden lg:block transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
                <div className="w-72 h-[calc(100vh-65px)] sticky top-[65px] overflow-y-auto bg-[var(--sidebar-bg)] border-r border-[var(--card-border)]">
                  <SidebarContent />
                </div>
              </div>
            )}
            {!isLogPage && <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />}
            <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
          </div>
        </div>
      </DataProvider>
    </ThemeProvider>
  );
}

function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[var(--background)] border-r border-[var(--card-border)] overflow-y-auto animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏃🏻</span>
            <h2 className="text-base font-bold text-[var(--foreground)]">메뉴</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-[var(--card-border)] text-[var(--muted)] active:scale-95 transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></> },
  { href: '/history', label: '히스토리', icon: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></> },
  { href: '/awards', label: '명예의 전당', icon: <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></> },
  { href: '/goals', label: '목표 설정', icon: <><path d="M12 13V2l8 4-8 4"/><path d="M20.55 10.23A9 9 0 1 1 8 4.94"/></> },
  { href: '/log', label: '기록 입력', icon: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></> },
  { href: '/data', label: '데이터', icon: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></> },
  { href: '/admin', label: '회원 관리', icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></> },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { members, records, runningLogs } = useData();

  const allMembers = members.map(m => ({
    ...m,
    total: getTotalDistance(records, m.id),
  }));
  const activeMembers = allMembers
    .filter(m => m.status === 'active')
    .sort((a, b) => b.total - a.total);
  const dormantMembers = allMembers
    .filter(m => m.status === 'dormant')
    .sort((a, b) => b.total - a.total);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="p-4">
      <div className="space-y-1 mb-4">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium transition-all
              ${isActive(item.href) ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-[var(--card-border)] pt-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] px-4 mb-3">
          멤버 ({activeMembers.length})
        </p>
      </div>

      <div className="space-y-0.5">
        {activeMembers.map((m: { id: string; name: string; total: number }, i: number) => {
          const badges = getMemberBadges(members, records, runningLogs, m.id);
          return (
            <Link
              key={m.id}
              href={`/member?name=${encodeURIComponent(m.name)}`}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] transition-all
                ${pathname === '/member' && new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('name') === m.name
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                  : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'
                }`}
            >
              <span className={`w-6 text-center text-xs font-mono ${i < 3 ? 'font-bold' : 'text-[var(--muted)]'}`}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
              </span>
              <span className="flex-1 truncate">{m.name}<Badges {...badges} compact /></span>
              <span className="text-xs font-mono text-[var(--muted)]">{m.total.toFixed(0)}km</span>
            </Link>
          );
        })}
      </div>

      {dormantMembers.length > 0 && (
        <>
          <div className="border-t border-[var(--card-border)] pt-4 mt-4 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] px-4 mb-3">
              휴면 ({dormantMembers.length})
            </p>
          </div>
          <div className="space-y-0.5 opacity-50">
            {dormantMembers.map((m: { id: string; name: string; total: number }) => (
              <Link
                key={m.id}
                href={`/member?name=${encodeURIComponent(m.name)}`}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] transition-all
                  ${pathname === '/member' && new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('name') === m.name
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                    : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'
                  }`}
              >
                <span className="w-6 text-center text-xs text-[var(--muted)]">💤</span>
                <span className="flex-1 truncate">{m.name}</span>
                <span className="text-xs font-mono text-[var(--muted)]">{m.total.toFixed(0)}km</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
