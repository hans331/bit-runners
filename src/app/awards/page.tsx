'use client';

import Link from 'next/link';
import { useData, getLeaderboard, getAttendanceWinner } from '@/components/DataProvider';

export default function AwardsPage() {
  const { members, records, runningLogs, loading } = useData();
  if (loading) return <div className="max-w-5xl mx-auto px-6 py-6"><div className="card animate-pulse h-96" /></div>;

  const monthSet = new Set<string>();
  for (const r of records) { if (r.achieved_km > 0) monthSet.add(`${r.year}-${r.month}`); }
  const awards = Array.from(monthSet).map(key => {
    const [y, m] = key.split('-').map(Number);
    const lb = getLeaderboard(members, records, y, m);
    const withGoal = lb.filter(e => e.goal > 0);
    const finishers = withGoal.filter(e => e.distance >= e.goal).map(e => ({ name: e.member.name, distance: e.distance, goal: e.goal }));
    const longRunner = lb.length > 0 ? { name: lb[0].member.name, distance: lb[0].distance } : null;
    const finisherRate = withGoal.length > 0 ? (finishers.length / withGoal.length) * 100 : 0;
    const attendance = getAttendanceWinner(members, runningLogs, y, m);
    return { year: y, month: m, label: y === 2025 ? `2025년 ${m}월` : `2026년 ${m}월`, finishers, longRunner, finisherRate, attendance };
  }).sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

  // 명예의 전당
  const getHof = (type: 'longRun' | 'finisher' | 'attendance') => {
    const counts: Record<string, number> = {};
    for (const a of awards) {
      if (type === 'longRun' && a.longRunner) counts[a.longRunner.name] = (counts[a.longRunner.name] || 0) + 1;
      if (type === 'finisher') for (const f of a.finishers) counts[f.name] = (counts[f.name] || 0) + 1;
      if (type === 'attendance' && a.attendance) counts[a.attendance.member.name] = (counts[a.attendance.member.name] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>대시보드</Link>
      <h1 className="text-xl font-bold text-[var(--foreground)]">시상 & 명예의 전당</h1>

      {/* 명예의 전당 3종 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: '🏆 롱런상', sub: '월간 최장 거리', data: getHof('longRun'), color: 'amber' },
          { title: '🏅 피니셔', sub: '목표 달성 횟수', data: getHof('finisher'), color: 'emerald' },
          { title: '🔥 개근상', sub: '월간 러닝 횟수 1위', data: getHof('attendance'), color: 'red' },
        ].map(hof => (
          <div key={hof.title} className="card">
            <h3 className={`text-sm font-bold mb-1 ${
              hof.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
              hof.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
              'text-red-500 dark:text-red-400'
            }`}>{hof.title}</h3>
            <p className="text-[10px] text-[var(--muted)] mb-3">{hof.sub}</p>
            <div className="space-y-1">
              {hof.data.slice(0, 8).map((e, i) => (
                <Link key={e.name} href={`/member/${encodeURIComponent(e.name)}`}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-[var(--card-border)] transition-colors">
                  <span className="w-5 text-center text-xs">{i < 3 ? ['🥇','🥈','🥉'][i] : <span className="text-[var(--muted)] font-mono text-[10px]">{i+1}</span>}</span>
                  <span className="flex-1 text-sm text-[var(--foreground)] font-medium">{e.name}</span>
                  <span className={`text-sm font-mono font-semibold ${
                    hof.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                    hof.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                    'text-red-500 dark:text-red-400'
                  }`}>{e.count}회</span>
                </Link>
              ))}
              {hof.data.length === 0 && <p className="text-xs text-[var(--muted)] px-2">일별 데이터 필요</p>}
            </div>
          </div>
        ))}
      </div>

      {/* 월별 시상 타임라인 */}
      <div className="card">
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-5">월별 시상 내역</h3>
        <div className="space-y-5">
          {awards.map(a => (
            <div key={`${a.year}-${a.month}`} className="border-l-3 border-[var(--accent)] pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-[var(--foreground)]">{a.label}</h4>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.finisherRate >= 70 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : a.finisherRate >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>피니셔율 {a.finisherRate.toFixed(0)}%</span>
              </div>
              <div className="space-y-2">
                {a.longRunner && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">🏆 롱런상</span>
                    <Link href={`/member/${encodeURIComponent(a.longRunner.name)}`} className="text-sm font-medium hover:text-[var(--accent)]">{a.longRunner.name}</Link>
                    <span className="text-xs text-[var(--muted)] font-mono">{a.longRunner.distance.toFixed(1)}km</span>
                  </div>
                )}
                {a.attendance && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold bg-red-500/10 text-red-500 dark:text-red-400 px-2 py-0.5 rounded-full">🔥 개근상</span>
                    <Link href={`/member/${encodeURIComponent(a.attendance.member.name)}`} className="text-sm font-medium hover:text-[var(--accent)]">{a.attendance.member.name}</Link>
                    <span className="text-xs text-[var(--muted)] font-mono">{a.attendance.days}일</span>
                  </div>
                )}
                {a.finishers.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full mt-0.5">🏅 피니셔</span>
                    <div className="flex flex-wrap gap-1">
                      {a.finishers.map(f => (
                        <Link key={f.name} href={`/member/${encodeURIComponent(f.name)}`} className="text-[11px] text-[var(--foreground)] hover:text-[var(--accent)] bg-[var(--card-border)] px-2 py-1 rounded-lg">{f.name} <span className="text-[var(--muted)]">{f.distance.toFixed(0)}/{f.goal}</span></Link>
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
