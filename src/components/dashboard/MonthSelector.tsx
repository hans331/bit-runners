'use client';

import { useData, getClubMonthlyTotals } from '@/components/DataProvider';

interface Props { year: number; month: number; onChange: (year: number, month: number) => void; }

export default function MonthSelector({ year, month, onChange }: Props) {
  const { records } = useData();
  const months = getClubMonthlyTotals(records).filter(d => d.total > 0);

  return (
    <select value={`${year}-${month}`} onChange={(e) => { const [y, m] = e.target.value.split('-').map(Number); onChange(y, m); }}
      className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors">
      {months.map(m => <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{m.label}</option>)}
    </select>
  );
}
