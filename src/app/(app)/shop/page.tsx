'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

const SHOP_URL = 'https://routinist.kr/m/';
const LOAD_TIMEOUT_MS = 6000;

function isNativeApp() {
  return typeof window !== 'undefined' && (window as unknown as { Capacitor?: unknown }).Capacitor !== undefined;
}

export default function ShopPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLoadTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // iframe 이 차단되면 load 이벤트가 안 발생 → 타임아웃으로 감지
    timeoutRef.current = setTimeout(() => {
      setBlocked(true);
      setLoading(false);
    }, LOAD_TIMEOUT_MS);
  };

  useEffect(() => {
    startLoadTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reloadKey]);

  const handleReload = () => {
    setLoading(true);
    setBlocked(false);
    setReloadKey(k => k + 1);
  };

  const openExternal = async () => {
    if (isNativeApp()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: SHOP_URL, presentationStyle: 'fullscreen' });
    } else {
      window.open(SHOP_URL, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* iframe — 차단되지 않은 경우 앱 내 쇼핑 경험 */}
      {!blocked && (
        <iframe
          key={reloadKey}
          src={SHOP_URL}
          className="w-full flex-1 border-0 bg-white"
          onLoad={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setLoading(false);
          }}
          allow="clipboard-read; clipboard-write; payment; geolocation"
          title="Routinist Store"
        />
      )}

      {/* 로딩 스피너 */}
      {!blocked && loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white gap-3 z-10">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          <p className="text-sm text-[var(--muted)]">쇼핑몰 불러오는 중...</p>
        </div>
      )}

      {/* iframe 차단 시 폴백 */}
      {blocked && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertCircle size={28} className="text-amber-600" />
          </div>
          <div className="text-center space-y-2 max-w-sm">
            <h2 className="text-lg font-bold text-[var(--foreground)]">쇼핑몰 임베드 차단됨</h2>
            <p className="text-sm text-[var(--muted)] leading-6">
              현재 보안 정책(X-Frame-Options)으로 앱 내 임베드가 차단되어 있습니다.
              Cafe24 관리자 → 보안설정에서 허용하거나, 아래 버튼으로 외부에서 여세요.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={handleReload}
              className="flex items-center justify-center gap-2 bg-[var(--card-border)]/60 text-[var(--foreground)] font-semibold py-3 rounded-xl"
            >
              <RefreshCw size={16} /> 다시 시도
            </button>
            <button
              onClick={openExternal}
              className="flex items-center justify-center gap-2 bg-[var(--accent)] text-white font-semibold py-3 rounded-xl"
            >
              <ExternalLink size={16} /> 외부 브라우저로 열기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
