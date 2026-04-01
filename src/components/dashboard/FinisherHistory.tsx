'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getClubMonthlyTotals, getLeaderboard, monthlyRecords } from '@/lib/data';

export default function FinisherHistory() {
  const months = getClubMonthlyTotals().filter(d => d.total > 0);

  const data = months.map(m => {
    const leaderboard = getLeaderboard(m.year, m.month);
    const withGoal = leaderboard.filter(e => e.goal > 0);
    const finishers = withGoal.filter(e => e.distance >= e.goal).length;
    const total = withGoal.length;
    const rate = total > 0 ? (finishers / total) * 100 : 0;

    return {
      label: m.label,
      finishers,
      total,
      rate,
    };
  });

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">월별 피니셔율 추이</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: 12,
              }}
              formatter={(value) => [
                `${Number(value).toFixed(0)}%`,
                '피니셔율',
              ]}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.rate >= 70 ? '#10b981' : entry.rate >= 50 ? '#f59e0b' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
