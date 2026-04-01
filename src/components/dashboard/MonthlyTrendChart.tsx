'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getClubMonthlyTotals } from '@/lib/data';

export default function MonthlyTrendChart() {
  const data = getClubMonthlyTotals().filter(d => d.total > 0);

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">클럽 월별 총 거리 추이</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: 13,
              }}
              formatter={(value) => [`${Number(value).toFixed(0)}km`, '총 거리']}
              labelFormatter={(label) => `${label}`}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#colorTotal)"
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#60a5fa' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-500">
        <span>활동 멤버: {data.map(d => d.members).join(' → ')}명</span>
        <span>클럽 성장 추이</span>
      </div>
    </div>
  );
}
