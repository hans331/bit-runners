'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserData } from '@/components/UserDataProvider';
import { connectHealthKit, syncHealthData, isNativeApp, getPlatform } from '@/lib/health-sync';
import { ArrowLeft, Heart, Smartphone, Check, RefreshCw } from 'lucide-react';
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
          // 성공적으로 호출됐으면 synced=0 이어도 timestamp 갱신 (사용자 피드백: "동기화했는데 마지막 동기화 날짜가 안 바뀌어요")
          if (syncResult.success) {
            if (syncResult.synced > 0) refresh();
            const now = new Date().toISOString();
            localStorage.setItem('last_health_sync', now);
            setLastSync(now);
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
      if (result.success) {
        if (result.synced > 0) refresh();
        const now = new Date().toISOString();
        localStorage.setItem('last_health_sync', now);
        setLastSync(now);
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
        <h1 className="text-2xl font-bold text-[var(--foreground)]">건강 앱 연동</h1>
      </div>

      <p className="text-base text-[var(--muted)] mb-5 leading-relaxed">
        건강 앱의 러닝 기록을 자동으로 가져옵니다
      </p>

      {/* Apple Health */}
      <div className="card p-5 mb-3">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <Heart size={28} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[var(--foreground)]">Apple Health</h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              러닝 거리·시간·칼로리 자동 가져오기
            </p>

            {isNative && platform === 'ios' ? (
              <div className="mt-4 space-y-3">
                {!connected ? (
                  <button
                    onClick={handleConnect}
                    disabled={syncing}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {syncing ? <RefreshCw size={18} className="animate-spin" /> : <Heart size={18} />}
                    {syncing ? '연결 중…' : '연결하기'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 text-base text-emerald-600 font-bold flex-1">
                      <Check size={18} /> 연결됨
                    </div>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-base font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                      동기화
                    </button>
                  </div>
                )}
                {lastSync && (
                  <p className="text-sm text-[var(--muted)]">마지막 동기화 {formatLastSync(lastSync)}</p>
                )}
                {message && (
                  <p className={`text-sm font-medium ${message.includes('실패') ? 'text-red-500' : 'text-emerald-600'}`}>
                    {message}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-2 text-sm text-[var(--muted)]">
                <Smartphone size={16} className="flex-shrink-0 mt-0.5" />
                <span>iOS 앱에서만 사용할 수 있어요</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Samsung Health / Health Connect */}
      <div className="card p-5 mb-3">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#3B82F6"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[var(--foreground)]">Samsung Health</h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              Health Connect를 통해 가져오기
            </p>

            {isNative && platform === 'android' ? (
              <button
                onClick={handleConnect}
                disabled={syncing}
                className="mt-4 w-full py-3.5 rounded-xl bg-emerald-500 text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {syncing ? <RefreshCw size={18} className="animate-spin" /> : null}
                {syncing ? '연결 중…' : '연결하기'}
              </button>
            ) : (
              <div className="mt-3 flex items-start gap-2 text-sm text-[var(--muted)]">
                <Smartphone size={16} className="flex-shrink-0 mt-0.5" />
                <span>Android 앱에서만 사용할 수 있어요</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 안내 — 간소화 */}
      <p className="mt-6 text-sm text-[var(--muted)] text-center leading-relaxed">
        Nike Run Club·런데이·Garmin 기록도<br/>건강 앱으로 자동 연동됩니다
      </p>
    </div>
  );
}
