'use client';

import { useState } from 'react';
import { followUser, unfollowUser } from '@/lib/social-data';

interface FollowButtonProps {
  userId: string;
  initialFollowing: boolean;
  onToggle?: (following: boolean) => void;
}

export default function FollowButton({ userId, initialFollowing, onToggle }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        onToggle?.(false);
      } else {
        await followUser(userId);
        setFollowing(true);
        onToggle?.(true);
      }
    } catch {
      // 실패 시 원래 상태 유지
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
        following
          ? 'bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)]'
          : 'bg-[var(--accent)] text-white'
      }`}
    >
      {loading ? '...' : following ? '팔로잉' : '팔로우'}
    </button>
  );
}
