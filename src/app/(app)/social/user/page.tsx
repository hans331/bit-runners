'use client';

// 유저 프로필 페이지. Next.js 16 static export 와 호환되도록 query param 방식
// (예: /social/user?id=uuid). 기존 /social/clubs/detail 패턴과 동일.

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus, UserCheck, MapPin } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { followUser, unfollowUser, isFollowing } from '@/lib/social-data';
import type { Profile } from '@/types';
import AppLogo from '@/components/AppLogo';

interface MonthStats {
  monthly_km: number;
  run_count: number;
}

function UserProfileContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('id') ?? '';
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<MonthStats>({ monthly_km: 0, run_count: 0 });
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const supabase = getSupabase();
        const [{ data: p }, followStatus] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          user && user.id !== userId ? isFollowing(userId) : Promise.resolve(false),
        ]);
        setProfile((p as Profile | null) ?? null);
        setFollowing(followStatus);

        const now = new Date();
        const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const { data: acts } = await supabase
          .from('activities')
          .select('distance_km')
          .eq('user_id', userId)
          .gte('activity_date', start)
          .eq('visibility', 'public');
        const km = (acts ?? []).reduce((s, a) => s + Number(a.distance_km), 0);
        setStats({ monthly_km: km, run_count: (acts ?? []).length });
      } catch (e) {
        console.warn('[UserProfile] 조회 실패', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, user]);

  const handleToggleFollow = async () => {
    if (!user || toggling) return;
    setToggling(true);
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
      } else {
        await followUser(userId);
        setFollowing(true);
      }
    } catch (e) {
      console.warn('[Follow] 실패', e);
    } finally {
      setToggling(false);
    }
  };

  if (!userId) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <Link href="/social" className="inline-flex items-center gap-2 text-[var(--muted)] mb-4">
          <ArrowLeft size={20} /> 뒤로
        </Link>
        <p className="text-center text-[var(--muted)] mt-8">잘못된 접근입니다</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto flex justify-center pt-16">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <Link href="/social" className="inline-flex items-center gap-2 text-[var(--muted)] mb-4">
          <ArrowLeft size={20} /> 뒤로
        </Link>
        <p className="text-center text-[var(--muted)] mt-8">유저를 찾을 수 없어요</p>
      </div>
    );
  }

  const isMe = user?.id === userId;
  const regionLabel = [profile.region_si, profile.region_gu].filter(Boolean).join(' ');

  return (
    <div className="p-4 max-w-lg mx-auto pb-12">
      <Link href="/social" className="inline-flex items-center gap-2 text-[var(--muted)] mb-4">
        <ArrowLeft size={20} /> 뒤로
      </Link>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><AppLogo size={40} /></div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--foreground)]">{profile.display_name}</h1>
          {regionLabel && (
            <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-1">
              <MapPin size={12} /> {regionLabel}
            </p>
          )}
          {profile.bio && <p className="text-sm text-[var(--muted)] mt-1">{profile.bio}</p>}
        </div>
      </div>

      {!isMe && user && (
        <button
          onClick={handleToggleFollow}
          disabled={toggling}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mb-4 disabled:opacity-50 ${
            following
              ? 'bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)]'
              : 'bg-[var(--accent)] text-white'
          }`}
        >
          {following ? <UserCheck size={18} /> : <UserPlus size={18} />}
          {following ? '친구 맺음 (해제)' : '친구 추가'}
        </button>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-[var(--muted)]">이달 거리</p>
          <p className="text-lg font-bold text-[var(--foreground)]">{stats.monthly_km.toFixed(1)}km</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-[var(--muted)]">이달 러닝</p>
          <p className="text-lg font-bold text-[var(--foreground)]">{stats.run_count}회</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-[var(--muted)]">통산</p>
          <p className="text-lg font-bold text-[var(--foreground)]">{(profile.total_distance_km ?? 0).toFixed(0)}km</p>
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={
      <div className="p-4 max-w-lg mx-auto flex justify-center pt-16">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    }>
      <UserProfileContent />
    </Suspense>
  );
}
