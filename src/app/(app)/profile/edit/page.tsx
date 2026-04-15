'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { updateProfile, uploadAvatar } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera } from 'lucide-react';
import Link from 'next/link';

export default function ProfileEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [regionGu, setRegionGu] = useState(profile?.region_gu ?? '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    setMessage('');

    try {
      let avatarUrl = profile?.avatar_url ?? null;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id, avatarFile);
      }

      await updateProfile(user.id, {
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
      });

      // bio + 지역 업데이트
      const { getSupabase } = await import('@/lib/supabase');
      await getSupabase()
        .from('profiles')
        .update({
          bio: bio.trim() || null,
          region_si: regionGu ? '서울특별시' : null,
          region_gu: regionGu || null,
        })
        .eq('id', user.id);

      await refreshProfile();
      setMessage('저장되었습니다!');
      setTimeout(() => router.back(), 1000);
    } catch {
      setMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-[var(--muted)]">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-lg font-bold text-[var(--foreground)]">프로필 편집</h1>
      </div>

      {/* 아바타 */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-[var(--card-border)] overflow-hidden"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🏃🏻</div>
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <Camera size={24} className="text-white" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {/* 이름 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">닉네임</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <p className="text-sm text-[var(--muted)] mt-1">{displayName.length}/20</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">소개</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={100}
            rows={3}
            placeholder="한 줄 소개를 입력해주세요"
            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
          <p className="text-sm text-[var(--muted)] mt-1">{bio.length}/100</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">지역 (랭킹 참여)</label>
          <select
            value={regionGu}
            onChange={(e) => setRegionGu(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">선택 안함</option>
            {['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'].map((gu) => (
              <option key={gu} value={gu}>{gu}</option>
            ))}
          </select>
          <p className="text-sm text-[var(--muted)] mt-1">지역을 설정하면 지역 랭킹에 참여할 수 있습니다</p>
        </div>
      </div>

      {/* 저장 */}
      <button
        onClick={handleSave}
        disabled={saving || !displayName.trim()}
        className="w-full mt-6 py-3.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-base disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장'}
      </button>

      {message && (
        <p className={`text-center text-sm mt-3 ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
