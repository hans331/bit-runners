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
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(3);

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5 md:space-y-6">
      <StatsCards />

      <div className="flex items-center justify-between">
        <h2 className="text-base md:text-lg font-bold text-[var(--foreground)]">월간 리포트</h2>
        <MonthSelector
          year={selectedYear}
          month={selectedMonth}
          onChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <Leaderboard year={selectedYear} month={selectedMonth} />
        <GoalProgress year={selectedYear} month={selectedMonth} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <MonthlyTrendChart />
        <FinisherHistory />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2">
          <MemberGrowthChart />
        </div>
        <AllTimeRanking />
      </div>
    </div>
  );
}
