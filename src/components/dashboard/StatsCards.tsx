'use client';

import { useData, getLeaderboard } from '@/components/DataProvider';

interface Props { year?: number; month?: number; }

export default function StatsCards({ year, month }: Props) {
  const { members, records, runningLogs, loading } = useData();
  if (loading) return <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="card animate-pulse h-32" />)}</div>;

  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? (now.getMonth() + 1);

  const leaderboard = getLeaderboard(members, records, y, m);
  const clubTotal = leaderboard.reduce((sum, e) => sum + e.distance, 0);
  const activeMembers = leaderboard.filter(e => e.distance > 0).length;
  const avgDistance = activeMembers > 0 ? clubTotal / activeMembers : 0;

  const monthLogs = runningLogs.filter(l => {
    const d = new Date(l.run_date);
    return d.getFullYear() === y && d.getMonth() + 1 === m;
  });
  const totalRuns = new Set(monthLogs.map(l => `${l.member_id}-${l.run_date}`)).size;

  const daysInMonth = new Date(y, m, 0).getDate();
  const today = now.getFullYear() === y && now.getMonth() + 1 === m ? now.getDate() : daysInMonth;
  const daysLeft = daysInMonth - today;

  const cards = [
    { label: '클럽 총 거리', value: `${clubTotal.toFixed(0)}`, unit: 'km', sub: `${activeMembers}명 활동`,
      gradient: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-200/80 dark:border-blue-500/20', valueColor: 'text-blue-600 dark:text-blue-400',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
    { label: '인당 평균', value: `${avgDistance.toFixed(1)}`, unit: 'km', sub: '활동 멤버 기준',
      gradient: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-200/80 dark:border-emerald-500/20', valueColor: 'text-emerald-600 dark:text-emerald-400',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { label: '총 러닝', value: `${totalRuns}`, unit: '회', sub: `D-${daysLeft > 0 ? daysLeft : 'Day'}`,
      gradient: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-200/80 dark:border-amber-500/20', valueColor: 'text-amber-600 dark:text-amber-400',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg> },
    { label: '활동 멤버', value: `${members.filter(m => m.status === 'active').length}`, unit: '명', sub: `전체 ${members.length}명`,
      gradient: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-200/80 dark:border-purple-500/20', valueColor: 'text-purple-600 dark:text-purple-400',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`bg-gradient-to-br ${c.gradient} border ${c.border} rounded-2xl p-4 md:p-5 transition-all`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs md:text-sm font-medium text-[var(--muted)]">{c.label}</p>
            {c.icon}
          </div>
          <p className={`text-3xl md:text-4xl font-extrabold ${c.valueColor} tracking-tight`}>
            {c.value}<span className="text-sm md:text-base font-semibold ml-0.5">{c.unit}</span>
          </p>
          <p className="text-xs md:text-sm text-[var(--muted)] mt-1.5">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
