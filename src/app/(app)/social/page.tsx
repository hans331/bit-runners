'use client';

// 소셜/랭킹 허브 — 3탭 구조 (내 랭킹 / 친구 랭킹 / 클럽 랭킹)
// 랭킹이 주 관심사라는 유저 피드백 반영. 클럽은 부차로 내려감.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { searchUsers, fetchPublicUsers, getMyClubs, fetchFollowing } from '@/lib/social-data';
import { getSupabase } from '@/lib/supabase';
import UserRow from '@/components/social/UserRow';
import { User as UserIcon, Users, Trophy, Search, Plus, MapPin } from 'lucide-react';
import type { Profile, Club } from '@/types';
import AppLogo from '@/components/AppLogo';

const SECTIONS = [
  { id: 'me', label: '내 랭킹', Icon: Trophy },
  { id: 'friends', label: '친구', Icon: UserIcon },
  { id: 'clubs', label: '클럽', Icon: Users },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

interface MatchedRank {
  scope_label: string;
  scope_type: string;
  rank_position: number;
  total_in_scope: number;
  monthly_km: number;
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function SocialPage() {
  const { user, profile } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('me');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedRank, setMatchedRank] = useState<MatchedRank | null>(null);
  const [friendsCompare, setFriendsCompare] = useState<{ id: string; name: string; avatar: string | null; km: number; isMe: boolean }[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [publicUsers, following, clubs] = await Promise.all([
        fetchPublicUsers(30),
        fetchFollowing(user.id),
        getMyClubs(),
      ]);
      setUsers(publicUsers.filter((u) => u.id !== user.id));
      setFollowingIds(new Set(following.map((f) => f.id)));
      setMyClubs(clubs);

      // 매칭 랭킹
      const supabase = getSupabase();
      const { data: mr } = await supabase.rpc('find_best_matched_rank', { target_user_id: user.id });
      const mrRow = Array.isArray(mr) ? mr[0] : mr;
      if (mrRow) setMatchedRank(mrRow as MatchedRank);

      // 친구 + 나 이번 주 비교
      const weekStart = startOfWeek();
      const friendIds = following.map(f => f.id);
      const allIds = [user.id, ...friendIds];
      const { data: acts } = await supabase
        .from('activities')
        .select('user_id, distance_km')
        .in('user_id', allIds)
        .gte('activity_date', weekStart);
      const kmMap = new Map<string, number>();
      (acts ?? []).forEach(a => kmMap.set(a.user_id, (kmMap.get(a.user_id) ?? 0) + Number(a.distance_km)));
      const rows = [
        { id: user.id, name: profile?.display_name ?? '나', avatar: profile?.avatar_url ?? null, km: kmMap.get(user.id) ?? 0, isMe: true },
        ...following.map(f => ({ id: f.id, name: f.display_name, avatar: f.avatar_url, km: kmMap.get(f.id) ?? 0, isMe: false })),
      ].sort((a, b) => b.km - a.km);
      setFriendsCompare(rows);
    } catch (e) {
      console.warn('[Social] load 실패', e);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      const publicUsers = await fetchPublicUsers(30);
      setUsers(publicUsers.filter((u) => u.id !== user?.id));
      return;
    }
    const results = await searchUsers(query);
    setUsers(results.filter((u) => u.id !== user?.id));
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 세그먼트 컨트롤 — 3탭 */}
      <div className="flex bg-[var(--card)] rounded-xl p-1 mb-6">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeSection === section.id
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted)]'
            }`}
          >
            <section.Icon size={14} />
            {section.label}
          </button>
        ))}
      </div>

      {/* 내 랭킹 */}
      {activeSection === 'me' && (
        <div className="space-y-4">
          {matchedRank ? (
            <div className="card p-5 bg-gradient-to-br from-[var(--accent)]/10 to-emerald-500/10">
              <p className="text-xs text-[var(--muted)]">{matchedRank.scope_label}</p>
              <p className="text-3xl font-bold text-[var(--foreground)] mt-1">
                {matchedRank.rank_position}
                <span className="text-sm font-medium text-[var(--muted)]"> / {matchedRank.total_in_scope}명</span>
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">이달 {matchedRank.monthly_km.toFixed(1)}km</p>
            </div>
          ) : (
            <Link href="/profile/edit" className="card p-5 block bg-[var(--card)] hover:bg-[var(--card-border)]/30">
              <p className="text-sm font-semibold text-[var(--foreground)]">내 조건 입력하고 순위 보기</p>
              <p className="text-xs text-[var(--muted)] mt-1">지역·생년·성별을 입력하면 비슷한 러너들 중 내 위치가 보여요</p>
            </Link>
          )}

          {/* 지역 랭킹 CTA */}
          <Link
            href="/social/rankings"
            className="card p-4 flex items-center justify-between active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">지역 랭킹 (시/구)</p>
                <p className="text-xs text-[var(--muted)]">내 동네 TOP 러너들</p>
              </div>
            </div>
            <span className="text-[var(--muted)]">→</span>
          </Link>
        </div>
      )}

      {/* 친구 랭킹 */}
      {activeSection === 'friends' && (
        <div className="space-y-6">
          {friendsCompare.length > 1 ? (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--foreground)]">이번 주 친구 비교</h3>
                <span className="text-[10px] text-[var(--muted)]">월요일 기준</span>
              </div>
              <div className="space-y-2">
                {(() => {
                  const maxKm = Math.max(...friendsCompare.map(r => r.km), 1);
                  return friendsCompare.slice(0, 20).map((r, i) => (
                    <Link
                      key={r.id}
                      href={r.isMe ? '/profile' : `/social/user?id=${r.id}`}
                      className="flex items-center gap-2"
                    >
                      <span className={`w-5 text-xs font-bold text-center ${i === 0 ? 'text-amber-500' : 'text-[var(--muted)]'}`}>{i + 1}</span>
                      <div className="w-7 h-7 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
                        {r.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[var(--muted)]">
                            {r.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <span className={`text-sm truncate ${r.isMe ? 'font-bold text-[var(--accent)]' : 'font-medium text-[var(--foreground)]'}`}>
                            {r.name}{r.isMe ? ' (나)' : ''}
                          </span>
                          <span className="text-xs text-[var(--muted)] ml-2">{r.km.toFixed(1)}km</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-[var(--card-border)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${r.isMe ? 'bg-[var(--accent)]' : 'bg-emerald-400/70'}`}
                            style={{ width: `${(r.km / maxKm) * 100}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>
          ) : (
            <div className="card p-5 text-center">
              <UserIcon size={28} className="mx-auto text-[var(--muted)] mb-2" />
              <p className="text-sm font-medium text-[var(--foreground)]">친구와 함께 달려보세요</p>
              <p className="text-xs text-[var(--muted)] mt-1">아래에서 러너를 찾아 친구로 추가하면 이번 주 km 비교를 볼 수 있어요</p>
            </div>
          )}

          {/* 러너 찾기 */}
          <div>
            <h2 className="text-base font-bold text-[var(--foreground)] mb-3">러너 찾기</h2>
            <div className="relative mb-3">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="닉네임으로 검색"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
              </div>
            ) : users.length === 0 ? (
              <div className="card p-5 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">{searchQuery ? '해당 닉네임의 러너가 없어요' : '아직 공개된 러너가 없어요'}</p>
                <p className="text-xs text-[var(--muted)] mt-1">친구가 Routinist 에 가입하면 여기 나타납니다</p>
              </div>
            ) : (
              <div className="card px-4 divide-y divide-[var(--card-border)]">
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    profile={u}
                    currentUserId={user?.id}
                    isFollowing={followingIds.has(u.id)}
                    onFollowToggle={(uid, f) => {
                      setFollowingIds((prev) => {
                        const next = new Set(prev);
                        f ? next.add(uid) : next.delete(uid);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 클럽 */}
      {activeSection === 'clubs' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[var(--foreground)]">내 클럽</h2>
              <Link href="/social/clubs/create" className="flex items-center gap-1 text-sm text-[var(--accent)] font-semibold">
                <Plus size={14} /> 클럽 만들기
              </Link>
            </div>
            {myClubs.length === 0 ? (
              <div className="card p-6 text-center space-y-2">
                <div><AppLogo size={40} /></div>
                <p className="text-sm font-medium text-[var(--foreground)]">아직 가입한 클럽이 없습니다</p>
                <Link href="/social/clubs" className="text-sm text-[var(--accent)] font-semibold inline-block">
                  클럽 둘러보기 →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {myClubs.map((club) => (
                  <Link key={club.id} href={`/social/clubs/detail?id=${club.id}`} className="card p-4 flex items-center gap-3 block">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                      {club.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={club.logo_url} alt="" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <Users size={20} className="text-[var(--accent)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{club.name}</p>
                      <p className="text-xs text-[var(--muted)]">멤버 {club.member_count}명</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/social/clubs" className="card p-4 flex items-center justify-between block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                <Trophy size={18} className="text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">모든 클럽 둘러보기</p>
                <p className="text-xs text-[var(--muted)]">인기 클럽 · 가입하기</p>
              </div>
            </div>
            <span className="text-[var(--muted)]">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
