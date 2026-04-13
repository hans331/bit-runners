'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getMyClubs } from '@/lib/social-data';
import { fetchClubMemberProgress, type MemberProgress } from '@/lib/stats-data';
import { ArrowLeft, Trophy, Users, Flag } from 'lucide-react';
import Link from 'next/link';
import type { Club } from '@/types';

// 러너 아이콘 이모지들
const RUNNER_EMOJIS = ['🏃🏻', '🏃🏻‍♀️', '🏃🏽', '🏃🏽‍♀️', '🏃🏿', '🏃🏿‍♀️'];

function RunnerRace({ members }: { members: MemberProgress[] }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users size={48} className="mx-auto mb-4 text-[var(--muted)]" />
        <p className="text-sm text-[var(--muted)]">클럽에 가입하면 멤버들의 진행 상황을 볼 수 있어요</p>
        <Link href="/social/clubs" className="text-sm text-[var(--accent)] font-semibold mt-2 inline-block">클럽 둘러보기</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m, i) => {
        const emoji = RUNNER_EMOJIS[i % RUNNER_EMOJIS.length];
        const isFinished = m.progress >= 100;

        return (
          <div key={m.user_id} className="card p-4">
            {/* 러너 정보 */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">{emoji}</div>
                )}
              </div>
              <span className="text-sm font-semibold text-[var(--foreground)] flex-1 truncate">{m.display_name}</span>
              <span className="text-xs text-[var(--muted)]">
                {m.distance_km.toFixed(1)}/{m.goal_km > 0 ? m.goal_km : '?'}km
              </span>
              {isFinished && <span className="text-xs">🏅</span>}
            </div>

            {/* 트랙 */}
            <div className="relative h-10 bg-[var(--card-border)]/50 rounded-full overflow-hidden">
              {/* 트랙 라인 */}
              <div className="absolute inset-y-0 left-0 right-0 flex items-center px-2">
                <div className="w-full h-0.5 bg-[var(--card-border)] rounded-full" />
              </div>

              {/* 골 플래그 */}
              <div className="absolute right-2 inset-y-0 flex items-center">
                <Flag size={14} className={isFinished ? 'text-green-500' : 'text-[var(--muted)]'} />
              </div>

              {/* 러너 (애니메이션) */}
              <div
                className="absolute inset-y-0 flex items-center transition-all ease-out"
                style={{
                  left: animated ? `calc(${Math.min(m.progress, 95)}% - 16px)` : '0px',
                  transitionDuration: `${1000 + i * 200}ms`,
                }}
              >
                <span className="text-xl" style={{ transform: 'scaleX(-1)' }}>{emoji}</span>
              </div>

              {/* 진행 바 배경 */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all ease-out"
                style={{
                  width: animated ? `${m.progress}%` : '0%',
                  transitionDuration: `${1000 + i * 200}ms`,
                  background: isFinished
                    ? 'linear-gradient(90deg, #22c55e33, #22c55e55)'
                    : `linear-gradient(90deg, rgba(59,130,246,0.1), rgba(59,130,246,0.2))`,
                }}
              />
            </div>

            {/* 퍼센트 */}
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[var(--muted)]">0km</span>
              <span className={`text-xs font-bold ${isFinished ? 'text-green-500' : 'text-[var(--accent)]'}`}>
                {m.progress.toFixed(0)}%
              </span>
              <span className="text-[10px] text-[var(--muted)]">{m.goal_km > 0 ? `${m.goal_km}km` : '목표 없음'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    if (!user) return;
    getMyClubs().then((c) => {
      setClubs(c);
      if (c.length > 0) setSelectedClub(c[0].id);
    });
  }, [user]);

  const loadProgress = useCallback(async () => {
    if (!selectedClub) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchClubMemberProgress(selectedClub, year, month);
      setMembers(data);
    } catch {} finally { setLoading(false); }
  }, [selectedClub, year, month]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-lg font-bold text-[var(--foreground)] flex-1">이달의 레이스</h1>
        <Link href="/stats/charts" className="text-xs text-[var(--accent)] font-semibold">차트 보기</Link>
      </div>

      {/* 기간 */}
      <div className="text-center mb-4">
        <p className="text-2xl font-extrabold text-[var(--foreground)]">{year}년 {month}월</p>
        <p className="text-sm text-[var(--muted)]">목표를 향해 달려볼까요? 🏁</p>
      </div>

      {/* 클럽 선택 */}
      {clubs.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {clubs.map((club) => (
            <button
              key={club.id}
              onClick={() => setSelectedClub(club.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedClub === club.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card)] text-[var(--muted)]'
              }`}
            >
              {club.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : (
        <RunnerRace members={members} />
      )}

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-6 text-xs text-[var(--muted)]">
        <span>🏅 = 목표 달성</span>
        <span><Flag size={12} className="inline" /> = 골인 지점</span>
      </div>
    </div>
  );
}
