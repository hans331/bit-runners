'use client';

// 이번 주 "나를 쫓는 사람" + "따라잡기 타겟" — 경쟁 자극 위젯.
// 내 앞 3명 (따라잡기 대상) + 나 + 내 뒤 3명 (나를 쫓는 사람).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Zap } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getSupabase } from '@/lib/supabase';

interface Neighbor {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  region_gu: string | null;
  weekly_km: number;
  rank_position: number;
  is_me: boolean;
}

export default function RankNeighbors() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Neighbor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.rpc('weekly_rank_neighbors', {
          target_user_id: user.id,
          neighbor_count: 3,
        });
        if (!cancelled) {
          setRows((data ?? []) as Neighbor[]);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return <div className="mx-4 mt-4 h-[200px] rounded-3xl bg-[var(--card-border)]/30 animate-pulse" />;
  }

  if (rows.length <= 1) return null;

  const meIdx = rows.findIndex(r => r.is_me);
  const ahead = rows.slice(0, meIdx);
  const me = rows[meIdx];
  const behind = rows.slice(meIdx + 1);
  const target = ahead[ahead.length - 1]; // 바로 앞 러너
  const chaser = behind[0]; // 바로 뒤 러너

  const kmToTarget = target ? target.weekly_km - me.weekly_km : 0;
  const kmFromChaser = chaser ? me.weekly_km - chaser.weekly_km : 0;

  return (
    <div className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-sky-950/30 dark:via-zinc-900 dark:to-cyan-950/20 border border-sky-200/50 dark:border-sky-900/30 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={16} className="text-sky-500" />
        <h3 className="text-sm font-bold text-[var(--foreground)]">이번 주 내 주변 러너</h3>
        <span className="text-[10px] text-[var(--muted)] ml-auto">월요일 기준</span>
      </div>

      {/* 따라잡기 타겟 (바로 앞) */}
      {target && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <p className="text-xs font-semibold text-[var(--foreground)] flex-1">
            <span className="text-amber-600 font-extrabold">{kmToTarget.toFixed(1)}km</span> 더 달리면{' '}
            <span className="font-bold">{target.display_name}</span>님을 제칠 수 있어요!
          </p>
        </div>
      )}

      <div className="space-y-1">
        {rows.map(r => (
          <Link
            key={r.user_id}
            href={r.is_me ? '/profile' : `/social/user?id=${r.user_id}`}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
              r.is_me ? 'bg-gradient-to-r from-orange-100 to-pink-100 dark:from-orange-950/40 dark:to-pink-950/30 ring-2 ring-orange-300 dark:ring-orange-700' : ''
            }`}
          >
            <span className={`w-6 text-center text-xs font-bold ${r.rank_position <= 3 ? 'text-amber-500' : 'text-[var(--muted)]'}`}>
              {r.rank_position}
            </span>
            <div className="w-6 h-6 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
              {r.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[var(--muted)]">
                  {r.display_name.slice(0, 1)}
                </div>
              )}
            </div>
            <span className={`flex-1 text-xs truncate ${r.is_me ? 'font-extrabold text-orange-600' : 'font-medium text-[var(--foreground)]'}`}>
              {r.display_name}{r.is_me ? ' (나)' : ''}
            </span>
            <span className="text-xs text-[var(--muted)] font-semibold">
              {r.weekly_km.toFixed(1)}km
            </span>
          </Link>
        ))}
      </div>

      {/* 나를 쫓는 사람 */}
      {chaser && kmFromChaser >= 0 && (
        <div className="mt-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <p className="text-xs font-semibold text-[var(--foreground)] flex-1">
            <span className="font-bold">{chaser.display_name}</span>님이{' '}
            <span className="text-rose-600 font-extrabold">{kmFromChaser.toFixed(1)}km</span> 차이로 쫓고 있어요
          </p>
        </div>
      )}

      <Link
        href="/social?tab=friends"
        className="mt-3 flex items-center justify-center gap-0.5 text-xs font-semibold text-sky-600"
      >
        전체 랭킹 보기 <ChevronRight size={14} />
      </Link>
    </div>
  );
}
