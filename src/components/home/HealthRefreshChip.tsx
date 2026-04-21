'use client';

// 홈 상단의 "Apple Health 최신 기록 불러오기" 컴팩트 버튼.
// iOS 네이티브 앱에서만 표시. 오늘 러닝이 Health 에는 있는데 앱에는 안 보일 때 사용.

import { useEffect, useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { syncHealthData, connectHealthKit, isNativeApp, getPlatform } from '@/lib/health-sync';

interface Props {
  onSynced?: () => void;
}

export default function HealthRefreshChip({ onSynced }: Props) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setShow(isNativeApp() && getPlatform() === 'ios');
  }, []);

  if (!show || !user) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      // 권한 먼저 (이미 허용되어 있으면 즉시 통과)
      await connectHealthKit();
      const result = await syncHealthData(user.id);
      setToast(result.synced > 0 ? `${result.synced}건 동기화 완료!` : '새 기록이 없어요');
      if (result.synced > 0) onSynced?.();
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : '동기화 실패');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white border border-emerald-200 text-emerald-700 font-semibold text-sm shadow-sm active:scale-[0.99] transition disabled:opacity-60"
      >
        {syncing ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            <span>Apple Health에서 불러오는 중...</span>
          </>
        ) : (
          <>
            <RefreshCw size={16} />
            <span>Apple Health 최신 기록 불러오기</span>
          </>
        )}
      </button>
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-[80] flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}
