'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useData, getClubMonthlyTotals } from '@/components/DataProvider';
import { useTheme } from '@/components/ThemeProvider';
import { getTooltipStyle, getAxisColor, getTextColor } from '@/lib/chart-theme';

export default function MonthlyTrendChart() {
  const { theme } = useTheme();
  const { records } = useData();
  const isDark = theme === 'dark';
  const data = getClubMonthlyTotals(records).filter(d => d.total > 0);

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">클럽 월별 총 거리</h3>
      <div className="h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
            <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={getAxisColor(isDark)} />
            <XAxis dataKey="label" tick={{ fill: getTextColor(isDark), fontSize: 14 }} axisLine={{ stroke: getAxisColor(isDark) }} />
            <YAxis tick={{ fill: getTextColor(isDark), fontSize: 14 }} axisLine={{ stroke: getAxisColor(isDark) }} />
            <Tooltip contentStyle={getTooltipStyle(isDark)} formatter={(value) => [`${Number(value).toFixed(0)}km`, '총 거리']} />
            <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorTotal)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#60a5fa' }}>
              <LabelList dataKey="total" position="top" formatter={(v: unknown) => `${Number(v).toFixed(0)}`} style={{ fill: getTextColor(isDark), fontSize: 14, fontWeight: 600 }} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
