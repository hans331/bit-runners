'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { addActivity } from '@/lib/routinist-data';
import { useRouter } from 'next/navigation';

export default function LogPage() {
  const { user } = useAuth();
  const { refresh } = useUserData();
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [distance, setDistance] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !distance) return;

    const distanceKm = parseFloat(distance);
    if (isNaN(distanceKm) || distanceKm <= 0) {
      setError('올바른 거리를 입력해주세요.');
      return;
    }

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    const durationSeconds = (h * 3600 + m * 60 + s) || undefined;

    setSaving(true);
    setError(null);

    try {
      await addActivity(user.id, date, distanceKm, durationSeconds, memo || undefined);
      await refresh();
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <h2 className="text-xl font-extrabold text-[var(--foreground)] mb-6">러닝 기록 입력</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* 거리 */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">거리 (km)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="5.00"
            className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* 시간 */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">시간 (선택)</label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-base text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">시</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="30"
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-base text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">분</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                placeholder="00"
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-base text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">초</span>
            </div>
          </div>
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 러닝은 어땠나요?"
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-base resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving || !distance}
          className="w-full bg-[var(--accent)] hover:opacity-90 text-white font-semibold py-4 rounded-2xl transition-all text-base disabled:opacity-50"
        >
          {saving ? '저장 중...' : '기록 저장'}
        </button>
      </form>
    </div>
  );
}
