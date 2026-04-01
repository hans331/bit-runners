'use client';

import Link from 'next/link';
import { monthlyRecords, getLeaderboard } from '@/lib/data';

function computeAwards() {
  const monthSet = new Set<string>();
  for (const r of monthlyRecords) {
    if (r.achieved_km > 0) monthSet.add(`${r.year}-${r.month}`);
  }
  return Array.from(monthSet)
    .map(key => {
      const [y, m] = key.split('-').map(Number);
      const leaderboard = getLeaderboard(y, m);
      const withGoal = leaderboard.filter(e => e.goal > 0);
      const finishers = withGoal.filter(e => e.distance >= e.goal).map(e => ({ name: e.member.name, distance: e.distance, goal: e.goal }));
      const longRunner = leaderboard.length > 0 ? { name: leaderboard[0].member.name, distance: leaderboard[0].distance } : null;
      const finisherRate = withGoal.length > 0 ? (finishers.length / withGoal.length) * 100 : 0;
      return { year: y, month: m, label: y === 2025 ? `2025년 ${m}월` : `2026년 ${m}월`, finishers, longRunner, finisherRate };
    })
    .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
}

function getHallOfFame(type: 'longRun' | 'finisher') {
  const awards = computeAwards();
  const counts: Record<string, number> = {};
  for (const a of awards) {
    if (type === 'longRun' && a.longRunner) {
      counts[a.longRunner.name] = (counts[a.longRunner.name] || 0) + 1;
    }
    if (type === 'finisher') {
      for (const f of a.finishers) counts[f.name] = (counts[f.name] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export default function AwardsPage() {
  const awards = computeAwards();
  const longRunHof = getHallOfFame('longRun');
  const finisherHof = getHallOfFame('finisher');

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5 md:space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        대시보드
      </Link>

      <h1 className="text-xl font-bold text-[var(--foreground)]">시상 & 명예의 전당</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <div className="card bg-gradient-to-br from-amber-500/10 to-amber-500/5 !border-amber-200 dark:!border-amber-500/20">
          <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">🏆 롱런상 명예의 전당</h3>
          <p className="text-[10px] text-[var(--muted)] mb-3">월간 최장 거리 1위</p>
          <div className="space-y-1">
            {longRunHof.map((entry, i) => (
              <Link key={entry.name} href={`/member/${encodeURIComponent(entry.name)}`}
                className="flex items-center gap-2 py-2 px-2 rounded-xl hover:bg-amber-500/10 transition-colors">
                <span className="w-5 text-center text-xs">{i < 3 ? ['🥇','🥈','🥉'][i] : <span className="text-[var(--muted)] font-mono text-[10px]">{i+1}</span>}</span>
                <span className="flex-1 text-sm text-[var(--foreground)] font-medium">{entry.name}</span>
                <span className="text-sm font-mono font-semibold text-amber-600 dark:text-amber-400">{entry.count}회</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 !border-emerald-200 dark:!border-emerald-500/20">
          <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1">✅ 피니셔 명예의 전당</h3>
          <p className="text-[10px] text-[var(--muted)] mb-3">목표 달성 횟수</p>
          <div className="space-y-1">
            {finisherHof.map((entry, i) => (
              <Link key={entry.name} href={`/member/${encodeURIComponent(entry.name)}`}
                className="flex items-center gap-2 py-2 px-2 rounded-xl hover:bg-emerald-500/10 transition-colors">
                <span className="w-5 text-center text-xs">{i < 3 ? ['🥇','🥈','🥉'][i] : <span className="text-[var(--muted)] font-mono text-[10px]">{i+1}</span>}</span>
                <span className="flex-1 text-sm text-[var(--foreground)] font-medium">{entry.name}</span>
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">{entry.count}회</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-5">월별 시상 내역</h3>
        <div className="space-y-5">
          {awards.map((award) => (
            <div key={`${award.year}-${award.month}`} className="border-l-3 border-[var(--accent)] pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-[var(--foreground)]">{award.label}</h4>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  award.finisherRate >= 70 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  award.finisherRate >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                  'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                  피니셔율 {award.finisherRate.toFixed(0)}%
                </span>
              </div>
              <div className="space-y-2">
                {award.longRunner && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">롱런상</span>
                    <Link href={`/member/${encodeURIComponent(award.longRunner.name)}`} className="text-sm text-[var(--foreground)] hover:text-[var(--accent)] font-medium">{award.longRunner.name}</Link>
                    <span className="text-xs text-[var(--muted)] font-mono">{award.longRunner.distance.toFixed(1)}km</span>
                  </div>
                )}
                {award.finishers.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">피니셔</span>
                    <div className="flex flex-wrap gap-1">
                      {award.finishers.map(f => (
                        <Link key={f.name} href={`/member/${encodeURIComponent(f.name)}`}
                          className="text-[11px] text-[var(--foreground)] hover:text-[var(--accent)] bg-[var(--card-border)] px-2 py-1 rounded-lg transition-colors">
                          {f.name} <span className="text-[var(--muted)]">{f.distance.toFixed(0)}/{f.goal}</span>
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
