'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useData, getClubMonthlyTotals, getLeaderboard } from '@/components/DataProvider';
import { useTheme } from '@/components/ThemeProvider';
import { getTooltipStyle, getAxisColor, getTextColor } from '@/lib/chart-theme';

export default function FinisherHistory() {
  const { theme } = useTheme();
  const { members, records } = useData();
  const isDark = theme === 'dark';
  const months = getClubMonthlyTotals(records).filter(d => d.total > 0);

  const data = months.map(m => {
    const lb = getLeaderboard(members, records, m.year, m.month);
    const withGoal = lb.filter(e => e.goal > 0);
    const finishers = withGoal.filter(e => e.distance >= e.goal).length;
    const total = withGoal.length;
    const rate = total > 0 ? (finishers / total) * 100 : 0;
    return { label: m.label, finishers, total, rate, display: `${finishers}/${total}` };
  });

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">월별 피니셔율</h3>
      <div className="h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getAxisColor(isDark)} />
            <XAxis dataKey="label" tick={{ fill: getTextColor(isDark), fontSize: 14 }} axisLine={{ stroke: getAxisColor(isDark) }} />
            <YAxis tick={{ fill: getTextColor(isDark), fontSize: 14 }} axisLine={{ stroke: getAxisColor(isDark) }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={getTooltipStyle(isDark)} formatter={(value) => [`${Number(value).toFixed(0)}%`, '피니셔율']} />
            <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={entry.rate >= 70 ? '#10b981' : entry.rate >= 50 ? '#f59e0b' : '#ef4444'} />)}
              <LabelList dataKey="display" position="top" style={{ fill: getTextColor(isDark), fontSize: 14, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
