'use client';

import Link from 'next/link';
import { useData, getLeaderboard } from '@/components/DataProvider';

interface Props { year: number; month: number; }

export default function Leaderboard({ year, month }: Props) {
  const { members, records } = useData();
  const leaderboard = getLeaderboard(members, records, year, month);
  const maxDistance = leaderboard.length > 0 ? leaderboard[0].distance : 1;

  if (leaderboard.length === 0) {
    return (
      <div className="card">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-5">{month}월 거리 순위</h3>
        <p className="text-base text-[var(--muted)] py-8 text-center">아직 기록이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-base font-bold text-[var(--foreground)] mb-5">{month}월 거리 순위</h3>
      <div className="space-y-2.5">
        {leaderboard.map((entry, i) => {
          const barWidth = maxDistance > 0 ? (entry.distance / maxDistance) * 100 : 0;
          const isFinisher = entry.goal > 0 && entry.distance >= entry.goal && !entry.isFallback;
          const isDormant = entry.member.status === 'dormant';
          const medals = ['🥇', '🥈', '🥉'];

          return (
            <div key={entry.member.id} className={entry.isFallback && entry.distance === 0 ? 'opacity-30' : ''}>
              <div className="flex items-center gap-2.5">
                <span className="w-7 text-center text-sm">{i < 3 && entry.distance > 0 ? medals[i] : <span className="text-[var(--muted)] font-mono text-sm">{i + 1}</span>}</span>
                <Link href={`/member/${encodeURIComponent(entry.member.name)}`}
                  className={`w-16 text-sm font-semibold hover:text-[var(--accent)] transition-colors truncate ${isDormant ? 'text-[var(--muted)] opacity-50' : 'text-[var(--foreground)]'}`}>
                  {isDormant && '💤'}{entry.member.name}
                </Link>
                <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden relative">
                  {entry.distance > 0 && (
                    <div className={`h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2.5 ${
                      isFinisher ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-600 dark:to-emerald-400' :
                      'bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-400'
                    }`} style={{ width: `${Math.max(barWidth, 8)}%` }}>
                      {barWidth > 25 && <span className="text-sm font-bold text-white">{entry.distance.toFixed(1)}km</span>}
                    </div>
                  )}
                  {entry.goal > 0 && (
                    <div className={`absolute top-0 bottom-0 w-0.5 ${entry.isFallback ? 'bg-slate-300 dark:bg-slate-600' : 'bg-amber-500 dark:bg-amber-400'}`}
                      style={{ left: `${Math.min((entry.goal / Math.max(maxDistance, entry.goal)) * 100, 100)}%` }} />
                  )}
                </div>
                <span className="w-20 text-right text-sm font-mono text-[var(--muted)]">
                  {entry.distance > 0 ? `${entry.distance.toFixed(1)}km` : '-'}
                </span>
                {isFinisher && <span className="text-emerald-500 text-sm font-bold">✓</span>}
              </div>
              {entry.isFallback && (
                <span className="ml-10 text-sm text-[var(--muted)]">목표 {entry.goal}km (전월)</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[var(--card-border)] text-sm text-[var(--muted)]">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-2.5 rounded-sm bg-emerald-500" /> 달성</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-2.5 rounded-sm bg-blue-500" /> 진행중</span>
        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3.5 bg-amber-500" /> 목표</span>
        <span className="flex items-center gap-1.5 opacity-40"><span className="w-0.5 h-3.5 bg-slate-400" /> 전월</span>
      </div>
    </div>
  );
}
