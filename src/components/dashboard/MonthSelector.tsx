'use client';

import { getClubMonthlyTotals } from '@/lib/data';

interface Props {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export default function MonthSelector({ year, month, onChange }: Props) {
  const months = getClubMonthlyTotals().filter(d => d.total > 0);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">월 선택:</span>
      <select
        value={`${year}-${month}`}
        onChange={(e) => {
          const [y, m] = e.target.value.split('-').map(Number);
          onChange(y, m);
        }}
        className="bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {months.map((m) => (
          <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
