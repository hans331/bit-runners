'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { updateProfile, uploadAvatar } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, MapPin } from 'lucide-react';
import Link from 'next/link';
import AppLogo from '@/components/AppLogo';
import { COUNTRIES, KR_REGIONS, KR_SIDO_LIST } from '@/lib/regions';
import { detectRegion } from '@/lib/geo';

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 80 }, (_, i) => CURRENT_YEAR - 14 - i);

export default function ProfileEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');

  const [country, setCountry] = useState<string>(profile?.country_code || 'KR');
  const [sido, setSido] = useState<string>(profile?.region_si ?? '');
  const [gu, setGu] = useState(profile?.region_gu ?? '');

  const [birthYear, setBirthYear] = useState<string>(profile?.birth_year?.toString() ?? '');
  const [gender, setGender] = useState<string>(profile?.gender ?? '');
  const [runningSince, setRunningSince] = useState<string>(profile?.running_since ?? '');

  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [detecting, setDetecting] = useState(false);

  const isKorea = country === 'KR';
  const guList = isKorea && sido ? KR_REGIONS[sido] ?? [] : [];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleDetectRegion = async () => {
    setDetecting(true);
    setMessage('');
    try {
      const r = await detectRegion();
      setCountry(r.country_code);
      if (r.country_code === 'KR') {
        if (r.si) setSido(r.si);
        if (r.gu) setGu(r.gu);
      }
      setMessage(`현재 위치: ${r.display}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '위치 감지 실패');
    } finally {
      setDetecting(false);
    }
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

      const { getSupabase } = await import('@/lib/supabase');
      await getSupabase()
        .from('profiles')
        .update({
          bio: bio.trim() || null,
          country_code: country || null,
          region_si: isKorea ? (sido || null) : (COUNTRIES.find(c => c.code === country)?.native ?? null),
          region_gu: isKorea ? (gu || null) : null,
          birth_year: birthYear ? parseInt(birthYear, 10) : null,
          gender: gender || null,
          running_since: runningSince || null,
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
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-[var(--muted)]">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">프로필 편집</h1>
      </div>

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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-[var(--foreground)]">지역</label>
            <button
              onClick={handleDetectRegion}
              disabled={detecting}
              className="flex items-center gap-1 text-xs text-[var(--accent)] font-medium disabled:opacity-50"
            >
              <MapPin size={14} />
              {detecting ? '감지 중...' : '현재 위치로 자동 선택'}
            </button>
          </div>

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
        </div>

        {/* 추가 프로필 — 매칭 랭킹에 사용. 모두 선택 항목. */}
        <div className="border-t border-[var(--card-border)] pt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              랭킹 매칭 정보 <span className="text-xs text-[var(--muted)]">(선택)</span>
            </label>
            <p className="text-xs text-[var(--muted)] mb-3">
              비슷한 조건의 러너와 나를 비교해서 재미있는 순위를 보여드려요. 언제든 수정·삭제 가능합니다.
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--muted)] mb-1">출생 연도</p>
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm"
            >
              <option value="">선택 안함</option>
              {BIRTH_YEARS.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs text-[var(--muted)] mb-1">성별</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'male', label: '남성' },
                { v: 'female', label: '여성' },
                { v: 'other', label: '기타' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setGender(gender === opt.v ? '' : opt.v)}
                  type="button"
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    gender === opt.v
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--card-border)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-[var(--muted)] mb-1">러닝 시작 시점</p>
            <input
              type="month"
              value={runningSince ? runningSince.slice(0, 7) : ''}
              onChange={(e) => setRunningSince(e.target.value ? `${e.target.value}-01` : '')}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-sm"
            />
          </div>
        </div>
      </div>

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
            <p className={`text-center text-sm mt-2 ${message.includes('오류') || message.includes('실패') || message.includes('거부') ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
