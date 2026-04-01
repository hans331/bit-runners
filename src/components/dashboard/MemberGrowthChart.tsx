'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { members, monthlyRecords } from '@/lib/data';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#6366f1', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
  '#22c55e', '#eab308', '#7c3aed', '#fb923c',
];

export default function MemberGrowthChart() {
  // 모든 월 수집
  const allMonths = Array.from(
    new Set(monthlyRecords.map(r => `${r.year}-${r.month}`))
  ).sort();

  // 상위 10명만 표시 (통산 거리 기준)
  const topMembers = members
    .map(m => ({
      ...m,
      total: monthlyRecords
        .filter(r => r.member_id === m.id)
        .reduce((sum, r) => sum + r.achieved_km, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const data = allMonths.map(monthKey => {
    const [y, m] = monthKey.split('-').map(Number);
    const label = y === 2025 ? `'25.${m}월` : `'26.${m}월`;
    const point: Record<string, string | number> = { label };

    for (const member of topMembers) {
      const record = monthlyRecords.find(
        r => r.member_id === member.id && r.year === y && r.month === m
      );
      if (record && record.achieved_km > 0) {
        point[member.name] = record.achieved_km;
      }
    }

    return point;
  });

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-1">멤버별 월간 거리 추이</h3>
      <p className="text-[10px] text-slate-500 mb-4">상위 10명 (통산 거리 기준)</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: 12,
              }}
              formatter={(value) => [`${Number(value).toFixed(1)}km`]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            />
            {topMembers.map((member, i) => (
              <Line
                key={member.id}
                type="monotone"
                dataKey={member.name}
                stroke={COLORS[i]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
