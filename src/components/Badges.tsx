'use client';

interface BadgeProps {
  finisherCount: number;
  longRunCount: number;
  attendanceCount: number;
  totalRuns: number;
  compact?: boolean;
}

export default function Badges({ finisherCount, longRunCount, attendanceCount, totalRuns, compact }: BadgeProps) {
  const badges = [
    { icon: '🏅', label: '피니셔', count: finisherCount, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
    { icon: '🏆', label: '롱런', count: longRunCount, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
    { icon: '🔥', label: '개근', count: attendanceCount, color: 'text-red-500 dark:text-red-400 bg-red-500/10' },
  ].filter(b => b.count > 0);

  if (badges.length === 0) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-0.5 ml-1">
        {badges.map(b => (
          <span key={b.label} className="inline-flex items-center text-sm gap-0" title={`${b.label} ${b.count}회`}>
            <span>{b.icon}</span>
            {b.count > 1 && <span className="text-sm font-bold text-[var(--muted)]">x{b.count}</span>}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {badges.map(b => (
        <span key={b.label} className={`inline-flex items-center gap-1 text-sm font-semibold ${b.color} px-2 py-0.5 rounded-full`}>
          <span>{b.icon}</span>
          <span>{b.label}</span>
          <span className="font-bold">x{b.count}</span>
        </span>
      ))}
      <span className="text-sm text-[var(--muted)]" title="총 러닝 횟수">
        👟 {totalRuns}회
      </span>
    </div>
  );
}
