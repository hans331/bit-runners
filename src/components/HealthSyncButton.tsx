'use client';

import { useState, useEffect } from 'react';
import { syncHealthData, isNativeApp, getPlatform, type SyncResult } from '@/lib/health-sync';

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
    if (!memberId) {
      setResult({ success: false, message: '먼저 이름을 선택해주세요.', synced: 0 });
      return;
    }
    setSyncing(true);
    setResult(null);
    try {
      const syncResult = await syncHealthData(memberId);
      setResult(syncResult);
      if (syncResult.synced > 0) {
        onSyncComplete();
      }
    } catch {
      setResult({ success: false, message: '동기화 중 오류가 발생했습니다. 다시 시도해주세요.', synced: 0 });
    } finally {
      setSyncing(false);
    }
  };

  // 웹에서는 Apple Health 연동 안내
  if (!isNative) {
    return (
      <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Apple Health 연동</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              BIT Runners 앱을 설치하면 Apple Health에서 러닝 기록을 자동으로 가져올 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 네이티브 앱: Apple Health 동기화 버튼
  return (
    <div className="space-y-3">
      {/* Apple Health 연동 헤더 */}
      <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {platform === 'ios' ? 'Apple Health' : 'Health Connect'} 연동
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {platform === 'ios'
                ? 'Apple Health에 저장된 러닝 기록을 BIT Runners로 가져옵니다. 러닝 거리, 시간 데이터를 읽어옵니다.'
                : 'Health Connect에 저장된 러닝 기록을 BIT Runners로 가져옵니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* 동기화 버튼 */}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3.5 rounded-xl transition-all text-base shadow-sm disabled:opacity-50"
      >
        {syncing ? (
          <>
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Apple Health에서 가져오는 중...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
            </svg>
            Apple Health에서 러닝 기록 가져오기
          </>
        )}
      </button>

      {/* 동기화 결과 */}
      {result && (
        <div className={`rounded-2xl p-3 text-center ${
          result.success
            ? 'bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30'
            : 'bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'
        }`}>
          <p className={`font-medium text-sm whitespace-pre-line ${
            result.success
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            {result.message}
          </p>
        </div>
      )}
    </div>
  );
}
