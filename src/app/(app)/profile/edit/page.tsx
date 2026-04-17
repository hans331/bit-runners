'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { updateProfile, uploadAvatar } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera } from 'lucide-react';
import Link from 'next/link';
import AppLogo from '@/components/AppLogo';
import { COUNTRIES, KR_REGIONS, KR_SIDO_LIST } from '@/lib/regions';

export default function ProfileEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');

  // 지역 3단계
  // region_si 필드에 시도명이 들어있으면 기본 한국으로 가정 (기존 호환성)
  const [country, setCountry] = useState<string>(profile?.region_si ? 'KR' : 'KR');
  const [sido, setSido] = useState<string>(profile?.region_si ?? '');
  const [gu, setGu] = useState(profile?.region_gu ?? '');

  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const isKorea = country === 'KR';
  const guList = isKorea && sido ? KR_REGIONS[sido] ?? [] : [];

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
          // 한국만 시도/구 저장. 해외는 시도 필드에 국가 native 이름 (랭킹 참여 불가)
          region_si: isKorea ? (sido || null) : (COUNTRIES.find(c => c.code === country)?.native ?? null),
          region_gu: isKorea ? (gu || null) : null,
        })
        .eq('id', user.id);

      await refreshProfile();
      setMessage('저장되었습니다!');
      setTimeout(() => router.back(), 800);
    } catch {
      setMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-32">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-[var(--muted)]">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">프로필 편집</h1>
      </div>

      {/* 아바타 */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-[var(--card-border)] overflow-hidden"
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><AppLogo size={48} /></div>
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

      {/* 이름 / 소개 / 지역 */}
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
          <p className="text-xs text-[var(--muted)] mt-1">{displayName.length}/20</p>
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
          <p className="text-xs text-[var(--muted)] mt-1">{bio.length}/100</p>
        </div>

        {/* 지역 3단계 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">지역</label>

          {/* ① 국가 */}
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">국가</p>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setSido('');
                setGu('');
              }}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.native}</option>
              ))}
            </select>
          </div>

          {/* ② 시도 */}
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">시/도</p>
            <select
              value={sido}
              onChange={(e) => {
                setSido(e.target.value);
                setGu('');
              }}
              disabled={!isKorea}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
            >
              <option value="">선택 안함</option>
              {KR_SIDO_LIST.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* ③ 구/군 */}
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">구/군</p>
            <select
              value={gu}
              onChange={(e) => setGu(e.target.value)}
              disabled={!isKorea || !sido}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
            >
              <option value="">선택 안함</option>
              {guList.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-[var(--muted)]">
            {isKorea
              ? '시/도/구를 모두 선택하면 지역 랭킹에 참여할 수 있어요'
              : '해외 지역 랭킹은 지원 예정입니다'}
          </p>
        </div>
      </div>

      {/* 저장 버튼 — sticky bottom으로 드롭다운/키보드와 겹치지 않음 */}
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-[var(--background)]/95 backdrop-blur-xl border-t border-[var(--card-border)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="w-full py-3.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-base disabled:opacity-50 shadow-lg"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          {message && (
            <p className={`text-center text-sm mt-2 ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
