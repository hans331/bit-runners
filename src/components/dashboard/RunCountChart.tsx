'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useData } from '@/components/DataProvider';
import { useTheme } from '@/components/ThemeProvider';
import { getTooltipStyle, getAxisColor, getTextColor } from '@/lib/chart-theme';

interface Props { year: number; month: number; }

export default function RunCountChart({ year, month }: Props) {
  const { theme } = useTheme();
  const { members, runningLogs } = useData();
  const isDark = theme === 'dark';

  const data = members
    .filter(m => m.status === 'active')
    .map(m => {
      const logs = runningLogs.filter(l => l.member_id === m.id);
      const uniqueDays = new Set(logs.filter(l => {
        const d = new Date(l.run_date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      }).map(l => l.run_date));
      return { name: m.name, count: uniqueDays.size };
    })
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">{month}월 러닝 횟수</h3>
      <div className="h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getAxisColor(isDark)} />
            <XAxis type="number" tick={{ fill: getTextColor(isDark), fontSize: 11 }} axisLine={{ stroke: getAxisColor(isDark) }} />
            <YAxis type="category" dataKey="name" tick={{ fill: getTextColor(isDark), fontSize: 11 }} axisLine={{ stroke: getAxisColor(isDark) }} width={50} />
            <Tooltip contentStyle={getTooltipStyle(isDark)} formatter={(value) => [`${value}회`, '러닝 횟수']} />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]}>
              <LabelList dataKey="count" position="right" formatter={(v: unknown) => `${v}회`} style={{ fill: getTextColor(isDark), fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
