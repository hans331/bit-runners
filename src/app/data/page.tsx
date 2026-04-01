'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useData, getGoalWithFallback } from '@/components/DataProvider';

export default function DataPage() {
  const { members, records, runningLogs, loading } = useData();
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '?';

  // 월 목록
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    runningLogs.forEach(l => {
      const d = new Date(l.run_date);
      set.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    });
    return Array.from(set).sort().reverse().map(k => {
      const [y, m] = k.split('-').map(Number);
      return { key: k, label: y === 2025 ? `'25.${m}월` : `'26.${m}월`, year: y, month: m };
    });
  }, [runningLogs]);

  // 통합 테이블 데이터: 날짜 | 이름 | 그날 거리 | 월 누적 | 총 누적 | 월 목표 | 달성률
  const tableData = useMemo(() => {
    let filtered = [...runningLogs];
    if (filterMember !== 'all') filtered = filtered.filter(l => l.member_id === filterMember);
    if (filterMonth !== 'all') {
      const [fy, fm] = filterMonth.split('-').map(Number);
      filtered = filtered.filter(l => {
        const d = new Date(l.run_date);
        return d.getFullYear() === fy && d.getMonth() + 1 === fm;
      });
    }

    // 날짜 내림차순 정렬
    filtered.sort((a, b) => b.run_date.localeCompare(a.run_date) || getMemberName(a.member_id).localeCompare(getMemberName(b.member_id), 'ko'));

    // 각 row에 누적 계산
    return filtered.map(l => {
      const d = new Date(l.run_date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const name = getMemberName(l.member_id);

      // 월 누적: 해당 월의 이 멤버 전체 로그 중 이 날짜 이전까지 합산
      const monthCumulative = runningLogs
        .filter(r => r.member_id === l.member_id && new Date(r.run_date).getFullYear() === year && new Date(r.run_date).getMonth() + 1 === month && r.run_date <= l.run_date)
        .reduce((s, r) => s + r.distance_km, 0);

      // 총 누적: 이 멤버의 모든 monthly_records 합 + 현재 월 로그 기반
      const prevMonthsTotal = records
        .filter(r => r.member_id === l.member_id && (r.year < year || (r.year === year && r.month < month)))
        .reduce((s, r) => s + r.achieved_km, 0);
      const totalCumulative = prevMonthsTotal + monthCumulative;

      // 월 목표
      const { goal, isFallback } = getGoalWithFallback(records, l.member_id, year, month);
      const rate = goal > 0 ? (monthCumulative / goal) * 100 : 0;

      return {
        id: `${l.run_date}-${l.member_id}-${l.id}`,
        date: l.run_date,
        memberId: l.member_id,
        name,
        distance: l.distance_km,
        monthCumulative,
        totalCumulative,
        goal,
        isFallback,
        rate,
        year,
        month,
      };
    });
  }, [runningLogs, records, members, filterMember, filterMonth]);

  // 페이징
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const totalPages = Math.ceil(tableData.length / PAGE_SIZE);
  const pagedData = tableData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-6"><div className="card animate-pulse h-96" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>대시보드
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">러닝 데이터</h1>
        <span className="text-xs text-[var(--muted)]">{tableData.length}건</span>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center !p-4">
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{runningLogs.length}</p>
          <p className="text-[10px] text-[var(--muted)]">총 러닝 기록</p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{new Set(runningLogs.map(l => l.run_date)).size}</p>
          <p className="text-[10px] text-[var(--muted)]">활동 일수</p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{members.filter(m => m.status === 'active').length}</p>
          <p className="text-[10px] text-[var(--muted)]">활동 멤버</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setPage(0); }}
          className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
          <option value="all">전체 월</option>
          {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <select value={filterMember} onChange={(e) => { setFilterMember(e.target.value); setPage(0); }}
          className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
          <option value="all">전체 멤버</option>
          {sorted.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* 데이터 테이블 */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-[var(--muted)] text-left bg-[var(--sidebar-bg)] border-b border-[var(--card-border)]">
                <th className="py-3 px-3 font-medium text-xs sticky left-0 bg-[var(--sidebar-bg)]">날짜</th>
                <th className="py-3 px-3 font-medium text-xs">이름</th>
                <th className="py-3 px-3 text-right font-medium text-xs">그날 거리</th>
                <th className="py-3 px-3 text-right font-medium text-xs">월 누적</th>
                <th className="py-3 px-3 text-right font-medium text-xs">총 누적</th>
                <th className="py-3 px-3 text-right font-medium text-xs">월 목표</th>
                <th className="py-3 px-3 text-right font-medium text-xs">달성률</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((row, i) => {
                const isFinisher = row.goal > 0 && row.monthCumulative >= row.goal;
                return (
                  <tr key={row.id} className="border-t border-[var(--card-border)] hover:bg-[var(--card-border)]/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs text-[var(--muted)] sticky left-0 bg-[var(--background)]">{row.date}</td>
                    <td className="py-2.5 px-3">
                      <Link href={`/member/${encodeURIComponent(row.name)}`}
                        className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)]">{row.name}</Link>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-[var(--accent)]">
                      +{row.distance.toFixed(2)}km
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-[var(--foreground)]">
                      {row.monthCumulative.toFixed(1)}km
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-[var(--muted)]">
                      {row.totalCumulative.toFixed(0)}km
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono text-xs ${row.isFallback ? 'text-[var(--muted)] opacity-40' : 'text-[var(--muted)]'}`}>
                      {row.goal > 0 ? `${row.goal}km` : '-'}
                      {row.isFallback && <span className="text-[8px] ml-0.5">(전월)</span>}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono text-xs font-semibold ${
                      isFinisher ? 'text-emerald-600 dark:text-emerald-400' :
                      row.rate >= 80 ? 'text-amber-600 dark:text-amber-400' :
                      'text-[var(--muted)]'
                    }`}>
                      {row.goal > 0 ? `${row.rate.toFixed(0)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
              {pagedData.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-[var(--muted)]">기록이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이징 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(0)} disabled={page === 0}
            className="px-2 py-1.5 text-xs rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] disabled:opacity-30">처음</button>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] disabled:opacity-30">이전</button>
          <span className="text-xs text-[var(--muted)] px-2">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] disabled:opacity-30">다음</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
            className="px-2 py-1.5 text-xs rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] disabled:opacity-30">마지막</button>
        </div>
      )}
    </div>
  );
}
