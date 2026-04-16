'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  fetchClub, fetchClubMembers, joinClub, leaveClub, isClubMember,
  getMyClubRole, updateMemberRole, removeMember, updateClub, fetchClubActivities,
} from '@/lib/social-data';
import {
  fetchClubMemberProgress, fetchClubSummary, fetchMemberRunCounts, fetchCumulativeRanking, fetchHallOfFame,
  type MemberProgress, type ClubSummary, type MemberRunCount, type CumulativeRanking, type HallOfFameEntry,
} from '@/lib/stats-data';
import { formatPace, formatDuration } from '@/lib/routinist-data';
import { ArrowLeft, Users, LogIn, LogOut, Share2, Shield, ShieldOff, UserMinus, Settings, Activity, Crown, Copy, Check, TrendingUp, Zap, Trophy, Flame, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Club, ClubMember } from '@/types';
import AppLogo from '@/components/AppLogo';

type TabId = 'dashboard' | 'members' | 'activity' | 'settings';

function ClubDetail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const clubId = searchParams.get('id');

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [copied, setCopied] = useState(false);

  // 대시보드 데이터
  const [dashSummary, setDashSummary] = useState<ClubSummary | null>(null);
  const [dashMembers, setDashMembers] = useState<MemberProgress[]>([]);
  const [dashRunCounts, setDashRunCounts] = useState<MemberRunCount[]>([]);
  const [dashCumulative, setDashCumulative] = useState<CumulativeRanking[]>([]);
  const [dashHallOfFame, setDashHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  // 설정 상태
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const [clubData, membersData, memberStatus, role] = await Promise.all([
        fetchClub(clubId),
        fetchClubMembers(clubId),
        isClubMember(clubId),
        getMyClubRole(clubId),
      ]);
      setClub(clubData);
      setMembers(membersData);
      setIsMember(memberStatus);
      setMyRole(role);
      if (clubData) {
        setEditName(clubData.name);
        setEditDesc(clubData.description || '');
        setEditPublic(clubData.is_public);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { loadData(); }, [loadData]);

  // 활동 탭 진입 시 로드
  useEffect(() => {
    if (activeTab === 'activity' && clubId && activities.length === 0) {
      fetchClubActivities(clubId).then(setActivities).catch(() => {});
    }
  }, [activeTab, clubId, activities.length]);

  // 대시보드 탭 진입 시 클럽 통계 로드
  const now = new Date();
  const dashYear = now.getFullYear();
  const dashMonth = now.getMonth() + 1;

  useEffect(() => {
    if (activeTab !== 'dashboard' || !clubId) return;
    setDashLoading(true);
    Promise.allSettled([
      fetchClubSummary(clubId, dashYear, dashMonth),
      fetchClubMemberProgress(clubId, dashYear, dashMonth),
      fetchMemberRunCounts(clubId, dashYear, dashMonth),
      fetchCumulativeRanking(clubId),
      fetchHallOfFame(clubId, dashYear, dashMonth),
    ]).then(results => {
      if (results[0].status === 'fulfilled' && results[0].value) setDashSummary(results[0].value);
      if (results[1].status === 'fulfilled') setDashMembers(results[1].value);
      if (results[2].status === 'fulfilled') setDashRunCounts(results[2].value);
      if (results[3].status === 'fulfilled') setDashCumulative(results[3].value);
      if (results[4].status === 'fulfilled') setDashHallOfFame(results[4].value);
    }).finally(() => setDashLoading(false));
  }, [activeTab, clubId, dashYear, dashMonth]);

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

  const handleCopyInvite = () => {
    const url = `${window.location.origin}/social/clubs/detail?id=${clubId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    if (!clubId) return;
    try {
      await updateMemberRole(clubId, userId, newRole);
      await loadData();
    } catch {}
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!clubId || !confirm(`${name}님을 클럽에서 추방하시겠습니까?`)) return;
    try {
      await removeMember(clubId, userId);
      await loadData();
    } catch {}
  };

  const handleSaveSettings = async () => {
    if (!clubId || !editName.trim()) return;
    setSaving(true);
    try {
      await updateClub(clubId, { name: editName.trim(), description: editDesc.trim() || undefined, is_public: editPublic });
      await loadData();
    } catch {} finally {
      setSaving(false);
    }
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

  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: 'dashboard', label: '대시보드', show: isMember },
    { id: 'members', label: `멤버 (${members.length})`, show: true },
    { id: 'activity', label: '활동', show: isMember },
    { id: 'settings', label: '설정', show: isAdmin },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/social" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)] flex-1 truncate">{club.name}</h1>
        {isMember && (
          <button onClick={handleCopyInvite} className="text-[var(--accent)] p-2">
            {copied ? <Check size={20} /> : <Share2 size={20} />}
          </button>
        )}
      </div>

      {/* 클럽 카드 */}
      <div className="card p-6 text-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-3">
          {club.logo_url ? (
            <img src={club.logo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <Users size={32} className="text-[var(--accent)]" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-[var(--foreground)]">{club.name}</h2>
        {club.description && <p className="text-xs text-[var(--muted)] mt-1">{club.description}</p>}
        <p className="text-sm text-[var(--accent)] font-semibold mt-2">멤버 {club.member_count}명</p>

        {!isMember ? (
          <button onClick={handleJoin} disabled={actionLoading} className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-50">
            <LogIn size={16} /> 클럽 가입
          </button>
        ) : myRole === 'owner' ? (
          <p className="mt-3 text-sm text-[var(--accent)] font-semibold flex items-center justify-center gap-1"><Crown size={14} /> 클럽 오너</p>
        ) : (
          <button onClick={handleLeave} disabled={actionLoading} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] font-semibold text-sm disabled:opacity-50">
            <LogOut size={14} /> 탈퇴
          </button>
        )}
      </div>

      {/* 초대 링크 배너 */}
      {isMember && (
        <button
          onClick={handleCopyInvite}
          className="w-full card p-3 mb-4 flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-[var(--accent)]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {copied ? '복사됨!' : '초대 링크 복사'}
            </p>
            <p className="text-xs text-[var(--muted)] truncate">링크를 친구에게 보내면 바로 가입할 수 있어요</p>
          </div>
        </button>
      )}

      {/* 탭 */}
      <div className="flex bg-[var(--card)] rounded-xl p-1 mb-4">
        {tabs.filter(t => t.show).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 대시보드 탭 */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {dashLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* 요약 카드 */}
              {dashSummary && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-4">
                    <p className="text-xs text-[var(--muted)]">클럽 총 거리</p>
                    <p className="text-3xl font-extrabold text-[var(--accent)]">{dashSummary.totalDistance.toFixed(0)}<span className="text-base ml-1">km</span></p>
                    <p className="text-xs text-[var(--muted)]">{dashSummary.activeMembers}명 활동</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-xs text-[var(--muted)]">인당 평균</p>
                    <p className="text-3xl font-extrabold text-green-600">{dashSummary.avgDistance.toFixed(1)}<span className="text-base ml-1">km</span></p>
                    <p className="text-xs text-[var(--muted)]">활동 멤버 기준</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-xs text-[var(--muted)]">총 러닝</p>
                    <p className="text-3xl font-extrabold text-purple-600">{dashSummary.totalRuns}<span className="text-base ml-1">회</span></p>
                    <p className="text-xs text-[var(--muted)]">{dashSummary.daysRemaining > 0 ? `D-${dashSummary.daysRemaining}` : '이달 완료'}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-xs text-[var(--muted)]">활동 멤버</p>
                    <p className="text-3xl font-extrabold text-orange-600">{dashSummary.activeMembers}<span className="text-base ml-1">명</span></p>
                    <p className="text-xs text-[var(--muted)]">전체 {dashSummary.totalMembers}명</p>
                  </div>
                </div>
              )}

              {/* 거리 순위 */}
              {dashMembers.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-3">{dashMonth}월 거리 순위</h3>
                  <div className="space-y-2">
                    {[...dashMembers].sort((a, b) => b.distance_km - a.distance_km).map((m, i) => {
                      const maxDist = dashMembers[0] ? Math.max(...dashMembers.map(x => x.distance_km)) : 1;
                      const barW = maxDist > 0 ? (m.distance_km / maxDist) * 100 : 0;
                      return (
                        <div key={m.user_id} className="flex items-center gap-2">
                          <span className="w-5 text-sm font-bold text-center flex-shrink-0">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
                          <span className="w-14 text-sm truncate flex-shrink-0 font-medium text-[var(--foreground)]">{m.display_name}</span>
                          <div className="flex-1 h-5 bg-[var(--card-border)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${m.progress >= 100 ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'}`}
                              style={{ width: `${Math.max(barW, 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--foreground)] font-semibold w-16 text-right">{m.distance_km.toFixed(1)}km</span>
                          {m.progress >= 100 && <span className="text-sm">✅</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 목표 달성률 */}
              {dashMembers.filter(m => m.goal_km > 0).length > 0 && (
                <div className="card p-5">
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-3">{dashMonth}월 목표 달성률</h3>
                  <div className="space-y-2.5">
                    {[...dashMembers].filter(m => m.goal_km > 0).sort((a, b) => b.progress - a.progress).map(m => (
                      <div key={m.user_id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--foreground)]">{m.display_name}</span>
                          <span className="text-xs text-[var(--muted)]">{m.distance_km.toFixed(1)} / {m.goal_km}km</span>
                        </div>
                        <div className="h-4 bg-[var(--card-border)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${m.progress >= 100 ? 'bg-green-500' : m.progress >= 50 ? 'bg-blue-500' : 'bg-blue-300'}`}
                            style={{ width: `${Math.min(m.progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-right text-[var(--muted)] mt-0.5">{m.progress.toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 러닝 횟수 */}
              {dashRunCounts.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-3">{dashMonth}월 러닝 횟수</h3>
                  <div className="space-y-1.5">
                    {dashRunCounts.map(m => {
                      const maxC = Math.max(...dashRunCounts.map(x => x.run_count));
                      const barW = maxC > 0 ? (m.run_count / maxC) * 100 : 0;
                      return (
                        <div key={m.user_id} className="flex items-center gap-2">
                          <span className="w-14 text-sm truncate flex-shrink-0">{m.display_name}</span>
                          <div className="flex-1 h-4 bg-[var(--card-border)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500" style={{ width: `${Math.max(barW, 4)}%` }} />
                          </div>
                          <span className="text-xs font-semibold w-8 text-right">{m.run_count}회</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 통산 누적 랭킹 */}
              {dashCumulative.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-3">통산 누적 랭킹</h3>
                  <div className="space-y-1.5">
                    {dashCumulative.map((m, i) => {
                      const maxD = dashCumulative[0]?.total_distance_km || 1;
                      const barW = (m.total_distance_km / maxD) * 100;
                      return (
                        <div key={m.user_id} className="flex items-center gap-2">
                          <span className="w-5 text-sm font-bold text-center">{i <= 2 ? ['🥇','🥈','🥉'][i] : i + 1}</span>
                          <span className="w-14 text-sm truncate flex-shrink-0">{m.display_name}</span>
                          <div className="flex-1 h-4 bg-[var(--card-border)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${Math.max(barW, 4)}%` }} />
                          </div>
                          <span className="text-xs font-semibold w-16 text-right">{m.total_distance_km.toFixed(0)}km</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 명예의 전당 */}
              {dashHallOfFame.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-4">명예의 전당</h3>
                  <div className="space-y-4">
                    {dashHallOfFame.map(cat => (
                      <div key={cat.category} className="bg-[var(--card-border)]/20 rounded-xl p-4">
                        <p className="text-sm font-bold text-[var(--accent)] mb-2">{cat.emoji} {cat.label}</p>
                        <p className="text-xs text-[var(--muted)] mb-2">{cat.description}</p>
                        <div className="space-y-1">
                          {cat.winners.map((w, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-sm text-[var(--foreground)]">
                                {i <= 2 ? ['🥇','🥈','🥉'][i] : `${i + 1}`} {w.display_name}
                              </span>
                              <span className="text-sm font-semibold text-[var(--accent)]">{w.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 히스토리 전체 보기 */}
              <Link href="/history" className="card p-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--foreground)]">전체 히스토리 보기</span>
                <ChevronRight size={16} className="text-[var(--accent)]" />
              </Link>
            </>
          )}
        </div>
      )}

      {/* 멤버 탭 */}
      {activeTab === 'members' && (
        <div className="card px-4">
          <div className="divide-y divide-[var(--card-border)]">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center gap-3 py-3">
                <Link href={`/profile/view?id=${member.user_id}`} className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--card-border)] overflow-hidden">
                    {member.profile?.avatar_url ? (
                      <img src={member.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><AppLogo size={24} /></div>
                    )}
                  </div>
                </Link>
                <Link href={`/profile/view?id=${member.user_id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">{member.profile?.display_name ?? '러너'}</p>
                  <p className="text-xs text-[var(--muted)]">{Number(member.profile?.total_distance_km ?? 0).toFixed(1)}km · {member.profile?.total_runs ?? 0}회</p>
                </Link>
                {member.role !== 'member' && (
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                    member.role === 'owner' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600'
                  }`}>{member.role === 'owner' ? '오너' : '관리자'}</span>
                )}
                {/* 관리자 액션 */}
                {isAdmin && member.user_id !== user?.id && member.role !== 'owner' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleRoleChange(member.user_id, member.role === 'admin' ? 'member' : 'admin')}
                      title={member.role === 'admin' ? '관리자 해제' : '관리자 지정'}
                      className="p-1.5 rounded-lg hover:bg-[var(--card-border)] text-[var(--muted)]"
                    >
                      {member.role === 'admin' ? <ShieldOff size={14} /> : <Shield size={14} />}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.user_id, member.profile?.display_name ?? '러너')}
                      title="추방"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 활동 탭 */}
      {activeTab === 'activity' && (
        <div className="space-y-2">
          {activities.length === 0 ? (
            <div className="card p-8 text-center">
              <Activity size={32} className="mx-auto mb-2 text-[var(--muted)]" />
              <p className="text-xs text-[var(--muted)]">아직 클럽 활동이 없습니다</p>
            </div>
          ) : (
            activities.map((a: any) => (
              <Link key={a.id} href={`/activity?id=${a.id}`} className="card p-4 flex items-center gap-3 block">
                <div className="w-9 h-9 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
                  {a.profiles?.avatar_url ? (
                    <img src={a.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><AppLogo size={18} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {a.profiles?.display_name ?? '러너'}
                    <span className="text-[var(--muted)] font-normal ml-2">{Number(a.distance_km).toFixed(2)}km</span>
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(a.activity_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                    {a.duration_seconds ? ` · ${formatDuration(a.duration_seconds)}` : ''}
                    {a.pace_avg_sec_per_km ? ` · ${formatPace(a.pace_avg_sec_per_km)}/km` : ''}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* 설정 탭 */}
      {activeTab === 'settings' && isAdmin && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-[var(--muted)] mb-1 block">클럽 이름</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[var(--muted)] mb-1 block">소개</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">공개 클럽</p>
              <p className="text-xs text-[var(--muted)]">누구나 검색하고 가입할 수 있습니다</p>
            </div>
            <button
              onClick={() => setEditPublic(!editPublic)}
              className={`w-12 h-7 rounded-full transition-colors ${editPublic ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${editPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving || !editName.trim()}
            className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClubDetailPage() {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" /></div>}><ClubDetail /></Suspense>;
}
