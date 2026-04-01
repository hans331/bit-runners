'use client';

import { useState } from 'react';
import StatsCards from '@/components/dashboard/StatsCards';
import Leaderboard from '@/components/dashboard/Leaderboard';
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart';
import GoalProgress from '@/components/dashboard/GoalProgress';
import AllTimeRanking from '@/components/dashboard/AllTimeRanking';
import MemberGrowthChart from '@/components/dashboard/MemberGrowthChart';
import FinisherHistory from '@/components/dashboard/FinisherHistory';
import MonthSelector from '@/components/dashboard/MonthSelector';

export default function Dashboard() {
  // 2월(가장 최근 완료 데이터가 있는 달)을 기본으로 표시
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(2);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 요약 카드 */}
      <StatsCards />

      {/* 월 선택 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">월간 리포트</h2>
        <MonthSelector
          year={selectedYear}
          month={selectedMonth}
          onChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }}
        />
      </div>

      {/* 리더보드 + 목표달성률 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Leaderboard year={selectedYear} month={selectedMonth} />
        <GoalProgress year={selectedYear} month={selectedMonth} />
      </div>

      {/* 클럽 추이 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyTrendChart />
        <FinisherHistory />
      </div>

      {/* 멤버별 추이 + 통산 랭킹 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MemberGrowthChart />
        </div>
        <AllTimeRanking />
      </div>
    </div>
  );
}
