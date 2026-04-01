'use client';

import Link from 'next/link';
import { getLeaderboard } from '@/lib/data';

interface Props {
  year: number;
  month: number;
}

export default function GoalProgress({ year, month }: Props) {
  const leaderboard = getLeaderboard(year, month)
    .filter(e => e.goal > 0)
    .sort((a, b) => b.rate - a.rate);

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">
        {month}월 목표 달성률
      </h3>
      <div className="space-y-3">
        {leaderboard.map((entry) => {
          const rate = Math.min(entry.rate, 100);
          const isFinished = entry.distance >= entry.goal;

          return (
            <div key={entry.member.id}>
              <div className="flex items-center justify-between mb-1">
                <Link
                  href={`/member/${encodeURIComponent(entry.member.name)}`}
                  className="text-sm text-slate-300 hover:text-blue-400 transition-colors"
                >
                  {entry.member.name}
                </Link>
                <span className={`text-xs font-mono ${isFinished ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {entry.distance.toFixed(1)} / {entry.goal}km ({entry.rate.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isFinished
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      : rate >= 80
                        ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                        : 'bg-gradient-to-r from-blue-600 to-blue-400'
                  }`}
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
