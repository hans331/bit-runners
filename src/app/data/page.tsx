'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useData, getTotalDistance } from '@/components/DataProvider';

export default function DataPage() {
  const { members, records, runningLogs, loading } = useData();
  const [view, setView] = useState<'monthly' | 'daily'>('monthly');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [filterMember, setFilterMember] = useState<string>('all');
  const [dailyPage, setDailyPage] = useState(0);
  const PAGE_SIZE = 50;

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-6"><div className="card animate-pulse h-96" /></div>;

  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  // 월별 데이터: 월별로 그룹핑
  const monthKeys = Array.from(new Set(records.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`))).sort().reverse();

  // 일별 데이터
  const filteredLogs = filterMember === 'all'
    ? [...runningLogs]
    : runningLogs.filter(l => l.member_id === filterMember);
  const sortedLogs = filteredLogs.sort((a, b) => b.run_date.localeCompare(a.run_date));
  const pagedLogs = sortedLogs.slice(dailyPage * PAGE_SIZE, (dailyPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedLogs.length / PAGE_SIZE);

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '?';

  // 월 클릭 → 해당 월 일별 기록
  const getMonthDailyLogs = (monthKey: string) => {
    const [y, m] = monthKey.split('-').map(Number);
    return runningLogs
      .filter(l => {
        const d = new Date(l.run_date);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      })
      .sort((a, b) => a.run_date.localeCompare(b.run_date) || getMemberName(a.member_id).localeCompare(getMemberName(b.member_id), 'ko'));
  };

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>대시보드
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">데이터</h1>
        <div className="flex items-center gap-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-0.5">
          <button onClick={() => { setView('monthly'); setDailyPage(0); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${view === 'monthly' ? 'bg-[var(--accent)] text-white font-medium' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
            월별
          </button>
          <button onClick={() => { setView('daily'); setDailyPage(0); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${view === 'daily' ? 'bg-[var(--accent)] text-white font-medium' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
            일별
          </button>
        </div>
      </div>

      {/* 총 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center !p-4">
          <p className="text-2xl font-extrabold text-[var(--foreground)]">{records.length}</p>
          <p className="text-[10px] text-[var(--muted)]">월별 레코드</p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{runningLogs.length}</p>
          <p className="text-[10px] text-[var(--muted)]">일별 러닝 기록</p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{members.length}</p>
          <p className="text-[10px] text-[var(--muted)]">멤버</p>
        </div>
      </div>

      {/* ===== 월별 뷰 ===== */}
      {view === 'monthly' && (
        <div className="space-y-3">
          {monthKeys.map(monthKey => {
            const [y, m] = monthKey.split('-').map(Number);
            const monthRecords = records
              .filter(r => r.year === y && r.month === m)
              .map(r => ({ ...r, name: getMemberName(r.member_id) }))
              .sort((a, b) => b.achieved_km - a.achieved_km);
            const totalKm = monthRecords.reduce((s, r) => s + r.achieved_km, 0);
            const activeCount = monthRecords.filter(r => r.achieved_km > 0).length;
            const isExpanded = expandedMonth === monthKey;
            const dailyLogs = isExpanded ? getMonthDailyLogs(monthKey) : [];

            return (
              <div key={monthKey} className="card !p-0 overflow-hidden">
                {/* 월 헤더 (클릭으로 일별 펼침) */}
                <button
                  onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[var(--card-border)]/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[var(--foreground)]">
                      {y === 2025 ? `'25.${m}월` : `'26.${m}월`}
                    </span>
                    <span className="text-xs text-[var(--muted)]">{activeCount}명 활동</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-semibold text-[var(--accent)]">{totalKm.toFixed(0)}km</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-[var(--muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                </button>

                {/* 월별 멤버 테이블 */}
                <div className="border-t border-[var(--card-border)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[var(--muted)] text-left bg-[var(--sidebar-bg)]">
                          <th className="py-2 px-4 font-medium text-xs">이름</th>
                          <th className="py-2 px-4 text-right font-medium text-xs">목표</th>
                          <th className="py-2 px-4 text-right font-medium text-xs">달성</th>
                          <th className="py-2 px-4 text-right font-medium text-xs">달성률</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthRecords.map(r => {
                          const rate = r.goal_km > 0 ? (r.achieved_km / r.goal_km) * 100 : 0;
                          const isFinisher = r.goal_km > 0 && r.achieved_km >= r.goal_km;
                          return (
                            <tr key={r.member_id} className="border-t border-[var(--card-border)] hover:bg-[var(--card-border)]/30">
                              <td className="py-2 px-4">
                                <Link href={`/member/${encodeURIComponent(r.name)}`} className="text-[var(--foreground)] hover:text-[var(--accent)] font-medium">{r.name}</Link>
                              </td>
                              <td className="py-2 px-4 text-right text-[var(--muted)] font-mono text-xs">{r.goal_km > 0 ? `${r.goal_km}km` : '-'}</td>
                              <td className="py-2 px-4 text-right font-mono text-xs font-semibold">{r.achieved_km > 0 ? `${r.achieved_km.toFixed(1)}km` : '-'}</td>
                              <td className={`py-2 px-4 text-right font-mono text-xs font-semibold ${isFinisher ? 'text-emerald-600 dark:text-emerald-400' : rate >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--muted)]'}`}>
                                {r.goal_km > 0 && r.achieved_km > 0 ? `${rate.toFixed(0)}%` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 일별 펼침 */}
                {isExpanded && (
                  <div className="border-t-2 border-[var(--accent)]/30 bg-[var(--sidebar-bg)]">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--accent)]">일별 기록 ({dailyLogs.length}건)</p>
                    </div>
                    {dailyLogs.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[var(--muted)] text-left">
                              <th className="py-2 px-4 font-medium text-xs">날짜</th>
                              <th className="py-2 px-4 font-medium text-xs">이름</th>
                              <th className="py-2 px-4 text-right font-medium text-xs">거리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyLogs.map((l, i) => (
                              <tr key={`${l.run_date}-${l.member_id}-${i}`} className="border-t border-[var(--card-border)]/50 hover:bg-[var(--card-border)]/20">
                                <td className="py-1.5 px-4 text-xs text-[var(--muted)] font-mono">{l.run_date}</td>
                                <td className="py-1.5 px-4 text-xs font-medium text-[var(--foreground)]">{getMemberName(l.member_id)}</td>
                                <td className="py-1.5 px-4 text-right text-xs font-mono font-semibold text-[var(--accent)]">{l.distance_km.toFixed(2)}km</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--muted)] px-4 pb-3">일별 기록 없음</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 일별 뷰 ===== */}
      {view === 'daily' && (
        <div className="space-y-4">
          {/* 멤버 필터 */}
          <select value={filterMember} onChange={(e) => { setFilterMember(e.target.value); setDailyPage(0); }}
            className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
            <option value="all">전체 멤버</option>
            {sorted.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--muted)] text-left bg-[var(--sidebar-bg)]">
                    <th className="py-3 px-4 font-medium text-xs">날짜</th>
                    <th className="py-3 px-4 font-medium text-xs">이름</th>
                    <th className="py-3 px-4 text-right font-medium text-xs">거리</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map((l, i) => (
                    <tr key={`${l.run_date}-${l.member_id}-${i}`} className="border-t border-[var(--card-border)] hover:bg-[var(--card-border)]/30">
                      <td className="py-2.5 px-4 font-mono text-xs text-[var(--muted)]">{l.run_date}</td>
                      <td className="py-2.5 px-4">
                        <Link href={`/member/${encodeURIComponent(getMemberName(l.member_id))}`}
                          className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)]">
                          {getMemberName(l.member_id)}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-[var(--accent)]">{l.distance_km.toFixed(2)}km</td>
                    </tr>
                  ))}
                  {pagedLogs.length === 0 && (
                    <tr><td colSpan={3} className="py-8 text-center text-sm text-[var(--muted)]">기록이 없습니다</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 페이징 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setDailyPage(p => Math.max(0, p - 1))} disabled={dailyPage === 0}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30">
                이전
              </button>
              <span className="text-xs text-[var(--muted)]">{dailyPage + 1} / {totalPages}</span>
              <button onClick={() => setDailyPage(p => Math.min(totalPages - 1, p + 1))} disabled={dailyPage >= totalPages - 1}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30">
                다음
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
