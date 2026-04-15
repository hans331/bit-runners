'use client';

import { useState } from 'react';
import Link from 'next/link';
import StatsCards from '@/components/dashboard/StatsCards';
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart';
import FinisherHistory from '@/components/dashboard/FinisherHistory';
import MemberGrowthChart from '@/components/dashboard/MemberGrowthChart';
import AllTimeRanking from '@/components/dashboard/AllTimeRanking';
import Leaderboard from '@/components/dashboard/Leaderboard';
import GoalProgress from '@/components/dashboard/GoalProgress';
import RunCountChart from '@/components/dashboard/RunCountChart';
import MonthSelector from '@/components/dashboard/MonthSelector';

export default function HistoryPage() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(3);

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            대시보드
          </Link>
          <h2 className="text-base md:text-lg font-bold text-[var(--foreground)]">히스토리</h2>
        </div>
        <MonthSelector
          year={selectedYear}
          month={selectedMonth}
          onChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }}
        />
      </div>

      {/* 선택 월 요약 */}
      <StatsCards year={selectedYear} month={selectedMonth} />

      {/* 선택 월 리더보드 + 달성률 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <Leaderboard year={selectedYear} month={selectedMonth} />
        <GoalProgress year={selectedYear} month={selectedMonth} />
      </div>

      {/* 선택 월 러닝 횟수 */}
      <RunCountChart year={selectedYear} month={selectedMonth} />

      {/* 통산 랭킹 */}
      <AllTimeRanking />

      {/* 전체 추이 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <MonthlyTrendChart />
        <FinisherHistory />
      </div>

      <MemberGrowthChart />
    </div>
  );
}
