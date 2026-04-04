'use client';

import { useState, useEffect } from 'react';
import { syncHealthData, isNativeApp, getPlatform, SyncResult } from '@/lib/health-sync';

interface HealthSyncButtonProps {
  memberId: string;
  onSyncComplete: () => void;
}

export default function HealthSyncButton({ memberId, onSyncComplete }: HealthSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string>('web');

  useEffect(() => {
    setIsNative(isNativeApp());
    setPlatform(getPlatform());
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const syncResult = await syncHealthData(memberId);
      setResult(syncResult);
      if (syncResult.synced > 0) {
        onSyncComplete();
      }
    } catch {
      setResult({ success: false, message: '동기화 중 오류가 발생했습니다.', synced: 0 });
    } finally {
      setSyncing(false);
    }
  };

  // 웹에서는 안내 메시지만 표시
  if (!isNative) {
    return (
      <div className="bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">자동 동기화</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              BIT Runners 앱을 설치하면 Apple Health / Samsung Health에서 러닝 기록을 자동으로 가져올 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3.5 rounded-xl transition-all text-base shadow-sm disabled:opacity-50"
      >
        {syncing ? (
          <>
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            동기화 중...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            {platform === 'android' ? 'Health Connect' : 'Apple Health'}에서 가져오기
          </>
        )}
      </button>

      {result && (
        <div className={`rounded-2xl p-3 text-center ${
          result.success
            ? 'bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30'
            : 'bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'
        }`}>
          <p className={`font-medium text-sm ${
            result.success
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {result.message}
          </p>
        </div>
      )}
    </div>
  );
}
