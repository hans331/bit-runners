'use client';

import Link from 'next/link';
import { members, monthlyRecords, getLeaderboard } from '@/lib/data';

interface MonthAward {
  year: number;
  month: number;
  label: string;
  finishers: { name: string; distance: number; goal: number }[];
  longRunner: { name: string; distance: number } | null;
  finisherRate: number;
}

function computeAwards(): MonthAward[] {
  // 모든 월 수집 (달성 데이터가 있는 달만)
  const monthSet = new Set<string>();
  for (const r of monthlyRecords) {
    if (r.achieved_km > 0) monthSet.add(`${r.year}-${r.month}`);
  }

  const months = Array.from(monthSet)
    .map(key => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, month: m };
    })
    .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

  return months.map(({ year, month }) => {
    const leaderboard = getLeaderboard(year, month);
    const withGoal = leaderboard.filter(e => e.goal > 0);
    const finishers = withGoal
      .filter(e => e.distance >= e.goal)
      .map(e => ({ name: e.member.name, distance: e.distance, goal: e.goal }));
    const longRunner = leaderboard.length > 0
      ? { name: leaderboard[0].member.name, distance: leaderboard[0].distance }
      : null;
    const finisherRate = withGoal.length > 0
      ? (finishers.length / withGoal.length) * 100
      : 0;

    return {
      year,
      month,
      label: year === 2025 ? `2025년 ${month}월` : `2026년 ${month}월`,
      finishers,
      longRunner,
      finisherRate,
    };
  });
}

// 명예의 전당: 롱런상 수상 횟수
function getLongRunHallOfFame() {
  const awards = computeAwards();
  const counts: Record<string, number> = {};
  for (const a of awards) {
    if (a.longRunner) {
      counts[a.longRunner.name] = (counts[a.longRunner.name] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// 피니셔 달성 횟수
function getFinisherHallOfFame() {
  const awards = computeAwards();
  const counts: Record<string, number> = {};
  for (const a of awards) {
    for (const f of a.finishers) {
      counts[f.name] = (counts[f.name] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default function AwardsPage() {
  const awards = computeAwards();
  const longRunHof = getLongRunHallOfFame();
  const finisherHof = getFinisherHallOfFame();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <Link href="/" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
        ← 대시보드
      </Link>

      <h1 className="text-xl font-bold text-white">시상 & 명예의 전당</h1>

      {/* 명예의 전당 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 롱런상 명예의 전당 */}
        <div className="bg-gradient-to-br from-amber-600/10 to-amber-500/5 border border-amber-500/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-400 mb-4">🏆 롱런상 명예의 전당</h3>
          <p className="text-[10px] text-slate-500 mb-3">월간 최장 거리 1위 횟수</p>
          <div className="space-y-2">
            {longRunHof.map((entry, i) => (
              <Link
                key={entry.name}
                href={`/member/${encodeURIComponent(entry.name)}`}
                className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors"
              >
                <span className="w-6 text-center text-sm">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-slate-500 text-xs">{i + 1}</span>}
                </span>
                <span className="flex-1 text-sm text-slate-300">{entry.name}</span>
                <span className="text-sm font-mono text-amber-400">{entry.count}회</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 피니셔상 명예의 전당 */}
        <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-emerald-400 mb-4">✅ 피니셔 명예의 전당</h3>
          <p className="text-[10px] text-slate-500 mb-3">월 목표 달성 횟수</p>
          <div className="space-y-2">
            {finisherHof.map((entry, i) => (
              <Link
                key={entry.name}
                href={`/member/${encodeURIComponent(entry.name)}`}
                className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors"
              >
                <span className="w-6 text-center text-sm">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-slate-500 text-xs">{i + 1}</span>}
                </span>
                <span className="flex-1 text-sm text-slate-300">{entry.name}</span>
                <span className="text-sm font-mono text-emerald-400">{entry.count}회</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 월별 시상 타임라인 */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">월별 시상 내역</h3>
        <div className="space-y-6">
          {awards.map((award) => (
            <div key={`${award.year}-${award.month}`} className="border-l-2 border-blue-500/50 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">{award.label}</h4>
                <span className="text-xs text-slate-500">
                  피니셔율 {award.finisherRate.toFixed(0)}%
                </span>
              </div>

              <div className="space-y-2">
                {/* 롱런상 */}
                {award.longRunner && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">롱런상</span>
                    <Link
                      href={`/member/${encodeURIComponent(award.longRunner.name)}`}
                      className="text-sm text-slate-300 hover:text-blue-400"
                    >
                      {award.longRunner.name}
                    </Link>
                    <span className="text-xs text-slate-500 font-mono">{award.longRunner.distance.toFixed(1)}km</span>
                  </div>
                )}

                {/* 피니셔들 */}
                {award.finishers.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded whitespace-nowrap">피니셔</span>
                    <div className="flex flex-wrap gap-1">
                      {award.finishers.map(f => (
                        <Link
                          key={f.name}
                          href={`/member/${encodeURIComponent(f.name)}`}
                          className="text-xs text-slate-400 hover:text-blue-400 bg-slate-800 px-2 py-1 rounded"
                        >
                          {f.name} ({f.distance.toFixed(0)}/{f.goal}km)
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
