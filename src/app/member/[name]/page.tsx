'use client';

import { use } from 'react';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import { useData, getTotalDistance, getMemberRecords, getMemberBadges, getMonthlyRunCounts } from '@/components/DataProvider';
import { useTheme } from '@/components/ThemeProvider';
import { getTooltipStyle, getAxisColor, getTextColor } from '@/lib/chart-theme';
import Badges from '@/components/Badges';

export default function MemberPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const { theme } = useTheme();
  const { members, records, runningLogs, loading } = useData();
  const isDark = theme === 'dark';
  const decodedName = decodeURIComponent(name);
  const member = members.find(m => m.name === decodedName);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-6"><div className="card animate-pulse h-96" /></div>;
  if (!member) return <div className="max-w-4xl mx-auto px-4 py-16 text-center"><h2 className="text-xl">멤버를 찾을 수 없습니다</h2><Link href="/" className="text-[var(--accent)] hover:underline mt-4 inline-block">대시보드로 돌아가기</Link></div>;

  const memberRecords = getMemberRecords(records, member.id);
  const activeRecords = memberRecords.filter(r => r.achieved_km > 0);
  const totalDistance = getTotalDistance(records, member.id);
  const totalMonths = activeRecords.length;
  const avgPerMonth = totalMonths > 0 ? totalDistance / totalMonths : 0;
  const bestMonth = activeRecords.length > 0 ? activeRecords.reduce((max, r) => r.achieved_km > max.achieved_km ? r : max, activeRecords[0]) : null;
  const finisherMonths = memberRecords.filter(r => r.goal_km > 0 && r.achieved_km >= r.goal_km).length;
  const totalGoalMonths = memberRecords.filter(r => r.goal_km > 0).length;

  const chartData = memberRecords.map(r => ({ label: r.year === 2025 ? `'25.${r.month}` : `'26.${r.month}`, 목표: r.goal_km, 달성: r.achieved_km }));

  const rank = members.map(m => ({ name: m.name, total: getTotalDistance(records, m.id) })).sort((a, b) => b.total - a.total).findIndex(r => r.name === member.name) + 1;

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>대시보드</Link>
      <div className="card bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 !border-blue-200 dark:!border-blue-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">{member.name[0]}</div>
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)]">
                {member.name}
                {member.status === 'dormant' && <span className="ml-2 text-sm font-normal text-[var(--muted)] bg-amber-500/10 px-2 py-0.5 rounded-full">💤 휴면</span>}
              </h1>
              <p className="text-xs text-[var(--muted)]">#{member.member_number} · {member.join_location || '-'}{member.join_date && ` · ${member.join_date}`}</p>
              <div className="mt-1.5"><Badges {...getMemberBadges(members, records, runningLogs, member.id)} /></div>
            </div>
          </div>
          <div className="flex gap-5 sm:gap-8">
            <div className="text-center"><p className="text-xl md:text-2xl font-extrabold text-blue-600 dark:text-blue-400">{totalDistance.toFixed(0)}<span className="text-sm font-medium">km</span></p><p className="text-[10px] text-[var(--muted)]">통산</p></div>
            <div className="text-center"><p className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">#{rank}</p><p className="text-[10px] text-[var(--muted)]">순위</p></div>
            <div className="text-center"><p className="text-xl md:text-2xl font-extrabold text-amber-600 dark:text-amber-400">{avgPerMonth.toFixed(0)}<span className="text-sm font-medium">km</span></p><p className="text-[10px] text-[var(--muted)]">월평균</p></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: '활동 기간', v: `${totalMonths}개월`, c: '' }, { l: '피니셔 달성', v: `${finisherMonths}/${totalGoalMonths}`, c: 'text-emerald-600 dark:text-emerald-400' },
          { l: '월 최고', v: bestMonth ? `${bestMonth.achieved_km.toFixed(0)}km` : '-', c: 'text-amber-600 dark:text-amber-400' },
          { l: '피니셔 확률', v: totalGoalMonths > 0 ? `${((finisherMonths / totalGoalMonths) * 100).toFixed(0)}%` : '-', c: 'text-purple-600 dark:text-purple-400' }
        ].map(card => <div key={card.l} className="card text-center !p-4"><p className={`text-lg md:text-xl font-extrabold ${card.c || 'text-[var(--foreground)]'}`}>{card.v}</p><p className="text-[10px] text-[var(--muted)] mt-0.5">{card.l}</p></div>)}
      </div>
      <div className="card">
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">월별 목표 vs 달성</h3>
        <div className="h-56 md:h-72"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getAxisColor(isDark)} />
            <XAxis dataKey="label" tick={{ fill: getTextColor(isDark), fontSize: 11 }} axisLine={{ stroke: getAxisColor(isDark) }} />
            <YAxis tick={{ fill: getTextColor(isDark), fontSize: 11 }} axisLine={{ stroke: getAxisColor(isDark) }} unit="km" />
            <Tooltip contentStyle={getTooltipStyle(isDark)} formatter={(value, name) => [`${Number(value).toFixed(1)}km`, String(name)]} />
            <Bar dataKey="목표" fill={isDark ? '#334155' : '#cbd5e1'} radius={[6, 6, 0, 0]} barSize={18} />
            <Bar dataKey="달성" radius={[6, 6, 0, 0]} barSize={18}>
              {chartData.map((e, i) => <Cell key={i} fill={e.달성 >= e.목표 && e.목표 > 0 ? '#10b981' : '#3b82f6'} />)}
              <LabelList dataKey="달성" position="top" formatter={(v: unknown) => Number(v) > 0 ? `${Number(v).toFixed(0)}` : ''} style={{ fill: getTextColor(isDark), fontSize: 9, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer></div>
      </div>
      <div className="card">
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">거리 성장 추이</h3>
        <div className="h-48 md:h-56"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getAxisColor(isDark)} />
            <XAxis dataKey="label" tick={{ fill: getTextColor(isDark), fontSize: 11 }} axisLine={{ stroke: getAxisColor(isDark) }} />
            <YAxis tick={{ fill: getTextColor(isDark), fontSize: 11 }} axisLine={{ stroke: getAxisColor(isDark) }} unit="km" />
            <Tooltip contentStyle={getTooltipStyle(isDark)} formatter={(value) => [`${Number(value).toFixed(1)}km`]} />
            <ReferenceLine y={avgPerMonth} stroke="#d97706" strokeDasharray="5 5" label={{ value: `평균 ${avgPerMonth.toFixed(0)}km`, fill: '#d97706', fontSize: 10 }} />
            <Line type="monotone" dataKey="달성" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }}>
              <LabelList dataKey="달성" position="top" formatter={(v: unknown) => Number(v) > 0 ? `${Number(v).toFixed(0)}` : ''} style={{ fill: getTextColor(isDark), fontSize: 9, fontWeight: 600 }} />
            </Line>
          </LineChart>
        </ResponsiveContainer></div>
      </div>
      <div className="card overflow-hidden !p-0">
        <h3 className="text-sm font-bold text-[var(--foreground)] p-4 pb-0">월별 기록</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[var(--muted)] text-left border-b border-[var(--card-border)]">
          <th className="py-3 px-4 font-medium">월</th><th className="py-3 px-4 text-right font-medium">목표</th><th className="py-3 px-4 text-right font-medium">달성</th><th className="py-3 px-4 text-right font-medium">달성률</th><th className="py-3 px-4 text-center font-medium">상태</th>
        </tr></thead><tbody>
          {memberRecords.map((r, i) => {
            const rate = r.goal_km > 0 ? (r.achieved_km / r.goal_km) * 100 : 0;
            const isF = r.goal_km > 0 && r.achieved_km >= r.goal_km;
            return <tr key={i} className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--card-border)]/50">
              <td className="py-2.5 px-4 font-medium">{r.year === 2025 ? `'25.${r.month}월` : `'26.${r.month}월`}</td>
              <td className="py-2.5 px-4 text-right text-[var(--muted)] font-mono text-xs">{r.goal_km > 0 ? `${r.goal_km}km` : '-'}</td>
              <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold">{r.achieved_km > 0 ? `${r.achieved_km.toFixed(1)}km` : '-'}</td>
              <td className={`py-2.5 px-4 text-right font-mono text-xs font-semibold ${isF ? 'text-emerald-600 dark:text-emerald-400' : rate >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--muted)]'}`}>{r.goal_km > 0 && r.achieved_km > 0 ? `${rate.toFixed(0)}%` : '-'}</td>
              <td className="py-2.5 px-4 text-center">{isF ? <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ 달성</span> : r.achieved_km === 0 ? <span className="text-[10px] text-[var(--muted)]">-</span> : <span className="text-[10px] text-[var(--muted)] bg-slate-500/10 px-2 py-0.5 rounded-full">미달</span>}</td>
            </tr>;
          })}
        </tbody></table></div>
      </div>
    </div>
  );
}
