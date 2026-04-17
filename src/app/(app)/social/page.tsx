'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { searchUsers, fetchPublicUsers, getMyClubs, fetchFollowing } from '@/lib/social-data';
import UserRow from '@/components/social/UserRow';
import { Users, Trophy, Search, Plus } from 'lucide-react';
import type { Profile, Club } from '@/types';
import AppLogo from '@/components/AppLogo';

const SECTIONS = [
  { id: 'clubs', label: '클럽', Icon: Users },
  { id: 'rankings', label: '랭킹', Icon: Trophy },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export default function SocialPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('clubs');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

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
      {/* 세그먼트 컨트롤 */}
      <div className="flex bg-[var(--card)] rounded-xl p-1 mb-6">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeSection === section.id
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted)]'
            }`}
          >
            <section.Icon size={16} />
            {section.label}
          </button>
        ))}
      </div>

      {/* 클럽 섹션 */}
      {activeSection === 'clubs' && (
        <div className="space-y-6">
          {/* 내 클럽 */}
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

          {/* 러너 검색 */}
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
              <p className="text-center text-xs text-[var(--muted)] py-8">검색 결과가 없습니다</p>
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

      {/* 랭킹 섹션 → 바로 이동 */}
      {activeSection === 'rankings' && (
        <div className="text-center py-12 space-y-3">
          <p className="text-5xl">🏅</p>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">지역 랭킹</h2>
          <p className="text-sm text-[var(--muted)]">내 동네에서 몇 등인지 확인해보세요</p>
          <Link href="/social/rankings" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm">
            🏆 랭킹 보기
          </Link>
        </div>
      )}

    </div>
  );
}
