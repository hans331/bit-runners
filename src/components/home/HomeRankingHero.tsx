'use client';

// 홈 히어로 — 컨셉 피벗(2026-04-21) 의 핵심 장치.
// {이름}님은 {세그먼트}에서 {N}등 + "오늘 {X}km 더 달리면 {N-1}위로 올라가요!" 진행형 메시지.
// 3종 시간축(오늘/이달/올해) 탭으로 전환. 350위 같은 큰 숫자는 RPC 단계에서 이미 필터됨.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Sparkles, ChevronRight, UserPlus, TrendingUp } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getSupabase } from '@/lib/supabase';

type TimeAxis = 'today' | 'month' | 'year';

interface HeroRank {
  scope_label: string;
  scope_type: string;
  rank_position: number;
  total_in_scope: number;
  my_km: number;
  km_to_next: number;
  target_rank: number;
  time_axis_out: TimeAxis;
}

const AXIS_OPTIONS: { id: TimeAxis; label: string; emoji: string }[] = [
  { id: 'today', label: '오늘', emoji: '🔥' },
  { id: 'month', label: '이달', emoji: '📅' },
  { id: 'year', label: '올해', emoji: '🏆' },
];

export default function HomeRankingHero() {
  const { user, profile } = useAuth();
  const [axis, setAxis] = useState<TimeAxis>('month');
  const [rank, setRank] = useState<HeroRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const supabase = getSupabase();
        const { data, error: rpcError } = await supabase.rpc('find_hero_rank', {
          target_user_id: user.id,
          time_axis: axis,
        });
        if (cancelled) return;
        if (rpcError) throw rpcError;
        const row = Array.isArray(data) ? data[0] : data;
        setRank(row ? (row as HeroRank) : null);
      } catch (e) {
        console.warn('[HomeRankingHero] 조회 실패', e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, axis]);

  if (loading) {
    return (
      <div className="mx-4 mt-3 rounded-3xl bg-gradient-to-br from-orange-100 via-pink-50 to-orange-50 dark:from-orange-950/30 dark:via-pink-950/20 dark:to-orange-950/10 border border-orange-100 dark:border-orange-900/30 p-5 h-[180px] animate-pulse" />
    );
  }

  const hasDemographics = !!(profile?.region_gu || profile?.birth_year || profile?.gender);

  // 프로필 인구통계 정보 없음 → 작성 유도 CTA
  if (!hasDemographics || error || !rank) {
    return (
      <Link
        href="/profile/edit"
        className="mx-4 mt-3 block rounded-3xl bg-gradient-to-br from-orange-100 via-pink-50 to-orange-50 dark:from-orange-950/30 dark:via-pink-950/20 dark:to-orange-950/10 border border-orange-200/50 dark:border-orange-900/30 p-5 active:scale-[0.99] transition shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 shadow-md flex items-center justify-center flex-shrink-0">
            <UserPlus size={24} className="text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[var(--foreground)] leading-tight">
              내 랭킹 보러가기 🏃‍♂️
            </p>
            <p className="text-xs text-[var(--muted)] mt-1 leading-5">
              지역·성별·출생년도를 입력하면<br/>비슷한 러너들 중 내 순위를 알려드려요
            </p>
          </div>
          <ChevronRight size={20} className="text-orange-500 flex-shrink-0" />
        </div>
      </Link>
    );
  }

  const isTop3 = rank.rank_position <= 3;
  const isTop10 = rank.rank_position <= 10;
  const name = profile?.display_name ?? '러너';
  const kmToNext = Math.max(0, Number(rank.km_to_next) || 0);
  const hasProgressHint = kmToNext > 0 && rank.rank_position > 1;

  // 타겟 랭크가 같으면 (1등이면) 유지 메시지
  const isTopRank = rank.rank_position === 1;

  return (
    <Link
      href={`/social?scope=${rank.scope_type}&axis=${axis}`}
      className="mx-4 mt-3 block rounded-3xl overflow-hidden bg-gradient-to-br from-orange-100 via-pink-50 to-orange-50 dark:from-orange-950/40 dark:via-pink-950/20 dark:to-orange-950/10 border border-orange-200/50 dark:border-orange-900/30 shadow-sm active:scale-[0.99] transition"
    >
      {/* 시간축 탭 */}
      <div
        role="tablist"
        className="flex gap-1 px-4 pt-4"
        onClick={(e) => e.preventDefault()}
      >
        {AXIS_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={(e) => { e.preventDefault(); setAxis(opt.id); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              axis === opt.id
                ? 'bg-white dark:bg-zinc-900 text-orange-600 shadow-sm'
                : 'text-[var(--muted)]'
            }`}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 pt-3">
        <div className="flex items-start gap-4">
          {/* 트로피 아이콘 */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
              isTop3
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : isTop10
                ? 'bg-gradient-to-br from-orange-400 to-pink-500'
                : 'bg-gradient-to-br from-orange-300 to-pink-400'
            }`}
          >
            {isTop3 ? (
              <Sparkles size={28} className="text-white drop-shadow" />
            ) : (
              <Trophy size={28} className="text-white drop-shadow" />
            )}
          </div>

          {/* 타이틀 + 순위 */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[var(--muted)] leading-tight">
              <span className="font-bold text-orange-600">{name}</span>님은{' '}
              <span className="font-semibold">{rank.scope_label}</span>에서
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-4xl font-extrabold ${
                  isTop3
                    ? 'text-amber-500'
                    : isTop10
                    ? 'text-orange-500'
                    : 'text-[var(--foreground)]'
                }`}
              >
                {rank.rank_position}
              </span>
              <span className="text-xl font-bold text-[var(--foreground)]">위</span>
              <span className="text-xs text-[var(--muted)] ml-1">
                / {rank.total_in_scope}명
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {axis === 'today' ? '오늘' : axis === 'month' ? '이달' : '올해'} {Number(rank.my_km).toFixed(1)}km
            </p>
          </div>
        </div>

        {/* 진행형 메시지 */}
        {isTopRank ? (
          <div className="mt-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur px-4 py-3">
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              👑 {axis === 'today' ? '오늘의' : axis === 'month' ? '이달의' : '올해의'} 1위! 계속 달려 자리를 지켜보세요.
            </p>
          </div>
        ) : hasProgressHint ? (
          <div className="mt-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur px-4 py-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">
              {axis === 'today' ? '오늘' : axis === 'month' ? '이달' : '올해'}{' '}
              <span className="text-orange-600 font-extrabold">{kmToNext.toFixed(1)}km</span> 더 달리면{' '}
              <span className="text-orange-600 font-extrabold">{rank.target_rank}위</span>로 올라가요!
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
