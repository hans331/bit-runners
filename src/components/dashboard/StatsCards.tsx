'use client';

import { useData, getLeaderboard, getFinisherRate } from '@/components/DataProvider';

export default function StatsCards() {
  const { members, records, loading } = useData();
  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">{[1,2,3,4].map(i => <div key={i} className="card animate-pulse h-28" />)}</div>;

  const prevYear = 2026;
  const prevMonth = 3;
  const leaderboard = getLeaderboard(members, records, prevYear, prevMonth);
  const clubTotal = leaderboard.reduce((sum, e) => sum + e.distance, 0);
  const activeMembers = leaderboard.filter(e => e.distance > 0).length;
  const avgDistance = activeMembers > 0 ? clubTotal / activeMembers : 0;
  const finisherRate = getFinisherRate(members, records, prevYear, prevMonth);
  const allTimeDistance = records.reduce((sum, r) => sum + r.achieved_km, 0);

  const cards = [
    { label: `${prevMonth}월 클럽 총 거리`, value: `${clubTotal.toFixed(0)}`, unit: 'km', sub: `${activeMembers}명 활동`,
      gradient: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-200 dark:border-blue-500/20', valueColor: 'text-blue-600 dark:text-blue-400',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
    { label: `${prevMonth}월 인당 평균`, value: `${avgDistance.toFixed(1)}`, unit: 'km', sub: '활동 멤버 기준',
      gradient: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-200 dark:border-emerald-500/20', valueColor: 'text-emerald-600 dark:text-emerald-400',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { label: `${prevMonth}월 피니셔율`, value: `${finisherRate.toFixed(0)}`, unit: '%', sub: '목표 달성률',
      gradient: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-200 dark:border-amber-500/20', valueColor: 'text-amber-600 dark:text-amber-400',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg> },
    { label: '클럽 통산 누적', value: `${(allTimeDistance / 1000).toFixed(1)}`, unit: '천km', sub: `총 ${members.length}명`,
      gradient: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-200 dark:border-purple-500/20', valueColor: 'text-purple-600 dark:text-purple-400',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg> },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map(c => (
        <div key={c.label} className={`bg-gradient-to-br ${c.gradient} border ${c.border} rounded-2xl p-4 md:p-5 transition-all hover:shadow-md`}>
          <div className="flex items-center justify-between mb-3"><p className="text-[11px] font-medium text-[var(--muted)]">{c.label}</p>{c.icon}</div>
          <p className={`text-2xl md:text-3xl font-extrabold ${c.valueColor} tracking-tight`}>{c.value}<span className="text-sm font-medium ml-0.5">{c.unit}</span></p>
          <p className="text-[11px] text-[var(--muted)] mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
