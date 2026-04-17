'use client';

import { useState, useRef } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';

const CAFE24_URL = 'https://routinist.cafe24.com/m/';

export default function ShopPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleReload = () => {
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 상단 미니 컨트롤 바 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--card-border)] bg-[var(--card)]">
        <span className="text-xs text-[var(--muted)]">routinist.cafe24.com</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReload}
            className="p-2 rounded-lg hover:bg-[var(--card-border)]/50 text-[var(--muted)]"
            aria-label="새로고침"
          >
            <RefreshCw size={16} />
          </button>
          <a
            href={CAFE24_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-[var(--card-border)]/50 text-[var(--muted)]"
            aria-label="외부 브라우저에서 열기"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Cafe24 모바일 스토어 */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)] z-10">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        )}
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={CAFE24_URL}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          allow="clipboard-read; clipboard-write; payment; geolocation"
          title="Routinist Store"
        />
      </div>
    </div>
  );
}
