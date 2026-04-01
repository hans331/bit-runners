'use client';

import StatsCards from '@/components/dashboard/StatsCards';
import Leaderboard from '@/components/dashboard/Leaderboard';
import GoalProgress from '@/components/dashboard/GoalProgress';
import AllTimeRanking from '@/components/dashboard/AllTimeRanking';
import RunCalendar from '@/components/dashboard/RunCalendar';
import RunCountChart from '@/components/dashboard/RunCountChart';
import Link from 'next/link';

export default function Dashboard() {
  // 현재 진행중인 달 (4월)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base md:text-lg font-bold text-[var(--foreground)]">{month}월 진행 현황</h2>
          <p className="text-[11px] text-[var(--muted)]">실시간 업데이트</p>
        </div>
        <Link href="/history" className="text-sm text-[var(--accent)] hover:underline font-medium">
          히스토리 →
        </Link>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <Leaderboard year={year} month={month} />
        <GoalProgress year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <RunCalendar />
        <RunCountChart year={year} month={month} />
      </div>

      <AllTimeRanking />
    </div>
  );
}
