'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useData } from '@/components/DataProvider';
import { addRunningLog } from '@/lib/supabase-data';
import HealthSyncButton from '@/components/HealthSyncButton';

export default function LogPage() {
  const { members, refresh } = useData();
  const [selectedMember, setSelectedMember] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [memo, setMemo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sorted = [...members].filter(m => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !distance) return;
    setSubmitting(true);
    setError('');
    try {
      await addRunningLog(selectedMember, date, parseFloat(distance), duration ? parseInt(duration) : undefined, memo || undefined);
      await refresh();
      setSubmitted(true);
      setDistance('');
      setDuration('');
      setMemo('');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError('저장 실패. 다시 시도해주세요.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        대시보드
      </Link>
      <div className="text-center">
        <h1 className="text-xl font-bold text-[var(--foreground)]">러닝 기록 입력</h1>
        <p className="text-sm text-[var(--muted)] mt-1">달린 후 바로 기록하세요</p>
      </div>
      {/* 건강 데이터 자동 동기화 */}
      {selectedMember && (
        <HealthSyncButton userId={selectedMember} onSyncComplete={refresh} />
      )}
      {!selectedMember && (
        <HealthSyncButton userId="" onSyncComplete={refresh} />
      )}

      <div className="relative flex items-center gap-3 my-2">
        <div className="flex-1 border-t border-[var(--card-border)]" />
        <span className="text-xs text-[var(--muted)] font-medium">또는 직접 입력</span>
        <div className="flex-1 border-t border-[var(--card-border)]" />
      </div>

      {submitted && <div className="bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-3 text-center"><p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">저장 완료! 대시보드에 반영됩니다.</p></div>}
      {error && <div className="bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-3 text-center"><p className="text-red-600 dark:text-red-400 font-medium text-sm">{error}</p></div>}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">이름 *</label>
          <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} required
            className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
            <option value="">선택</option>
            {sorted.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">날짜 *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">거리 (km) *</label>
          <input type="number" step="0.01" min="0" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="5.23" required
            className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">시간 (분) <span className="text-[var(--muted)] font-normal">선택</span></label>
          <input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="32"
            className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">메모 <span className="text-[var(--muted)] font-normal">선택</span></label>
          <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="한강 야간 러닝"
            className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
        <button type="submit" disabled={submitting}
          className="w-full bg-[var(--accent)] hover:opacity-90 text-white font-semibold py-3.5 rounded-xl transition-all text-base shadow-sm disabled:opacity-50">
          {submitting ? '저장 중...' : '기록 저장'}
        </button>
      </form>
    </div>
  );
}
