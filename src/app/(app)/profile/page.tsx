'use client';

import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { signOut } from '@/lib/auth';
import { getStreak } from '@/lib/routinist-data';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight, HelpCircle, Shield, Heart, Award, LogOut, MapPin,
  MessageCircle, Coins, Gift, Sun, Moon, Monitor,
} from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import { useTheme } from '@/components/ThemeProvider';

export default function ProfilePage() {
  const { profile } = useAuth();
  const { activities } = useUserData();
  const router = useRouter();

  const totalKm = Number(profile?.total_distance_km ?? 0);
  const totalRuns = profile?.total_runs ?? 0;
  const streak = getStreak(activities);

  // 배지 계산 — 누적 거리/횟수 기반 성취
  const badges: { icon: string; label: string; gradient: string }[] = [];
  if (totalKm >= 10) badges.push({ icon: '🏅', label: '10km', gradient: 'from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30' });
  if (totalKm >= 50) badges.push({ icon: '🎖️', label: '50km', gradient: 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30' });
  if (totalKm >= 100) badges.push({ icon: '🏆', label: '100km', gradient: 'from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30' });
  if (totalKm >= 500) badges.push({ icon: '💎', label: '500km', gradient: 'from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30' });
  if (totalKm >= 1000) badges.push({ icon: '👑', label: '1000km', gradient: 'from-yellow-200 to-orange-200 dark:from-yellow-800/30 dark:to-orange-800/30' });
  if (totalRuns >= 10) badges.push({ icon: '🔥', label: '10회', gradient: 'from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30' });
  if (totalRuns >= 50) badges.push({ icon: '⚡', label: '50회', gradient: 'from-yellow-100 to-lime-100 dark:from-yellow-900/30 dark:to-lime-900/30' });
  if (streak >= 7) badges.push({ icon: '💪', label: '7일 연속', gradient: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30' });
  if (streak >= 30) badges.push({ icon: '🌟', label: '30일 연속', gradient: 'from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30' });

  const { mode, setMode } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  // 액션 그리드 2×2 — 자주 쓰는 기능만
  const actions: { href: string; label: string; Icon: typeof Heart; color: string }[] = [
    { href: '/connect', label: '건강 앱 연동', Icon: Heart, color: 'text-red-500' },
    { href: '/messages', label: '쪽지함', Icon: MessageCircle, color: 'text-blue-500' },
    { href: '/mileage', label: '마일리지 내역', Icon: Coins, color: 'text-amber-500' },
    { href: '/mileage/gift', label: '마일리지 선물', Icon: Gift, color: 'text-pink-500' },
  ];

  const settings: { href: string; label: string; Icon: typeof HelpCircle }[] = [
    { href: '/support', label: '고객 지원', Icon: HelpCircle },
    { href: '/privacy', label: '개인정보처리방침', Icon: Shield },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
      {/* 프로필 카드 */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><AppLogo size={36} /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-[var(--foreground)] truncate">{profile?.display_name}</h2>
            {profile?.region_gu ? (
              <p className="text-xs text-[var(--muted)] flex items-center gap-1">
                <MapPin size={12} /> {profile.region_si} {profile.region_gu} {profile.region_dong || ''}
              </p>
            ) : profile?.bio ? (
              <p className="text-xs text-[var(--muted)] truncate">{profile.bio}</p>
            ) : (
              <p className="text-xs text-[var(--muted)]">러너</p>
            )}
          </div>
          <Link
            href="/profile/edit"
            className="text-sm text-[var(--accent)] font-semibold px-3 py-2 -mr-1 rounded-lg active:bg-[var(--card-border)]/50 transition-colors"
          >
            편집
          </Link>
        </div>

        {/* 통산 3칩 */}
        <div className="grid grid-cols-3 gap-4 text-center mt-5 pt-5 border-t border-[var(--card-border)]">
          <div>
            <p className="text-2xl font-bold text-[var(--accent)]">{totalKm.toFixed(1)}</p>
            <p className="text-xs text-[var(--muted)]">총 km</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{totalRuns}</p>
            <p className="text-xs text-[var(--muted)]">총 러닝</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{streak}</p>
            <p className="text-xs text-[var(--muted)]">연속일 🔥</p>
          </div>
        </div>
      </div>

      {/* 배지 — 가로 스크롤로 공간 절약 */}
      {badges.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-yellow-500" />
            <h3 className="text-base font-semibold text-[var(--foreground)]">배지</h3>
            <span className="text-xs text-[var(--muted)]">{badges.length}개</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {badges.map(b => (
              <div
                key={b.label}
                className={`flex items-center gap-1.5 bg-gradient-to-r ${b.gradient} rounded-full px-3.5 py-2 shadow-sm flex-shrink-0`}
              >
                <span className="text-base">{b.icon}</span>
                <span className="text-sm font-semibold text-[var(--foreground)] whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 그리드 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="card p-4 flex flex-col items-start gap-2 active:scale-[0.98] transition-transform"
          >
            <a.Icon size={24} className={a.color} />
            <span className="text-sm font-semibold text-[var(--foreground)]">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* 설정 카드 */}
      <div className="card divide-y divide-[var(--card-border)]">
        {settings.map(s => (
          <Link key={s.href} href={s.href} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <s.Icon size={18} className="text-[var(--muted)]" />
              <span className="text-sm text-[var(--foreground)]">{s.label}</span>
            </div>
            <ChevronRight size={16} className="text-[var(--muted)]" />
          </Link>
        ))}

        {/* 화면 모드 */}
        <div className="px-4 py-4">
          <p className="text-xs text-[var(--muted)] font-semibold mb-2.5">화면 모드</p>
          <div className="flex gap-2">
            {([
              { id: 'light' as const, label: '라이트', Icon: Sun },
              { id: 'dark' as const, label: '다크', Icon: Moon },
              { id: 'system' as const, label: '시스템', Icon: Monitor },
            ]).map(opt => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === opt.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--card-border)]/30 text-[var(--muted)]'
                }`}
              >
                <opt.Icon size={14} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm text-red-500 font-semibold"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>

      <p className="text-center text-xs text-[var(--muted)]">Routinist v1.0.0</p>
    </div>
  );
}
