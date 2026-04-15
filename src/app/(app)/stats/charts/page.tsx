'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchDistanceByPeriod, type PeriodDistance } from '@/lib/stats-data';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowLeft, BarChart3, TrendingUp } from 'lucide-react';
import Link from 'next/link';

type PeriodMode = 'weekly' | 'monthly' | 'quarterly' | 'half' | 'yearly';
type ChartType = 'bar' | 'line';

const PERIOD_OPTIONS: { id: PeriodMode; label: string }[] = [
  { id: 'weekly', label: '주간' },
  { id: 'monthly', label: '월간' },
  { id: 'quarterly', label: '분기' },
  { id: 'half', label: '반기' },
  { id: 'yearly', label: '연간' },
];

export default function ChartsPage() {
  const { user } = useAuth();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<PeriodDistance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await fetchDistanceByPeriod(user.id, periodMode, year);
      setData(result);
    } catch {} finally { setLoading(false); }
  }, [user, periodMode, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalDistance = data.reduce((s, d) => s + d.distance, 0);
  const prevTotal = data.reduce((s, d) => s + (d.prevDistance || 0), 0);
  const hasPrevData = data.some((d) => d.prevDistance !== undefined && d.prevDistance > 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/stats" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] flex-1">러닝 통계</h1>
      </div>

      {/* 연도 선택 */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setYear((y) => y - 1)} className="text-[var(--muted)] text-2xl font-extrabold">&lt;</button>
        <span className="text-xl font-extrabold text-[var(--foreground)]">{year}</span>
        <button onClick={() => setYear((y) => y + 1)} className="text-[var(--muted)] text-2xl font-extrabold">&gt;</button>
      </div>

      {/* 총 거리 요약 */}
      <div className="card p-5 mb-4 text-center">
        <p className="text-xs text-[var(--muted)]">총 거리</p>
        <p className="text-3xl font-extrabold text-[var(--accent)]">{totalDistance.toFixed(1)} km</p>
        {hasPrevData && prevTotal > 0 && (
          <p className={`text-sm mt-1 ${totalDistance >= prevTotal ? 'text-green-500' : 'text-red-500'}`}>
            전년 대비 {totalDistance >= prevTotal ? '+' : ''}{(totalDistance - prevTotal).toFixed(1)}km
            ({prevTotal > 0 ? ((totalDistance / prevTotal - 1) * 100).toFixed(0) : 0}%)
          </p>
        )}
      </div>

      {/* 기간 선택 */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setPeriodMode(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              periodMode === opt.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card)] text-[var(--muted)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 차트 타입 토글 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setChartType('bar')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
            chartType === 'bar' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card)] text-[var(--muted)]'
          }`}
        >
          <BarChart3 size={14} /> 막대
        </button>
        <button
          onClick={() => setChartType('line')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
            chartType === 'line' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card)] text-[var(--muted)]'
          }`}
        >
          <TrendingUp size={14} /> 선
        </button>
      </div>

      {/* 차트 */}
      <div className="card p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            {chartType === 'bar' ? (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} unit="km" />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 14 }}
                  formatter={(value) => [`${value}km`]}
                />
                {hasPrevData && (
                  <Bar dataKey="prevDistance" name={`${year - 1}년`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                )}
                <Bar dataKey="distance" name={`${year}년`} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                {hasPrevData && <Legend wrapperStyle={{ fontSize: 14 }} />}
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} unit="km" />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 14 }}
                  formatter={(value) => [`${value}km`]}
                />
                {hasPrevData && (
                  <Line type="monotone" dataKey="prevDistance" name={`${year - 1}년`} stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
                )}
                <Line type="monotone" dataKey="distance" name={`${year}년`} stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
                {hasPrevData && <Legend wrapperStyle={{ fontSize: 14 }} />}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* 기간별 상세 */}
      <div className="card mt-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)] px-5 pt-4 pb-2">상세 내역</h3>
        <div className="divide-y divide-[var(--card-border)]">
          {data.map((d) => (
            <div key={d.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-[var(--foreground)]">{d.label}</span>
              <div className="text-right">
                <p className="text-base font-bold text-[var(--foreground)]">{d.distance.toFixed(1)} km</p>
                {d.prevDistance !== undefined && d.prevDistance > 0 && (
                  <p className={`text-sm ${d.distance >= d.prevDistance ? 'text-green-500' : 'text-red-500'}`}>
                    전년 {d.prevDistance.toFixed(1)}km
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
