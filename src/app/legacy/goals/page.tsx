'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useData, getGoalWithFallback } from '@/components/DataProvider';
import { setMonthlyGoal } from '@/lib/supabase-data';

export default function GoalsPage() {
  const { members, records, refresh, loading } = useData();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [saving, setSaving] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-6"><div className="card animate-pulse h-96" /></div>;

  const activeMembers = members
    .filter(m => m.status === 'active')
    .sort((a, b) => a.member_number - b.member_number);

  const handleSave = async (memberId: string, name: string) => {
    const val = editValues[memberId];
    if (!val || isNaN(Number(val))) return;
    setSaving(memberId);
    try {
      await setMonthlyGoal(memberId, year, month, Number(val));
      await refresh();
      setSuccessMsg(`${name} ${month}월 목표: ${val}km 저장`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditValues(prev => { const n = { ...prev }; delete n[memberId]; return n; });
    } catch (e) {
      console.error(e);
      setSuccessMsg('저장 실패');
    }
    setSaving(null);
  };

  const handleSaveAll = async () => {
    setSaving('all');
    let count = 0;
    for (const m of activeMembers) {
      const val = editValues[m.id];
      if (val && !isNaN(Number(val)) && Number(val) > 0) {
        await setMonthlyGoal(m.id, year, month, Number(val));
        count++;
      }
    }
    await refresh();
    setEditValues({});
    setSuccessMsg(`${count}명 목표 저장 완료`);
    setTimeout(() => setSuccessMsg(''), 3000);
    setSaving(null);
  };

  // 전월 목표 일괄 복사
  const copyPrevMonth = () => {
    const newValues: Record<string, string> = {};
    for (const m of activeMembers) {
      const { goal } = getGoalWithFallback(records, m.id, year, month);
      const currentRec = records.find(r => r.member_id === m.id && r.year === year && r.month === month);
      if ((!currentRec || currentRec.goal_km === 0) && goal > 0) {
        newValues[m.id] = String(goal);
      }
    }
    setEditValues(prev => ({ ...prev, ...newValues }));
  };

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>대시보드
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">월 목표 설정</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); setEditValues({}); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--card-border)] text-[var(--muted)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-semibold text-[var(--foreground)] w-20 text-center">{year}.{month}월</span>
          <button onClick={() => { if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1); setEditValues({}); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--card-border)] text-[var(--muted)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {successMsg && <div className="bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-3 text-center"><p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">{successMsg}</p></div>}

      <div className="flex gap-2">
        <button onClick={copyPrevMonth}
          className="text-sm px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          전월 목표 복사
        </button>
        {Object.keys(editValues).length > 0 && (
          <button onClick={handleSaveAll} disabled={saving === 'all'}
            className="text-sm px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-medium disabled:opacity-50">
            {saving === 'all' ? '저장 중...' : `${Object.keys(editValues).length}명 일괄 저장`}
          </button>
        )}
      </div>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--muted)] text-left bg-[var(--sidebar-bg)] border-b border-[var(--card-border)]">
              <th className="py-3 px-4 font-medium text-sm">이름</th>
              <th className="py-3 px-4 text-right font-medium text-sm">전월 목표</th>
              <th className="py-3 px-4 text-right font-medium text-sm">현재 달성</th>
              <th className="py-3 px-4 text-center font-medium text-sm">{month}월 목표 (km)</th>
              <th className="py-3 px-4 text-center font-medium text-sm w-16"></th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.map(m => {
              const currentRec = records.find(r => r.member_id === m.id && r.year === year && r.month === month);
              const currentGoal = currentRec?.goal_km || 0;
              const achieved = currentRec?.achieved_km || 0;
              const { goal: fallbackGoal, isFallback } = getGoalWithFallback(records, m.id, year, month);
              const prevGoal = isFallback ? fallbackGoal : currentGoal;
              const editVal = editValues[m.id];
              const displayGoal = editVal !== undefined ? editVal : (currentGoal > 0 ? String(currentGoal) : '');

              return (
                <tr key={m.id} className="border-t border-[var(--card-border)] hover:bg-[var(--card-border)]/30">
                  <td className="py-2.5 px-4">
                    <Link href={`/member/${encodeURIComponent(m.name)}`} className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]">{m.name}</Link>
                  </td>
                  <td className="py-2.5 px-4 text-right text-sm font-mono text-[var(--muted)]">
                    {prevGoal > 0 ? `${prevGoal}km` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-sm font-mono font-semibold text-[var(--foreground)]">
                    {achieved > 0 ? `${achieved.toFixed(1)}km` : '-'}
                  </td>
                  <td className="py-2.5 px-4">
                    <input
                      type="number" min="0" step="10" placeholder={isFallback ? `${fallbackGoal}` : '목표'}
                      value={displayGoal}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [m.id]: e.target.value }))}
                      className={`w-full text-center bg-[var(--background)] border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                        currentGoal > 0 ? 'border-emerald-300 dark:border-emerald-600' : 'border-[var(--card-border)]'
                      } ${isFallback && !editVal ? 'text-[var(--muted)] opacity-50' : 'text-[var(--foreground)]'}`}
                    />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {editVal !== undefined && editVal !== String(currentGoal) && (
                      <button onClick={() => handleSave(m.id, m.name)} disabled={saving === m.id}
                        className="text-sm font-medium px-2 py-1 rounded-lg bg-[var(--accent)] text-white disabled:opacity-50">
                        {saving === m.id ? '...' : '저장'}
                      </button>
                    )}
                    {currentGoal > 0 && editVal === undefined && (
                      <span className="text-emerald-500 text-sm">✓</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
