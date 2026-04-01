'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { members, getMemberByName, getMemberRecords, getTotalDistance } from '@/lib/data';

export default function MemberPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const member = getMemberByName(decodedName);

  if (!member) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl text-slate-300">멤버를 찾을 수 없습니다</h2>
        <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">대시보드로 돌아가기</Link>
      </div>
    );
  }

  const records = getMemberRecords(member.id).filter(r => r.achieved_km > 0);
  const allRecords = getMemberRecords(member.id);
  const totalDistance = getTotalDistance(member.id);
  const totalMonths = records.length;
  const avgPerMonth = totalMonths > 0 ? totalDistance / totalMonths : 0;
  const bestMonth = records.reduce((max, r) => r.achieved_km > max.achieved_km ? r : max, records[0]);
  const finisherMonths = allRecords.filter(r => r.goal_km > 0 && r.achieved_km >= r.goal_km).length;
  const totalGoalMonths = allRecords.filter(r => r.goal_km > 0).length;

  // 목표 vs 달성 차트 데이터
  const chartData = allRecords.map(r => ({
    label: r.year === 2025 ? `'25.${r.month}월` : `'26.${r.month}월`,
    목표: r.goal_km,
    달성: r.achieved_km,
    달성률: r.goal_km > 0 ? Math.round((r.achieved_km / r.goal_km) * 100) : 0,
  }));

  // 통산 랭킹
  const allRankings = members
    .map(m => ({ name: m.name, total: getTotalDistance(m.id) }))
    .sort((a, b) => b.total - a.total);
  const rank = allRankings.findIndex(r => r.name === member.name) + 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* 뒤로 가기 */}
      <Link href="/" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
        ← 대시보드
      </Link>

      {/* 프로필 카드 */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏃🏻</span>
              <div>
                <h1 className="text-2xl font-bold text-white">{member.name}</h1>
                <p className="text-sm text-slate-400">
                  #{member.member_number} · {member.join_location || '미입력'}
                  {member.join_date && ` · ${member.join_date} 합류`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{totalDistance.toFixed(0)}km</p>
              <p className="text-[10px] text-slate-500">통산 거리</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">#{rank}</p>
              <p className="text-[10px] text-slate-500">클럽 순위</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{avgPerMonth.toFixed(0)}km</p>
              <p className="text-[10px] text-slate-500">월평균</p>
            </div>
          </div>
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-white">{totalMonths}개월</p>
          <p className="text-xs text-slate-500">활동 기간</p>
        </div>
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-emerald-400">{finisherMonths}/{totalGoalMonths}</p>
          <p className="text-xs text-slate-500">피니셔 달성</p>
        </div>
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-amber-400">
            {bestMonth ? `${bestMonth.achieved_km.toFixed(0)}km` : '-'}
          </p>
          <p className="text-xs text-slate-500">
            월 최고 기록
            {bestMonth && <span className="block text-[9px]">
              ({bestMonth.year === 2025 ? `'25.${bestMonth.month}월` : `'26.${bestMonth.month}월`})
            </span>}
          </p>
        </div>
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-purple-400">
            {totalGoalMonths > 0 ? `${((finisherMonths / totalGoalMonths) * 100).toFixed(0)}%` : '-'}
          </p>
          <p className="text-xs text-slate-500">피니셔 확률</p>
        </div>
      </div>

      {/* 목표 vs 달성 차트 */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">월별 목표 vs 달성</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
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
                formatter={(value, name) => [`${Number(value).toFixed(1)}km`, String(name)]}
              />
              <Bar dataKey="목표" fill="#475569" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="달성" radius={[4, 4, 0, 0]} barSize={20}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.달성 >= entry.목표 && entry.목표 > 0 ? '#10b981' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-slate-600 rounded-sm inline-block" /> 목표
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-blue-500 rounded-sm inline-block" /> 달성 (미달)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-emerald-500 rounded-sm inline-block" /> 달성 (완료)
          </span>
        </div>
      </div>

      {/* 거리 추이 라인 차트 */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">거리 성장 추이</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
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
              <ReferenceLine y={avgPerMonth} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '평균', fill: '#f59e0b', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="달성"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6, fill: '#60a5fa' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 월별 기록 상세 테이블 */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">월별 기록 상세</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-700">
                <th className="py-2 px-3">월</th>
                <th className="py-2 px-3 text-right">목표</th>
                <th className="py-2 px-3 text-right">달성</th>
                <th className="py-2 px-3 text-right">달성률</th>
                <th className="py-2 px-3 text-center">피니셔</th>
              </tr>
            </thead>
            <tbody>
              {allRecords.map((r, i) => {
                const rate = r.goal_km > 0 ? (r.achieved_km / r.goal_km) * 100 : 0;
                const isFinisher = r.goal_km > 0 && r.achieved_km >= r.goal_km;
                return (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-2 px-3 text-slate-300">
                      {r.year === 2025 ? `'25.${r.month}월` : `'26.${r.month}월`}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400 font-mono">
                      {r.goal_km > 0 ? `${r.goal_km}km` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-white font-mono">
                      {r.achieved_km > 0 ? `${r.achieved_km.toFixed(1)}km` : '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${
                      isFinisher ? 'text-emerald-400' : rate >= 80 ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {r.goal_km > 0 && r.achieved_km > 0 ? `${rate.toFixed(0)}%` : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isFinisher ? <span className="text-emerald-400">✓</span> :
                       r.achieved_km === 0 ? '-' : <span className="text-slate-600">✗</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
