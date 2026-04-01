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
    <header className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 모바일 햄버거 */}
          <button
            onClick={onMobileMenu}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--card-border)] transition-colors text-[var(--muted)]"
            aria-label="메뉴"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          {/* PC 사이드바 토글 */}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-[var(--card-border)] transition-colors text-[var(--muted)]"
            aria-label="사이드바 토글"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              )}
            </svg>
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🏃🏻</span>
            <div className="leading-none">
              <h1 className="text-base font-bold text-[var(--foreground)]">BIT Runners</h1>
              <p className="text-[9px] text-[var(--muted)] tracking-[0.15em] mt-0.5">BOOST · IMPACT · TOGETHER</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 다크모드 토글 */}
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--card-border)] transition-colors text-[var(--muted)]"
            aria-label="테마 전환"
          >
            {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>

          {/* 기록 입력 */}
          <Link
            href="/log"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 rounded-xl transition-all shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="hidden sm:inline">기록</span>
          </Link>
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
              <div className={`hidden lg:block transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
                <div className="w-64 h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto bg-[var(--sidebar-bg)] border-r border-[var(--card-border)]">
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 left-0 bottom-0 w-72 bg-[var(--background)] border-r border-[var(--card-border)] overflow-y-auto animate-slide-in">
        <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
          <h2 className="text-sm font-bold text-[var(--foreground)]">메뉴</h2>
          <button onClick={onClose} className="text-[var(--muted)] p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

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
    <div className="p-3">
      <Link
        href="/"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5
          ${isActive('/') ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
        대시보드
      </Link>

      <Link
        href="/history"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5
          ${isActive('/history') ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        히스토리
      </Link>

      <Link
        href="/awards"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-3
          ${isActive('/awards') ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
        </svg>
        시상
      </Link>

      <Link
        href="/data"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5
          ${isActive('/data') ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
        </svg>
        데이터
      </Link>

      <Link
        href="/goals"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5
          ${isActive('/goals') ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 13V2l8 4-8 4"/><path d="M20.55 10.23A9 9 0 1 1 8 4.94"/>
        </svg>
        목표 설정
      </Link>

      <Link
        href="/admin"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-3
          ${isActive('/admin') ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
        회원 관리
      </Link>

      <div className="border-t border-[var(--card-border)] pt-3 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] px-3 mb-2">
          개인 기록
        </p>
      </div>

      <div className="space-y-0.5">
        {activeMembers.map((m: { id: string; name: string; total: number }, i: number) => {
          const badges = getMemberBadges(members, records, runningLogs, m.id);
          return (
            <Link
              key={m.id}
              href={`/member/${encodeURIComponent(m.name)}`}
              onClick={onNavigate}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all group
                ${isActive(`/member/${encodeURIComponent(m.name)}`)
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                  : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'
                }`}
            >
              <span className={`w-5 text-center text-[10px] font-mono ${i < 3 ? 'font-bold text-[var(--accent-yellow)]' : 'text-[var(--muted)]'}`}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
              </span>
              <span className="flex-1 truncate">{m.name}<Badges {...badges} compact /></span>
              <span className="text-[10px] font-mono text-[var(--muted)]">{m.total.toFixed(0)}km</span>
            </Link>
          );
        })}
      </div>

      {dormantMembers.length > 0 && (
        <>
          <div className="border-t border-[var(--card-border)] pt-3 mt-3 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] px-3 mb-2">
              휴면 ({dormantMembers.length})
            </p>
          </div>
          <div className="space-y-0.5 opacity-50">
            {dormantMembers.map((m: { id: string; name: string; total: number }) => (
              <Link
                key={m.id}
                href={`/member/${encodeURIComponent(m.name)}`}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all group
                  ${isActive(`/member/${encodeURIComponent(m.name)}`)
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                    : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'
                  }`}
              >
                <span className="w-5 text-center text-[10px] text-[var(--muted)]">💤</span>
                <span className="flex-1 truncate">{m.name}</span>
                <span className="text-[10px] font-mono text-[var(--muted)]">{m.total.toFixed(0)}km</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
