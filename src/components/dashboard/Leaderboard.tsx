'use client';

import Link from 'next/link';
import { getLeaderboard } from '@/lib/data';

interface Props {
  year: number;
  month: number;
  title?: string;
}

export default function Leaderboard({ year, month, title }: Props) {
  const leaderboard = getLeaderboard(year, month);
  const maxDistance = leaderboard.length > 0 ? leaderboard[0].distance : 1;

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">
        {title || `${month}월 거리 순위`}
      </h3>
      <div className="space-y-2">
        {leaderboard.map((entry, i) => {
          const barWidth = maxDistance > 0 ? (entry.distance / maxDistance) * 100 : 0;
          const isFinisher = entry.goal > 0 && entry.distance >= entry.goal;

          return (
            <div key={entry.member.id} className="group">
              <div className="flex items-center gap-3">
                <span className={`w-6 text-right text-xs font-mono ${
                  i === 0 ? 'text-amber-400 font-bold' :
                  i === 1 ? 'text-slate-300 font-bold' :
                  i === 2 ? 'text-orange-400 font-bold' :
                  'text-slate-500'
                }`}>
                  {i + 1}
                </span>
                <Link
                  href={`/member/${encodeURIComponent(entry.member.name)}`}
                  className="w-16 text-sm text-slate-200 hover:text-blue-400 transition-colors truncate"
                >
                  {entry.member.name}
                </Link>
                <div className="flex-1 h-6 bg-slate-700/50 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFinisher
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        : 'bg-gradient-to-r from-blue-600 to-blue-400'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                  {entry.goal > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400/70"
                      style={{ left: `${Math.min((entry.goal / maxDistance) * 100, 100)}%` }}
                      title={`목표: ${entry.goal}km`}
                    />
                  )}
                </div>
                <span className="w-20 text-right text-sm font-mono text-slate-300">
                  {entry.distance.toFixed(1)}km
                </span>
                {isFinisher && (
                  <span className="text-emerald-400 text-xs" title="목표 달성!">✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 bg-emerald-500 rounded-sm inline-block" /> 목표 달성
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 bg-blue-500 rounded-sm inline-block" /> 진행 중
        </span>
        <span className="flex items-center gap-1">
          <span className="w-0.5 h-3 bg-amber-400 inline-block" /> 목표선
        </span>
      </div>
    </div>
  );
}
