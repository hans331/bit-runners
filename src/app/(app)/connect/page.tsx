'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { connectHealthKit, syncHealthData, isNativeApp, getPlatform } from '@/lib/health-sync';
import { ArrowLeft, Heart, Smartphone, Check, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ConnectPage() {
  const { user } = useAuth();
  const { refresh } = useUserData();
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string>('web');
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    setIsNative(isNativeApp());
    setPlatform(getPlatform());
    // 마지막 동기화 시간 확인
    const saved = localStorage.getItem('last_health_sync');
    if (saved) setLastSync(saved);
  }, []);

  const handleConnect = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const result = await connectHealthKit();
      if (result.success) {
        setConnected(true);
        setMessage('연결 성공! 데이터를 동기화합니다...');

        // 백그라운드 동기화
        if (user) {
          const syncResult = await syncHealthData(user.id);
          setMessage(syncResult.message);
          if (syncResult.synced > 0) {
            refresh();
            localStorage.setItem('last_health_sync', new Date().toISOString());
            setLastSync(new Date().toISOString());
          }
        }
      } else {
        setMessage(result.message);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '연결 실패');
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setMessage('');
    try {
      const result = await syncHealthData(user.id);
      setMessage(result.message);
      if (result.synced > 0) {
        refresh();
        localStorage.setItem('last_health_sync', new Date().toISOString());
        setLastSync(new Date().toISOString());
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '동기화 실패');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-extrabold text-[var(--foreground)]">건강 앱 연동</h1>
      </div>

      <p className="text-xs text-[var(--muted)] mb-6">
        건강 앱에서 러닝 데이터를 자동으로 가져옵니다. 다른 앱(Nike Run Club, Strava 등)으로 기록한 데이터도 건강 앱을 통해 동기화됩니다.
      </p>

      {/* Apple Health */}
      <div className="card p-5 mb-3">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <Heart size={24} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">Apple Health</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              iPhone의 건강 앱에서 러닝 거리, 시간, 칼로리를 가져옵니다
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-sm px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500">운동 기록</span>
              <span className="text-sm px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500">이동 거리</span>
              <span className="text-sm px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500">활동 에너지</span>
            </div>

            {isNative && platform === 'ios' ? (
              <div className="mt-3 space-y-2">
                {!connected ? (
                  <button
                    onClick={handleConnect}
                    disabled={syncing}
                    className="w-full py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Heart size={16} />}
                    {syncing ? '연결 중...' : '연결하기'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 text-sm text-green-500 font-semibold flex-1">
                      <Check size={14} /> 연결됨
                    </div>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="px-4 py-2 rounded-xl bg-[var(--card-border)] text-[var(--foreground)] text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                      동기화
                    </button>
                  </div>
                )}
                {lastSync && (
                  <p className="text-xs text-[var(--muted)]">마지막 동기화: {formatLastSync(lastSync)}</p>
                )}
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-2 text-xs text-[var(--muted)]">
                <Smartphone size={14} className="flex-shrink-0 mt-0.5" />
                <span>Routinist iOS 앱에서 연결할 수 있습니다</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Samsung Health / Health Connect */}
      <div className="card p-5 mb-3">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#3B82F6"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">Samsung Health / Health Connect</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Android의 Health Connect를 통해 삼성 헬스, Google Fit 등의 데이터를 가져옵니다
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-sm px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500">운동 기록</span>
              <span className="text-sm px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500">이동 거리</span>
            </div>

            {isNative && platform === 'android' ? (
              <button
                onClick={handleConnect}
                disabled={syncing}
                className="mt-3 w-full py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing ? <RefreshCw size={16} className="animate-spin" /> : null}
                {syncing ? '연결 중...' : '연결하기'}
              </button>
            ) : (
              <div className="mt-3 flex items-start gap-2 text-xs text-[var(--muted)]">
                <Smartphone size={14} className="flex-shrink-0 mt-0.5" />
                <span>Routinist Android 앱에서 연결할 수 있습니다</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`card p-3 text-center text-sm ${
          message.includes('실패') || message.includes('없습니다')
            ? 'text-red-500'
            : 'text-green-500'
        }`}>
          {message}
        </div>
      )}

      {/* 안내 */}
      <div className="mt-6 space-y-3">
        <div className="flex items-start gap-3 text-xs text-[var(--muted)]">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[var(--foreground)] mb-1">데이터는 어떻게 동기화되나요?</p>
            <p>건강 앱에 저장된 러닝 기록(워크아웃)을 가져옵니다. Nike Run Club, Strava, Garmin 등으로 기록하더라도 건강 앱과 연동되어 있다면 Routinist에서 자동으로 가져올 수 있습니다.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-xs text-[var(--muted)]">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[var(--foreground)] mb-1">개인정보는 안전한가요?</p>
            <p>건강 데이터는 러닝 기록 동기화 목적으로만 사용되며, 제3자와 공유되지 않습니다. 언제든지 연결을 해제할 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
