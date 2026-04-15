'use client';

import Link from 'next/link';
import { useData, getAllTimeLeaderboard } from '@/components/DataProvider';

export default function AllTimeRanking() {
  const { members, records } = useData();
  const ranking = getAllTimeLeaderboard(members, records);
  const maxDist = ranking.length > 0 ? ranking[0].totalDistance : 1;

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">통산 누적 랭킹</h3>
      <div className="space-y-1.5">
        {ranking.map((entry, i) => (
          <Link key={entry.member.id} href={`/member/${encodeURIComponent(entry.member.name)}`}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-[var(--card-border)] transition-colors group ${entry.member.status === 'dormant' ? 'opacity-40' : ''}`}>
            <span className="w-5 text-center text-sm">{i < 3 ? ['🥇','🥈','🥉'][i] : <span className="text-[var(--muted)] font-mono text-sm">{i+1}</span>}</span>
            <span className="w-14 text-sm text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors truncate font-medium">
              {entry.member.status === 'dormant' && '💤'}{entry.member.name}
            </span>
            <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-400" style={{ width: `${(entry.totalDistance/maxDist)*100}%` }} />
            </div>
            <span className="text-sm font-mono text-[var(--muted)] w-14 text-right">{entry.totalDistance.toFixed(0)}km</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
