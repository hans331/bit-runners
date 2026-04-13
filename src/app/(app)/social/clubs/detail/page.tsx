'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { fetchClub, fetchClubMembers, joinClub, leaveClub, isClubMember } from '@/lib/social-data';
import { ArrowLeft, Users, LogIn, LogOut } from 'lucide-react';
import Link from 'next/link';
import type { Club, ClubMember } from '@/types';

function ClubDetail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const clubId = searchParams.get('id');

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const [clubData, membersData, memberStatus] = await Promise.all([
        fetchClub(clubId),
        fetchClubMembers(clubId),
        isClubMember(clubId),
      ]);
      setClub(clubData);
      setMembers(membersData);
      setIsMember(memberStatus);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleJoin = async () => {
    if (!clubId) return;
    setActionLoading(true);
    try { await joinClub(clubId); await loadData(); } catch {} finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    if (!clubId || !confirm('정말 클럽을 탈퇴하시겠습니까?')) return;
    setActionLoading(true);
    try { await leaveClub(clubId); await loadData(); } catch {} finally { setActionLoading(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" /></div>;
  }

  if (!club) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-[var(--muted)]">클럽을 찾을 수 없습니다.</p>
        <button onClick={() => router.back()} className="text-[var(--accent)] text-sm mt-4">뒤로가기</button>
      </div>
    );
  }

  const myRole = members.find((m) => m.user_id === user?.id)?.role;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/social/clubs" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-lg font-bold text-[var(--foreground)] flex-1 truncate">{club.name}</h1>
      </div>

      <div className="card p-6 text-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-3">
          {club.logo_url ? (
            <img src={club.logo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <Users size={32} className="text-[var(--accent)]" />
          )}
        </div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">{club.name}</h2>
        {club.description && <p className="text-sm text-[var(--muted)] mt-1">{club.description}</p>}
        <p className="text-sm text-[var(--accent)] font-semibold mt-2">멤버 {club.member_count}명</p>

        {!isMember ? (
          <button onClick={handleJoin} disabled={actionLoading} className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-50">
            <LogIn size={16} /> 클럽 가입
          </button>
        ) : myRole !== 'owner' ? (
          <button onClick={handleLeave} disabled={actionLoading} className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] font-semibold text-sm disabled:opacity-50">
            <LogOut size={16} /> 탈퇴
          </button>
        ) : (
          <p className="mt-3 text-xs text-[var(--accent)] font-semibold">클럽 오너</p>
        )}
      </div>

      <div className="card px-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)] pt-4 pb-2">멤버 ({members.length})</h3>
        <div className="divide-y divide-[var(--card-border)]">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-3 py-3">
              <Link href={`/profile/view?id=${member.user_id}`} className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[var(--card-border)] overflow-hidden">
                  {member.profile?.avatar_url ? (
                    <img src={member.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🏃🏻</div>
                  )}
                </div>
              </Link>
              <Link href={`/profile/view?id=${member.user_id}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{member.profile?.display_name ?? '러너'}</p>
                <p className="text-xs text-[var(--muted)]">{Number(member.profile?.total_distance_km ?? 0).toFixed(1)}km</p>
              </Link>
              {member.role !== 'member' && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  member.role === 'owner' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600'
                }`}>{member.role === 'owner' ? '오너' : '관리자'}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClubDetailPage() {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" /></div>}><ClubDetail /></Suspense>;
}
