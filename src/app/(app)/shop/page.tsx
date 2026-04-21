'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';

// Cafe24 모바일 스토어. 앱 내 iframe 임베드 - 빈 응답이면 index.html 명시 폴백.
const SHOP_URLS = [
  'https://routinist.kr/',
  'https://routinist.kr/index.html',
];
const LOAD_TIMEOUT_MS = 15000;

function isNativeApp() {
  return typeof window !== 'undefined' && (window as unknown as { Capacitor?: unknown }).Capacitor !== undefined;
}

export default function ShopPage() {
  const [urlIdx, setUrlIdx] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  const currentUrl = SHOP_URLS[urlIdx];

  useEffect(() => {
    loadedRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!loadedRef.current) {
        // 첫 URL 실패하면 대체 URL 시도, 그래도 실패하면 blocked
        if (urlIdx < SHOP_URLS.length - 1) {
          setUrlIdx(i => i + 1);
          setReloadKey(k => k + 1);
        } else {
          setBlocked(true);
          setLoading(false);
        }
      }
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reloadKey, urlIdx]);

  const handleReload = () => {
    setLoading(true);
    setBlocked(false);
    setUrlIdx(0);
    setReloadKey(k => k + 1);
  };

  const openExternal = async () => {
    if (isNativeApp()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: SHOP_URLS[0], presentationStyle: 'fullscreen' });
    } else {
      window.open(SHOP_URLS[0], '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="absolute inset-0 bg-white">
      {!blocked && (
        <iframe
          ref={iframeRef}
          key={`${urlIdx}-${reloadKey}`}
          src={currentUrl}
          className="block w-full h-full border-0 bg-white"
          onLoad={() => {
            loadedRef.current = true;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setLoading(false);
          }}
          onError={() => {
            if (urlIdx < SHOP_URLS.length - 1) {
              setUrlIdx(i => i + 1);
              setReloadKey(k => k + 1);
            } else {
              setBlocked(true);
            }
          }}
          allow="clipboard-read; clipboard-write; payment; geolocation; fullscreen; accelerometer; gyroscope"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-modals allow-downloads"
          referrerPolicy="no-referrer-when-downgrade"
          title="Routinist Store"
          loading="eager"
        />
      )}

      {!blocked && loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50 gap-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center animate-pulse">
            <ShoppingBag size={28} className="text-orange-500" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">루티니스트 스토어</p>
            <p className="text-xs text-gray-500 mt-1">쇼핑몰 불러오는 중...</p>
          </div>
          <button
            onClick={openExternal}
            className="text-xs text-orange-600 underline mt-2 px-4 py-1 rounded-full"
          >
            외부 브라우저로 열기
          </button>
        </div>
      )}

      {blocked && (
        <div className="h-full flex flex-col items-center justify-center px-6 space-y-5 bg-gradient-to-br from-orange-50 to-pink-50">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center">
            <AlertCircle size={28} className="text-orange-500" />
          </div>
          <div className="text-center space-y-2 max-w-sm">
            <h2 className="text-lg font-bold text-gray-800">쇼핑몰을 불러올 수 없어요</h2>
            <p className="text-sm text-gray-500 leading-6">
              네트워크가 느리거나 일시적인 연결 문제일 수 있어요.<br/>
              다시 시도하거나 외부 브라우저로 여실 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={handleReload}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl shadow-sm"
            >
              <RefreshCw size={16} /> 다시 시도
            </button>
            <button
              onClick={openExternal}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-3 rounded-xl shadow-md"
            >
              <ExternalLink size={16} /> 외부 브라우저로 열기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
