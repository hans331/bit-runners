'use client';

import { members, monthlyRecords, getLeaderboard, getFinisherRate } from '@/lib/data';

export default function StatsCards() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 전달 기준 (3월 데이터가 없으므로 2월 데이터 사용)
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const leaderboard = getLeaderboard(prevYear, prevMonth);
  const clubTotal = leaderboard.reduce((sum, e) => sum + e.distance, 0);
  const activeMembers = leaderboard.filter(e => e.distance > 0).length;
  const avgDistance = activeMembers > 0 ? clubTotal / activeMembers : 0;
  const finisherRate = getFinisherRate(prevYear, prevMonth);

  // 전체 통산 거리
  const allTimeDistance = monthlyRecords.reduce((sum, r) => sum + r.achieved_km, 0);

  const cards = [
    {
      label: `${prevMonth}월 클럽 총 거리`,
      value: `${clubTotal.toFixed(0)}km`,
      sub: `${activeMembers}명 활동`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      label: `${prevMonth}월 평균 거리`,
      value: `${avgDistance.toFixed(1)}km`,
      sub: `인당 평균`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    },
    {
      label: `${prevMonth}월 피니셔율`,
      value: `${finisherRate.toFixed(0)}%`,
      sub: `목표 달성률`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    },
    {
      label: '클럽 통산 누적',
      value: `${(allTimeDistance / 1000).toFixed(1)}천km`,
      sub: `총 ${members.length}명`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bgColor} border ${card.borderColor} rounded-xl p-4 md:p-5`}
        >
          <p className="text-xs text-slate-400 mb-1">{card.label}</p>
          <p className={`text-2xl md:text-3xl font-bold ${card.color}`}>{card.value}</p>
          <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
