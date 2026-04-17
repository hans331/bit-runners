'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClub } from '@/lib/social-data';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateClubPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const club = await createClub(name.trim(), description.trim());
      router.replace(`/social/clubs/detail?id=${club.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[클럽 생성 실패]', msg);
      if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('policy') || msg.includes('permission')) {
        setError(`DB 권한 정책 오류입니다.\n상세: ${msg}`);
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        setError('이미 같은 이름의 클럽이 있습니다.');
      } else {
        setError(`클럽 생성 실패: ${msg}`);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/social/clubs" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">클럽 만들기</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">클럽 이름 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="예: BIT Runners 서울"
            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">소개</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="클럽을 소개해주세요"
            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || creating}
          className="w-full py-3.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-base disabled:opacity-50"
        >
          {creating ? '생성 중...' : '클럽 만들기'}
        </button>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
