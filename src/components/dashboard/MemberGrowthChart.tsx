'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '@/components/DataProvider';
import { useTheme } from '@/components/ThemeProvider';
import { getTooltipStyle, getAxisColor, getTextColor } from '@/lib/chart-theme';

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0891b2','#ea580c','#0d9488','#a855f7'];

export default function MemberGrowthChart() {
  const { theme } = useTheme();
  const { members, records } = useData();
  const isDark = theme === 'dark';

  const allMonths = Array.from(new Set(records.map(r => `${r.year}-${r.month}`))).sort();
  const topMembers = members
    .map(m => ({ ...m, total: records.filter(r => r.member_id === m.id).reduce((s, r) => s + r.achieved_km, 0) }))
    .sort((a, b) => b.total - a.total).slice(0, 10);

  const data = allMonths.map(mk => {
    const [y, m] = mk.split('-').map(Number);
    const point: Record<string, string | number> = { label: y === 2025 ? `'25.${m}월` : `'26.${m}월` };
    topMembers.forEach(mb => {
      const r = records.find(r => r.member_id === mb.id && r.year === y && r.month === m);
      if (r && r.achieved_km > 0) point[mb.name] = r.achieved_km;
    });
    return point;
  });

  return (
    <div className="card">
      <h3 className="text-base font-bold text-[var(--foreground)] mb-1">멤버별 월간 거리</h3>
      <p className="text-xs text-[var(--muted)] mb-4">TOP 10</p>
      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getAxisColor(isDark)} />
            <XAxis dataKey="label" tick={{ fill: getTextColor(isDark), fontSize: 14 }} axisLine={{ stroke: getAxisColor(isDark) }} />
            <YAxis tick={{ fill: getTextColor(isDark), fontSize: 14 }} axisLine={{ stroke: getAxisColor(isDark) }} unit="km" />
            <Tooltip contentStyle={getTooltipStyle(isDark)} formatter={(value) => [`${Number(value).toFixed(1)}km`]} />
            <Legend wrapperStyle={{ fontSize: 14 }} />
            {topMembers.map((mb, i) => <Line key={mb.id} type="monotone" dataKey={mb.name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
