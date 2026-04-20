'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

// 모바일 최적 페이지 (/m/) 는 Cafe24 가 자동 리다이렉트 하지만, 앱 WebView 안 iframe 에서는
// 리다이렉트/세션 쿠키 문제로 빈 페이지 반환하는 경우가 있음 → 루트 URL 로 직접 요청하는 게 더 안정적.
const SHOP_URL = 'https://routinist.kr/';
const LOAD_TIMEOUT_MS = 8000;

function isNativeApp() {
  return typeof window !== 'undefined' && (window as unknown as { Capacitor?: unknown }).Capacitor !== undefined;
}

export default function ShopPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!loadedRef.current) {
        setBlocked(true);
        setLoading(false);
      }
    }, LOAD_TIMEOUT_MS);
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
    // absolute 로 main 전체를 채움 — h-full 은 부모 flex 맥락에 따라 0 이 될 수 있어 iframe 이 빈 박스로 보임
    <div className="absolute inset-0 bg-white">
      {!blocked && (
        <iframe
          ref={iframeRef}
          key={reloadKey}
          src={SHOP_URL}
          className="block w-full h-full border-0 bg-white"
          onLoad={() => {
            loadedRef.current = true;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setLoading(false);
          }}
          onError={() => setBlocked(true)}
          allow="clipboard-read; clipboard-write; payment; geolocation; fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
          title="Routinist Store"
        />
      )}

      {!blocked && loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white gap-3 z-10">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          <p className="text-sm text-[var(--muted)]">쇼핑몰 불러오는 중...</p>
          <button
            onClick={openExternal}
            className="text-xs text-[var(--accent)] underline mt-2"
          >
            느리면 외부 브라우저로 열기
          </button>
        </div>
      )}

      {blocked && (
        <div className="h-full flex flex-col items-center justify-center px-6 space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertCircle size={28} className="text-amber-600" />
          </div>
          <div className="text-center space-y-2 max-w-sm">
            <h2 className="text-lg font-bold text-[var(--foreground)]">쇼핑몰을 불러올 수 없어요</h2>
            <p className="text-sm text-[var(--muted)] leading-6">
              네트워크 또는 보안 정책으로 앱 내 표시가 막혔어요. 아래 버튼으로 외부 브라우저에서 여실 수 있습니다.
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
