'use client';

import Link from 'next/link';
import { useData, getGoalWithFallback } from '@/components/DataProvider';

interface Props { year: number; month: number; }

export default function GoalProgress({ year, month }: Props) {
  const { members, records } = useData();

  const data = members
    .map(m => {
      const record = records.find(r => r.member_id === m.id && r.year === year && r.month === month);
      const distance = record?.achieved_km ?? 0;
      const { goal, isFallback } = getGoalWithFallback(records, m.id, year, month);
      const rate = goal > 0 ? (distance / goal) * 100 : 0;
      return { member: m, distance, goal, rate, isFallback };
    })
    .filter(e => e.goal > 0 || e.distance > 0)
    .sort((a, b) => b.rate - a.rate);

  return (
    <div className="card">
      <h3 className="text-base font-bold text-[var(--foreground)] mb-5">{month}월 목표 달성률</h3>
      <div className="space-y-4">
        {data.map(entry => {
          const rate = Math.min(entry.rate, 100);
          const isFinished = entry.goal > 0 && entry.distance >= entry.goal && !entry.isFallback;
          const isDormant = entry.member.status === 'dormant';

          return (
            <div key={entry.member.id} className={entry.isFallback ? 'opacity-40' : ''}>
              <div className="flex items-center justify-between mb-2">
                <Link href={`/member/${encodeURIComponent(entry.member.name)}`}
                  className={`text-sm font-semibold hover:text-[var(--accent)] transition-colors ${isDormant ? 'text-[var(--muted)]' : 'text-[var(--foreground)]'}`}>
                  {isDormant && '💤'}{entry.member.name}
                </Link>
                <span className={`text-sm font-mono ${isFinished ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-[var(--muted)]'}`}>
                  {entry.distance.toFixed(1)} / {entry.goal}km
                  {entry.isFallback && <span className="ml-1 text-sm">(전월)</span>}
                </span>
              </div>
              <div className="relative h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${
                  entry.isFallback ? 'bg-slate-300 dark:bg-slate-600' :
                  isFinished ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                  rate >= 80 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                  'bg-gradient-to-r from-blue-400 to-blue-500'
                }`} style={{ width: `${rate}%` }} />
                <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-sm font-bold ${rate > 50 ? 'text-white' : 'text-[var(--muted)]'}`}>{entry.rate.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[var(--card-border)] text-sm text-[var(--muted)]">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-2.5 rounded bg-emerald-500" /> 달성</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-2.5 rounded bg-blue-500" /> 진행중</span>
        <span className="flex items-center gap-1.5 opacity-40"><span className="w-3.5 h-2.5 rounded bg-slate-400" /> 전월 목표</span>
      </div>
    </div>
  );
}
