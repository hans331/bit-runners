'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { members, monthlyRecords } from '@/lib/data';
import { useTheme } from '@/components/ThemeProvider';
import { getTooltipStyle, getAxisColor, getTextColor } from '@/lib/chart-theme';

const COLORS = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#db2777', '#0891b2', '#ea580c', '#0d9488', '#a855f7',
];

export default function MemberGrowthChart() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const allMonths = Array.from(
    new Set(monthlyRecords.map(r => `${r.year}-${r.month}`))
  ).sort();

  const topMembers = members
    .map(m => ({
      ...m,
      total: monthlyRecords.filter(r => r.member_id === m.id).reduce((sum, r) => sum + r.achieved_km, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const data = allMonths.map(monthKey => {
    const [y, m] = monthKey.split('-').map(Number);
    const label = y === 2025 ? `'25.${m}월` : `'26.${m}월`;
    const point: Record<string, string | number> = { label };
    for (const member of topMembers) {
      const record = monthlyRecords.find(r => r.member_id === member.id && r.year === y && r.month === m);
      if (record && record.achieved_km > 0) point[member.name] = record.achieved_km;
    }
    return point;
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">멤버별 월간 거리</h3>
          <p className="text-[10px] text-[var(--muted)]">TOP 10</p>
        </div>
      </div>
      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getAxisColor(isDark)} />
            <XAxis dataKey="label" tick={{ fill: getTextColor(isDark), fontSize: 10 }} axisLine={{ stroke: getAxisColor(isDark) }} />
            <YAxis tick={{ fill: getTextColor(isDark), fontSize: 11 }} axisLine={{ stroke: getAxisColor(isDark) }} unit="km" />
            <Tooltip contentStyle={getTooltipStyle(isDark)} formatter={(value) => [`${Number(value).toFixed(1)}km`]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {topMembers.map((member, i) => (
              <Line key={member.id} type="monotone" dataKey={member.name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
