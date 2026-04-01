'use client';

import Link from 'next/link';
import { getAllTimeLeaderboard } from '@/lib/data';

export default function AllTimeRanking() {
  const ranking = getAllTimeLeaderboard();

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">통산 누적 거리 랭킹</h3>
      <div className="space-y-2">
        {ranking.map((entry, i) => (
          <Link
            key={entry.member.id}
            href={`/member/${encodeURIComponent(entry.member.name)}`}
            className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-700/50 transition-colors group"
          >
            <span className="w-6 text-center text-sm">
              {i < 3 ? medals[i] : <span className="text-slate-500 text-xs font-mono">{i + 1}</span>}
            </span>
            <span className="flex-1 text-sm text-slate-300 group-hover:text-white transition-colors">
              {entry.member.name}
            </span>
            <span className="text-sm font-mono text-slate-400">
              {entry.totalDistance.toFixed(0)}km
            </span>
            <span className="text-[10px] text-slate-600">
              {entry.months}개월
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
