'use client';

import { useState, useEffect, useCallback } from 'react';

interface StravaConnectProps {
  memberId: string;
}

export default function StravaConnect({ memberId }: StravaConnectProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/strava/status?member_id=${memberId}`);
      const data = await res.json();
      setConnected(data.connected);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    checkStatus();

    // Check URL params for callback result
    const params = new URLSearchParams(window.location.search);
    const stravaParam = params.get('strava');
    if (stravaParam === 'connected') {
      setConnected(true);
      setSyncResult('Strava 연결 완료!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setSyncResult(null), 3000);
    } else if (stravaParam === 'denied') {
      setSyncResult('Strava 연결이 거부되었습니다.');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setSyncResult(null), 3000);
    } else if (stravaParam === 'error') {
      setSyncResult('Strava 연결 중 오류가 발생했습니다.');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setSyncResult(null), 3000);
    }
  }, [checkStatus]);

  const handleConnect = () => {
    window.location.href = `/api/strava/authorize?member_id=${memberId}`;
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        if (r.synced > 0) {
          setSyncResult(`${r.synced}개의 러닝 기록 동기화 완료!`);
        } else if (r.errors.length > 0) {
          setSyncResult('동기화 중 오류 발생');
        } else {
          setSyncResult('새로운 기록이 없습니다.');
        }
      }
    } catch {
      setSyncResult('동기화 실패');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 4000);
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {connected ? (
        <>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Strava 연결됨
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            )}
            {syncing ? '동기화 중...' : '동기화'}
          </button>
        </>
      ) : (
        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#FC4C02] hover:bg-[#e04400] px-3 py-1.5 rounded-full transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-.956l2.09 4.128 3.064-6.064H8.553L3.463 0 .387 6.064h5.938" />
          </svg>
          Strava 연결
        </button>
      )}
      {syncResult && (
        <span className="text-xs text-[var(--muted)] animate-pulse">
          {syncResult}
        </span>
      )}
    </div>
  );
}
