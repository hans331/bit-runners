'use client';

import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { signOut } from '@/lib/auth';
import { getStreak } from '@/lib/routinist-data';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Target, ShoppingBag, Coins, HelpCircle, Shield, BarChart3, Heart } from 'lucide-react';

export default function ProfilePage() {
  const { profile } = useAuth();
  const { activities } = useUserData();
  const router = useRouter();

  const totalKm = profile?.total_distance_km ?? 0;
  const totalRuns = profile?.total_runs ?? 0;
  const streak = getStreak(activities);
  const mileage = profile?.mileage_balance ?? 0;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const menuItems = [
    { href: '/stats', label: '러닝 통계', Icon: BarChart3 },
    { href: '/goals', label: '목표 설정', Icon: Target },
    { href: '/connect', label: '건강 앱 연동', Icon: Heart },
    { href: '/shop', label: '쇼핑', Icon: ShoppingBag },
    { href: '/mileage', label: `마일리지 (${mileage.toLocaleString()}P)`, Icon: Coins },
    { href: '/support', label: '고객 지원', Icon: HelpCircle },
    { href: '/privacy', label: '개인정보처리방침', Icon: Shield },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* 프로필 카드 */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              🏃🏻
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-[var(--foreground)] truncate">{profile?.display_name}</h2>
          {profile?.bio ? (
            <p className="text-sm text-[var(--muted)] truncate">{profile.bio}</p>
          ) : (
            <p className="text-sm text-[var(--muted)]">러너</p>
          )}
        </div>
        <Link
          href="/profile/edit"
          className="text-sm text-[var(--accent)] font-medium"
        >
          편집
        </Link>
      </div>

      {/* 통산 기록 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">통산 기록</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{Number(totalKm).toFixed(1)}</p>
            <p className="text-xs text-[var(--muted)]">총 km</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{totalRuns}</p>
            <p className="text-xs text-[var(--muted)]">총 러닝</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{streak}</p>
            <p className="text-xs text-[var(--muted)]">연속일</p>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="card divide-y divide-[var(--card-border)]">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <item.Icon size={18} className="text-[var(--muted)]" />
              <span className="text-sm text-[var(--foreground)]">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-[var(--muted)]" />
          </Link>
        ))}
      </div>

      {/* 로그아웃 */}
      <button
        onClick={handleSignOut}
        className="w-full text-center text-sm text-red-500 py-3"
      >
        로그아웃
      </button>

      <p className="text-center text-xs text-[var(--muted)]">Routinist v0.3.0</p>
    </div>
  );
}
