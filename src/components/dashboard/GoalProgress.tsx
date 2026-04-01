'use client';

import Link from 'next/link';
import { useData, getLeaderboard } from '@/components/DataProvider';

interface Props { year: number; month: number; }

export default function GoalProgress({ year, month }: Props) {
  const { members, records } = useData();
  const leaderboard = getLeaderboard(members, records, year, month).filter(e => e.goal > 0).sort((a, b) => b.rate - a.rate);

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">{month}월 목표 달성률</h3>
      <div className="space-y-3">
        {leaderboard.map(entry => {
          const rate = Math.min(entry.rate, 100);
          const isFinished = entry.distance >= entry.goal;
          return (
            <div key={entry.member.id}>
              <div className="flex items-center justify-between mb-1.5">
                <Link href={`/member/${encodeURIComponent(entry.member.name)}`} className="text-sm text-[var(--foreground)] hover:text-[var(--accent)] transition-colors font-medium">{entry.member.name}</Link>
                <span className={`text-xs font-mono ${isFinished ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-[var(--muted)]'}`}>{entry.distance.toFixed(1)} / {entry.goal}km</span>
              </div>
              <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${isFinished ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : rate >= 80 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'}`} style={{ width: `${rate}%` }} />
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold ${rate > 50 ? 'text-white' : 'text-[var(--muted)]'}`}>{entry.rate.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
