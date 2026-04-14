'use client';

import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { signOut } from '@/lib/auth';
import { getStreak, formatDuration, formatPace } from '@/lib/routinist-data';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Target, ShoppingBag, Coins, HelpCircle, Shield, BarChart3, Heart, Clock, Award, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { profile } = useAuth();
  const { activities } = useUserData();
  const router = useRouter();

  const totalKm = profile?.total_distance_km ?? 0;
  const totalRuns = profile?.total_runs ?? 0;
  const streak = getStreak(activities);
  const mileage = profile?.mileage_balance ?? 0;

  // 최근 3개 활동
  const recentActivities = activities.slice(0, 3);

  // 배지 계산
  const badges = [];
  if (totalKm >= 10) badges.push({ icon: '🏅', label: '10km 돌파' });
  if (totalKm >= 50) badges.push({ icon: '🎖️', label: '50km 돌파' });
  if (totalKm >= 100) badges.push({ icon: '🏆', label: '100km 돌파' });
  if (totalKm >= 500) badges.push({ icon: '💎', label: '500km 돌파' });
  if (totalKm >= 1000) badges.push({ icon: '👑', label: '1000km 돌파' });
  if (totalRuns >= 10) badges.push({ icon: '🔥', label: '10회 러닝' });
  if (totalRuns >= 50) badges.push({ icon: '⚡', label: '50회 러닝' });
  if (streak >= 7) badges.push({ icon: '💪', label: '7일 연속' });
  if (streak >= 30) badges.push({ icon: '🌟', label: '30일 연속' });

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const menuSections = [
    {
      title: '러닝',
      items: [
        { href: '/history', label: '전체 기록', Icon: Clock },
        { href: '/stats', label: '통계 & 차트', Icon: BarChart3 },
        { href: '/goals', label: '목표 설정', Icon: Target },
        { href: '/connect', label: '건강 앱 연동', Icon: Heart },
      ],
    },
    {
      title: '쇼핑 & 마일리지',
      items: [
        { href: '/shop', label: '쇼핑', Icon: ShoppingBag },
        { href: '/mileage', label: `마일리지 (${mileage.toLocaleString()}P)`, Icon: Coins },
      ],
    },
    {
      title: '기타',
      items: [
        { href: '/support', label: '고객 지원', Icon: HelpCircle },
        { href: '/privacy', label: '개인정보처리방침', Icon: Shield },
      ],
    },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
      {/* 프로필 카드 */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🏃🏻</div>
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
            className="text-sm text-[var(--accent)] font-semibold"
          >
            편집
          </Link>
        </div>

        {/* 통산 기록 */}
        <div className="grid grid-cols-3 gap-4 text-center mt-5 pt-5 border-t border-[var(--card-border)]">
          <div>
            <p className="text-2xl font-bold text-[var(--accent)]">{Number(totalKm).toFixed(1)}</p>
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

      {/* 배지 */}
      {badges.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-yellow-500" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">배지</h3>
            <span className="text-[10px] text-[var(--muted)]">{badges.length}개 획득</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => (
              <div key={b.label} className="flex items-center gap-1 bg-[var(--card-border)]/50 rounded-full px-3 py-1.5">
                <span className="text-sm">{b.icon}</span>
                <span className="text-[11px] font-medium text-[var(--foreground)]">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 활동 미니 */}
      {recentActivities.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--foreground)]">최근 활동</h3>
            <Link href="/history" className="text-xs text-[var(--accent)] font-semibold flex items-center gap-0.5">
              전체 보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentActivities.map(a => (
              <Link
                key={a.id}
                href={`/activity?id=${a.id}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--card-border)]/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{a.distance_km.toFixed(2)} km</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {new Date(a.activity_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    {a.pace_avg_sec_per_km ? ` · ${formatPace(a.pace_avg_sec_per_km)}/km` : ''}
                  </p>
                </div>
                <ChevronRight size={14} className="text-[var(--muted)]" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 메뉴 섹션 */}
      {menuSections.map(section => (
        <div key={section.title}>
          <p className="text-xs text-[var(--muted)] font-semibold px-1 mb-1.5">{section.title}</p>
          <div className="card divide-y divide-[var(--card-border)]">
            {section.items.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <item.Icon size={18} className="text-[var(--muted)]" />
                  <span className="text-sm text-[var(--foreground)]">{item.label}</span>
                </div>
                <ChevronRight size={16} className="text-[var(--muted)]" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* 로그아웃 */}
      <button
        onClick={handleSignOut}
        className="w-full card flex items-center justify-center gap-2 py-3.5 text-sm text-red-500"
      >
        <LogOut size={16} />
        로그아웃
      </button>

      <p className="text-center text-xs text-[var(--muted)]">Routinist v0.4.0</p>
    </div>
  );
}
