'use client';

import StatsCards from '@/components/dashboard/StatsCards';
import Leaderboard from '@/components/dashboard/Leaderboard';
import GoalProgress from '@/components/dashboard/GoalProgress';
import RunCalendar from '@/components/dashboard/RunCalendar';
import RunCountChart from '@/components/dashboard/RunCountChart';
import Link from 'next/link';

export default function Dashboard() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return (
    <div className="max-w-3xl lg:max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-[var(--foreground)]">{month}월 대시보드</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">실시간 업데이트</p>
        </div>
        <Link href="/history" className="text-sm text-[var(--accent)] hover:underline font-semibold px-3 py-2 rounded-xl hover:bg-[var(--accent)]/5 transition-colors">
          히스토리 →
        </Link>
      </div>

      <StatsCards year={year} month={month} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <Leaderboard year={year} month={month} />
        <GoalProgress year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <RunCalendar />
        <RunCountChart year={year} month={month} />
      </div>
    </div>
  );
}
