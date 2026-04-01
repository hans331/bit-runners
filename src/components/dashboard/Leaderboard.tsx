'use client';

import Link from 'next/link';
import { useData, getLeaderboard } from '@/components/DataProvider';

interface Props { year: number; month: number; }

export default function Leaderboard({ year, month }: Props) {
  const { members, records } = useData();
  const leaderboard = getLeaderboard(members, records, year, month);
  const maxDistance = leaderboard.length > 0 ? leaderboard[0].distance : 1;

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">{month}월 거리 순위</h3>
      <div className="space-y-2">
        {leaderboard.map((entry, i) => {
          const barWidth = maxDistance > 0 ? (entry.distance / maxDistance) * 100 : 0;
          const isFinisher = entry.goal > 0 && entry.distance >= entry.goal;
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={entry.member.id}>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="w-6 text-center text-xs">{i < 3 ? medals[i] : <span className="text-[var(--muted)] font-mono">{i + 1}</span>}</span>
                <Link href={`/member/${encodeURIComponent(entry.member.name)}`} className="w-14 md:w-16 text-sm text-[var(--foreground)] hover:text-[var(--accent)] transition-colors truncate font-medium">{entry.member.name}</Link>
                <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2 ${isFinisher ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-600 dark:to-emerald-400' : 'bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-400'}`} style={{ width: `${Math.max(barWidth, 8)}%` }}>
                    {barWidth > 25 && <span className="text-[10px] font-bold text-white">{entry.distance.toFixed(1)}km</span>}
                  </div>
                  {entry.goal > 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500 dark:bg-amber-400" style={{ left: `${Math.min((entry.goal / maxDistance) * 100, 100)}%` }} />}
                </div>
                {barWidth <= 25 && <span className="w-16 text-right text-xs font-mono text-[var(--muted)]">{entry.distance.toFixed(1)}km</span>}
                {isFinisher && <span className="text-emerald-500 text-xs font-bold">✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--card-border)] text-[10px] text-[var(--muted)]">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-500" /> 달성</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-500" /> 진행중</span>
        <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-amber-500" /> 목표</span>
      </div>
    </div>
  );
}
