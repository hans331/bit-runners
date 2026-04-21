'use client';

// 루틴포토 업로드 트리거 + 등록 모달.
// 홈 캐러셀 / 소셜 포토 탭 등 어디서든 재사용.
// 흐름: 파일 선택 → Storage 업로드 → 오늘의 activity 에 photo 등록 (캘린더 배경 옵션 포함).

import { useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getSupabase } from '@/lib/supabase';
import { Camera, Sparkles } from 'lucide-react';

interface Props {
  /** 트리거 요소 — 이 컴포넌트는 children 을 감싸는 버튼 역할 */
  children: React.ReactNode;
  className?: string;
  /** 등록 성공 시 호출 — 리스트 새로고침 등 */
  onUploaded?: () => void;
}

interface Pending {
  photoUrl: string;
  activityId: string | null;
  activityDate: string;
  applyToCalendar: boolean;
  shareToRoutinePhotos: boolean;
}

export default function PhotoUploader({ children, className, onUploaded }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const openPicker = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const supabase = getSupabase();
      const today = new Date().toISOString().slice(0, 10);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/routine/${today}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('activity-photos')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('activity-photos').getPublicUrl(path);
      const photoUrl = urlData.publicUrl;

      // 오늘 러닝이 있는지 확인 — 있으면 activity_id 연결, 없으면 활동 없이도 캘린더 배경은 가능
      const { data: actRows } = await supabase
        .from('activities')
        .select('id, activity_date')
        .eq('user_id', user.id)
        .eq('activity_date', today)
        .order('created_at', { ascending: false })
        .limit(1);
      const activity = actRows?.[0] ?? null;

      setPending({
        photoUrl,
        activityId: activity?.id ?? null,
        activityDate: today,
        applyToCalendar: true,
        shareToRoutinePhotos: !!activity,
      });
    } catch (err) {
      console.warn('루틴포토 업로드 실패:', err);
      setToast('사진 업로드 실패');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyPending = async () => {
    if (!pending || !user) return;
    setApplying(true);
    try {
      const supabase = getSupabase();

      if (pending.applyToCalendar) {
        await supabase.from('calendar_photos').upsert({
          user_id: user.id,
          date: pending.activityDate,
          photo_url: pending.photoUrl,
        }, { onConflict: 'user_id,date' });
      }

      if (pending.shareToRoutinePhotos && pending.activityId) {
        await supabase.from('activity_photos').insert({
          activity_id: pending.activityId,
          user_id: user.id,
          photo_url: pending.photoUrl,
          share_in_gallery: true,
          sort_order: 0,
        });
      } else if (pending.shareToRoutinePhotos && !pending.activityId) {
        setToast('오늘 러닝 기록이 없어 루틴포토는 등록 못 해요. 캘린더에만 적용했어요.');
        setTimeout(() => setToast(null), 3000);
      }

      setPending(null);
      onUploaded?.();
    } catch (err) {
      console.warn('루틴포토 적용 실패:', err);
      setToast('등록 실패. 잠시 후 다시 시도해주세요.');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={uploading}
        className={className ?? 'inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-base shadow-sm active:scale-[0.98] transition disabled:opacity-50'}
      >
        {uploading ? (
          <>
            <span className="animate-spin w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full" />
            <span>업로드 중...</span>
          </>
        ) : (
          children
        )}
      </button>

      {/* 등록 옵션 모달 */}
      {pending && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[var(--card-bg)] rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-[var(--card-border)] mx-auto" />
            <div className="text-center space-y-1">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 items-center justify-center shadow-md">
                <Sparkles size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)]">오늘 러닝 사진을 어떻게 쓸까요?</h3>
              <p className="text-sm text-[var(--muted)]">원하는 옵션을 선택하세요</p>
            </div>

            <div className="rounded-2xl overflow-hidden h-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pending.photoUrl} alt="" className="w-full h-full object-cover" />
            </div>

            <label className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 cursor-pointer active:scale-[0.99] transition">
              <input
                type="checkbox"
                checked={pending.applyToCalendar}
                onChange={e => setPending(p => p ? { ...p, applyToCalendar: e.target.checked } : p)}
                className="mt-0.5 w-5 h-5 rounded accent-emerald-500"
              />
              <div className="flex-1">
                <p className="text-base font-bold text-[var(--foreground)]">📅 오늘 캘린더 배경으로 저장</p>
                <p className="text-sm text-[var(--muted)] mt-0.5">캘린더에서 오늘 날짜 셀의 배경으로 보여요</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 cursor-pointer active:scale-[0.99] transition ${!pending.activityId ? 'opacity-60' : ''}`}>
              <input
                type="checkbox"
                checked={pending.shareToRoutinePhotos}
                disabled={!pending.activityId}
                onChange={e => setPending(p => p ? { ...p, shareToRoutinePhotos: e.target.checked } : p)}
                className="mt-0.5 w-5 h-5 rounded accent-emerald-500"
              />
              <div className="flex-1">
                <p className="text-base font-bold text-[var(--foreground)]">📸 루틴포토에 공유</p>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  {pending.activityId
                    ? '다른 러너들과 공유되고 좋아요 받을 수 있어요'
                    : '오늘 러닝 기록이 있어야 공유할 수 있어요'}
                </p>
              </div>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPending(null)}
                disabled={applying}
                className="flex-1 py-3.5 rounded-xl text-[var(--muted)] font-medium text-base"
              >
                취소
              </button>
              <button
                onClick={applyPending}
                disabled={applying || (!pending.applyToCalendar && !pending.shareToRoutinePhotos)}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-base shadow-md disabled:opacity-50"
              >
                {applying ? '적용 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-[80]">
          {toast}
        </div>
      )}
    </>
  );
}
