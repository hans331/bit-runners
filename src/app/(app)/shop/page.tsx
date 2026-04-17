'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';

const CAFE24_URL = 'https://routinist.cafe24.com/m/';

function isNativeApp() {
  return typeof window !== 'undefined' && (window as unknown as { Capacitor?: unknown }).Capacitor !== undefined;
}

export default function ShopPage() {
  const [opening, setOpening] = useState(false);
  const openedOnceRef = useRef(false);

  const openShop = async () => {
    setOpening(true);
    try {
      if (isNativeApp()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({
          url: CAFE24_URL,
          presentationStyle: 'popover',
        });
      } else {
        window.open(CAFE24_URL, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setOpening(false);
    }
  };

  // 탭 진입 시 1회 자동으로 브라우저 열기
  useEffect(() => {
    if (openedOnceRef.current) return;
    openedOnceRef.current = true;
    openShop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 space-y-6">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-blue-400 flex items-center justify-center shadow-lg">
        <ShoppingBag size={48} className="text-white" />
      </div>
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Routinist Store</h2>
        <p className="text-sm text-[var(--muted)]">러닝 용품 · 문구 · 이벤트</p>
      </div>

      <button
        onClick={openShop}
        disabled={opening}
        className="w-full max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--accent)] to-blue-500 text-white font-bold py-4 rounded-2xl text-base disabled:opacity-60 shadow-lg active:scale-[0.98] transition-transform"
      >
        <ExternalLink size={20} />
        {opening ? '여는 중...' : '🛍️ 쇼핑몰 열기'}
      </button>

      {/* 안내 — 정보 위계를 명확하게 */}
      <div className="max-w-sm text-center space-y-1.5">
        <p className="text-xs font-medium text-[var(--foreground)]">
          자동으로 열리지 않았나요?
        </p>
        <p className="text-xs text-[var(--muted)] leading-5">
          위 버튼을 눌러 Safari 시트로 쇼핑몰을 여세요.<br />
          결제 · 배송 · 회원가입은 Cafe24 내부에서 진행됩니다.
        </p>
      </div>
    </div>
  );
}
