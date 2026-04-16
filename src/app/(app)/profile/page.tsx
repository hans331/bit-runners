'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { signOut } from '@/lib/auth';
import { getStreak, formatPace } from '@/lib/routinist-data';
import { fetchMyRegionalRanks, type MyRegionalRank } from '@/lib/social-data';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Target, HelpCircle, Shield, BarChart3, Heart, Award, LogOut, MapPin, Users, MessageCircle, ShoppingBag, Coins, Gift } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const { activities } = useUserData();
  const router = useRouter();

  const [regionalRanks, setRegionalRanks] = useState<MyRegionalRank[]>([]);

  const totalKm = profile?.total_distance_km ?? 0;
  const totalRuns = profile?.total_runs ?? 0;
  const streak = getStreak(activities);

  const now = new Date();

  // 지역 랭킹 로드
  const loadRanks = useCallback(async () => {
    if (!user) return;
    try {
      const ranks = await fetchMyRegionalRanks(user.id, now.getFullYear(), now.getMonth() + 1);
      setRegionalRanks(ranks);
    } catch {}
  }, [user]);

  useEffect(() => { loadRanks(); }, [loadRanks]);

  // 배지 계산
  const badges: { icon: string; label: string; gradient: string }[] = [];
  if (totalKm >= 10) badges.push({ icon: '🏅', label: '10km 돌파', gradient: 'from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30' });
  if (totalKm >= 50) badges.push({ icon: '🎖️', label: '50km 돌파', gradient: 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30' });
  if (totalKm >= 100) badges.push({ icon: '🏆', label: '100km 돌파', gradient: 'from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30' });
  if (totalKm >= 500) badges.push({ icon: '💎', label: '500km 돌파', gradient: 'from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30' });
  if (totalKm >= 1000) badges.push({ icon: '👑', label: '1000km 돌파', gradient: 'from-yellow-200 to-orange-200 dark:from-yellow-800/30 dark:to-orange-800/30' });
  if (totalRuns >= 10) badges.push({ icon: '🔥', label: '10회 러닝', gradient: 'from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30' });
  if (totalRuns >= 50) badges.push({ icon: '⚡', label: '50회 러닝', gradient: 'from-yellow-100 to-lime-100 dark:from-yellow-900/30 dark:to-lime-900/30' });
  if (streak >= 7) badges.push({ icon: '💪', label: '7일 연속', gradient: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30' });
  if (streak >= 30) badges.push({ icon: '🌟', label: '30일 연속', gradient: 'from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30' });

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const menuSections = [
    {
      title: '러닝',
      items: [
        { href: '/stats', label: '내 통계 & 차트', Icon: BarChart3 },
        { href: '/history', label: '클럽 히스토리', Icon: Users },
        { href: '/goals', label: '목표 설정', Icon: Target },
        { href: '/connect', label: '건강 앱 연동', Icon: Heart },
      ],
    },
    {
      title: '마일리지 & 쇼핑',
      items: [
        { href: '/mileage', label: '마일리지', Icon: Coins },
        { href: '/mileage/gift', label: '마일리지 선물', Icon: Gift },
        { href: '/shop', label: '쇼핑', Icon: ShoppingBag },
      ],
    },
    {
      title: '기타',
      items: [
        { href: '/social/messages', label: '쪽지함', Icon: MessageCircle },
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
          <Link href="/profile/edit" className="text-sm text-[var(--accent)] font-semibold">편집</Link>
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

      {/* ========== 지역 랭킹 (시/구/동 3단) ========== */}
      {regionalRanks.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-blue-500" />
            <h3 className="text-base font-semibold text-[var(--foreground)]">{now.getMonth() + 1}월 지역 랭킹</h3>
          </div>
          <div className="space-y-3">
            {regionalRanks.map(r => (
              <div key={r.level} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold w-6 text-center rounded py-0.5 ${
                    r.level === '동' ? 'bg-green-100 text-green-700' :
                    r.level === '구' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {r.level}
                  </span>
                  <span className="text-sm text-[var(--foreground)]">{r.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[var(--accent)]">
                    {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `${r.rank}위`}
                  </span>
                  <span className="text-xs text-[var(--muted)]">/ {r.total}명</span>
                </div>
              </div>
            ))}
          </div>
          {!profile?.region_gu && (
            <Link href="/profile/edit" className="text-sm text-[var(--accent)] font-semibold mt-3 inline-block">
              지역을 설정하면 랭킹에 참여할 수 있어요 →
            </Link>
          )}
        </div>
      )}

      {regionalRanks.length === 0 && (
        <div className="card p-5 text-center space-y-2">
          <p className="text-3xl">📍</p>
          <h3 className="text-base font-semibold text-[var(--foreground)]">지역 랭킹</h3>
          <p className="text-xs text-[var(--muted)]">프로필에서 지역을 설정하면 시/구/동 단위 랭킹을 볼 수 있어요</p>
          <Link href="/profile/edit" className="text-sm text-[var(--accent)] font-semibold inline-block">
            지역 설정하기 →
          </Link>
        </div>
      )}

      {/* 배지 */}
      {badges.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-yellow-500" />
            <h3 className="text-base font-semibold text-[var(--foreground)]">배지</h3>
            <span className="text-xs text-[var(--muted)]">{badges.length}개 획득</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => (
              <div key={b.label} className={`flex items-center gap-1.5 bg-gradient-to-r ${b.gradient} rounded-full px-3.5 py-2 shadow-sm`}>
                <span className="text-base">{b.icon}</span>
                <span className="text-sm font-semibold text-[var(--foreground)]">{b.label}</span>
              </div>
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

      <p className="text-center text-xs text-[var(--muted)]">Routinist v1.0.0</p>
    </div>
  );
}
