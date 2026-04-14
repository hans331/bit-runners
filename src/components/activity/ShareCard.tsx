'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Share2, Download, X, ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import type { Activity } from '@/types';

interface ShareCardProps {
  activity: Activity;
  displayName: string;
  onClose: () => void;
}

type Theme = {
  name: string;
  bg: (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
  accent: string;
  textMain: string;
  textSub: string;
  routeColor: string;
};

const THEMES: Theme[] = [
  {
    name: '미드나잇',
    bg: (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f0c29'); g.addColorStop(0.5, '#302b63'); g.addColorStop(1, '#24243e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    accent: '#818cf8', textMain: '#ffffff', textSub: '#94a3b8', routeColor: '#818cf8',
  },
  {
    name: '선셋',
    bg: (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#f97316'); g.addColorStop(0.4, '#ec4899'); g.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    accent: '#fbbf24', textMain: '#ffffff', textSub: '#fde68a', routeColor: '#ffffff',
  },
  {
    name: '포레스트',
    bg: (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#064e3b'); g.addColorStop(0.5, '#065f46'); g.addColorStop(1, '#0f766e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    accent: '#34d399', textMain: '#ffffff', textSub: '#a7f3d0', routeColor: '#34d399',
  },
  {
    name: '클린 화이트',
    bg: (ctx, W, H) => {
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      // 미세한 도트 패턴
      ctx.fillStyle = '#e2e8f0';
      for (let x = 0; x < W; x += 40) {
        for (let y = 0; y < H; y += 40) {
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    },
    accent: '#3b82f6', textMain: '#1e293b', textSub: '#64748b', routeColor: '#3b82f6',
  },
  {
    name: '네온',
    bg: (ctx, W, H) => {
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      // 그리드 라인
      ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    },
    accent: '#00ff88', textMain: '#ffffff', textSub: '#4ade80', routeColor: '#00ff88',
  },
];

function drawCard(
  canvas: HTMLCanvasElement,
  activity: Activity,
  displayName: string,
  theme: Theme,
  bgImage?: HTMLImageElement | null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;

  // 배경
  if (bgImage) {
    // 사진 배경 + 어두운 오버레이
    const imgRatio = bgImage.width / bgImage.height;
    const canvasRatio = W / H;
    let drawW = W, drawH = H, drawX = 0, drawY = 0;
    if (imgRatio > canvasRatio) {
      drawW = H * imgRatio; drawX = -(drawW - W) / 2;
    } else {
      drawH = W / imgRatio; drawY = -(drawH - H) / 2;
    }
    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
    // 오버레이
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(0,0,0,0.3)');
    overlay.addColorStop(0.4, 'rgba(0,0,0,0.5)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);
  } else {
    theme.bg(ctx, W, H);
  }

  // 경로
  const hasRoute = activity.route_data?.coordinates?.length;
  if (hasRoute) {
    const coords = activity.route_data!.coordinates;
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

    const padding = 120;
    const mapW = W - padding * 2;
    const mapH = H * 0.35;
    const mapY = 200;

    const scaleX = mapW / (maxLng - minLng || 0.001);
    const scaleY = mapH / (maxLat - minLat || 0.001);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (mapW - (maxLng - minLng) * scale) / 2;
    const offsetY = mapY + (mapH - (maxLat - minLat) * scale) / 2;

    // 그림자
    ctx.beginPath();
    coords.forEach(([lng, lat], i) => {
      const x = offsetX + (lng - minLng) * scale;
      const y = offsetY + mapH - (lat - minLat) * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 경로 본체
    ctx.beginPath();
    coords.forEach(([lng, lat], i) => {
      const x = offsetX + (lng - minLng) * scale;
      const y = offsetY + mapH - (lat - minLat) * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = bgImage ? '#ffffff' : theme.routeColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // 시작/끝점
    const [sx, sy] = [offsetX + (coords[0][0] - minLng) * scale, offsetY + mapH - (coords[0][1] - minLat) * scale];
    const last = coords[coords.length - 1];
    const [ex, ey] = [offsetX + (last[0] - minLng) * scale, offsetY + mapH - (last[1] - minLat) * scale];

    ctx.fillStyle = '#22C55E';
    ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(ex, ey, 12, 0, Math.PI * 2); ctx.fill();
  }

  const mainColor = bgImage ? '#ffffff' : theme.textMain;
  const subColor = bgImage ? 'rgba(255,255,255,0.7)' : theme.textSub;
  const accentColor = bgImage ? '#ffffff' : theme.accent;

  // 날짜 (상단)
  ctx.textAlign = 'center';
  ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = subColor;
  const dateStr = new Date(activity.activity_date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  ctx.fillText(dateStr, W / 2, 120);

  // 거리 (메인)
  const distY = hasRoute ? H * 0.55 : H * 0.4;
  ctx.font = 'bold 180px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = mainColor;
  ctx.fillText(activity.distance_km.toFixed(2), W / 2, distY);

  ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = accentColor;
  ctx.fillText('KILOMETERS', W / 2, distY + 60);

  // 구분선
  const lineY = distY + 110;
  ctx.strokeStyle = bgImage ? 'rgba(255,255,255,0.2)' : theme.accent + '40';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, lineY);
  ctx.lineTo(W * 0.8, lineY);
  ctx.stroke();

  // 통계 3열
  const statsY = lineY + 100;
  const stats = [
    { label: '시간', value: activity.duration_seconds ? formatDur(activity.duration_seconds) : '--' },
    { label: '페이스', value: activity.pace_avg_sec_per_km ? formatPc(activity.pace_avg_sec_per_km) : '--' },
    { label: '칼로리', value: activity.calories ? `${activity.calories}` : '--' },
  ];

  stats.forEach((stat, i) => {
    const x = W / 2 + (i - 1) * 280;
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = mainColor;
    ctx.fillText(stat.value, x, statsY);
    ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = subColor;
    ctx.fillText(stat.label, x, statsY + 44);
  });

  // 유저 이름
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = mainColor;
  ctx.fillText(displayName, W / 2, H * 0.86);

  // 브랜딩
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = accentColor;
  ctx.fillText('Routinist', W / 2, H * 0.93);
  ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = subColor;
  ctx.fillText('Run. Track. Share.', W / 2, H * 0.95);
}

function formatDur(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

function formatPc(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}'${String(sec).padStart(2, '0')}"`;
}

export default function ShareCard({ activity, displayName, onClose }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  const generate = useCallback(() => {
    if (!canvasRef.current) return;
    drawCard(canvasRef.current, activity, displayName, THEMES[themeIdx], bgImage);
  }, [activity, displayName, themeIdx, bgImage]);

  useEffect(() => { generate(); }, [generate]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = URL.createObjectURL(file);
  };

  const clearPhoto = () => setBgImage(null);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `routinist-${activity.activity_date}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `routinist-${activity.activity_date}.png`, { type: 'image/png' });
      if (navigator.share) {
        try { await navigator.share({ files: [file], title: `${activity.distance_km.toFixed(2)}km 러닝` }); } catch { handleDownload(); }
      } else { handleDownload(); }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--background)] rounded-2xl max-w-sm w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)] flex-shrink-0">
          <h3 className="text-sm font-bold text-[var(--foreground)]">공유 카드</h3>
          <button onClick={onClose} className="text-[var(--muted)]"><X size={20} /></button>
        </div>

        {/* 캔버스 */}
        <div className="p-4 flex-1 overflow-auto">
          <canvas ref={canvasRef} className="w-full rounded-xl shadow-lg" style={{ aspectRatio: '9/16' }} />
        </div>

        {/* 테마 선택 */}
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setThemeIdx((themeIdx - 1 + THEMES.length) % THEMES.length)} className="p-1 text-[var(--muted)]">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 flex justify-center gap-2">
              {THEMES.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => setThemeIdx(i)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    i === themeIdx && !bgImage
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--card)] text-[var(--muted)]'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button onClick={() => setThemeIdx((themeIdx + 1) % THEMES.length)} className="p-1 text-[var(--muted)]">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* 사진 배경 */}
        <div className="px-4 pb-2 flex-shrink-0">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-xs font-semibold text-[var(--foreground)]"
            >
              <ImagePlus size={14} /> {bgImage ? '사진 변경' : '배경 사진 추가'}
            </button>
            {bgImage && (
              <button onClick={clearPhoto} className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-xs text-[var(--muted)]">
                제거
              </button>
            )}
          </div>
        </div>

        {/* 공유 버튼 */}
        <div className="flex gap-3 px-4 pb-4 pt-2 flex-shrink-0">
          <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] font-semibold text-sm">
            <Download size={18} /> 저장
          </button>
          <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm">
            <Share2 size={18} /> 공유
          </button>
        </div>
      </div>
    </div>
  );
}
