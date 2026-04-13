'use client';

import { useRef, useState, useCallback } from 'react';
import { Share2, Download, X } from 'lucide-react';
import type { Activity } from '@/types';

interface ShareCardProps {
  activity: Activity;
  displayName: string;
  onClose: () => void;
}

function drawCard(
  canvas: HTMLCanvasElement,
  activity: Activity,
  displayName: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 1080;
  const H = 1920; // 9:16 Instagram Stories
  canvas.width = W;
  canvas.height = H;

  // 배경 그라데이션
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(0.5, '#16213e');
  grad.addColorStop(1, '#0f3460');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 경로 그리기
  if (activity.route_data?.coordinates?.length) {
    const coords = activity.route_data.coordinates;
    const lats = coords.map((c) => c[1]);
    const lngs = coords.map((c) => c[0]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padding = 120;
    const mapW = W - padding * 2;
    const mapH = H * 0.4;
    const mapY = 300;

    const scaleX = mapW / (maxLng - minLng || 0.001);
    const scaleY = mapH / (maxLat - minLat || 0.001);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (mapW - (maxLng - minLng) * scale) / 2;
    const offsetY = mapY + (mapH - (maxLat - minLat) * scale) / 2;

    ctx.beginPath();
    coords.forEach(([lng, lat], i) => {
      const x = offsetX + (lng - minLng) * scale;
      const y = offsetY + mapH - (lat - minLat) * scale; // Y 반전
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 시작/끝점
    const start = coords[0];
    const end = coords[coords.length - 1];
    const sx = offsetX + (start[0] - minLng) * scale;
    const sy = offsetY + mapH - (start[1] - minLat) * scale;
    const ex = offsetX + (end[0] - minLng) * scale;
    const ey = offsetY + mapH - (end[1] - minLat) * scale;

    ctx.fillStyle = '#22C55E';
    ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(ex, ey, 10, 0, Math.PI * 2); ctx.fill();
  }

  // 거리 (메인 숫자)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 160px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(activity.distance_km.toFixed(2), W / 2, H * 0.58);

  ctx.font = '48px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('km', W / 2, H * 0.62);

  // 통계 행
  const statsY = H * 0.7;
  const stats = [
    { label: '시간', value: activity.duration_seconds ? formatDur(activity.duration_seconds) : '--' },
    { label: '페이스', value: activity.pace_avg_sec_per_km ? formatPc(activity.pace_avg_sec_per_km) : '--' },
  ];

  stats.forEach((stat, i) => {
    const x = W / 2 + (i - 0.5) * 300;
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(stat.value, x, statsY);
    ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(stat.label, x, statsY + 50);
  });

  // 날짜
  ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#94a3b8';
  const dateStr = new Date(activity.activity_date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  ctx.fillText(dateStr, W / 2, H * 0.8);

  // 유저 이름
  ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(displayName, W / 2, H * 0.86);

  // 브랜딩
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#3B82F6';
  ctx.fillText('Routinist', W / 2, H * 0.94);
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
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(() => {
    if (!canvasRef.current) return;
    drawCard(canvasRef.current, activity, displayName);
    setGenerated(true);
  }, [activity, displayName]);

  // 생성 시 자동 실행
  useState(() => { setTimeout(generate, 100); });

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
        try {
          await navigator.share({ files: [file], title: `${activity.distance_km.toFixed(2)}km 러닝` });
        } catch {
          handleDownload();
        }
      } else {
        handleDownload();
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[var(--background)] rounded-2xl max-w-sm w-full overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <h3 className="text-sm font-bold text-[var(--foreground)]">공유 카드</h3>
          <button onClick={onClose} className="text-[var(--muted)]"><X size={20} /></button>
        </div>

        {/* 캔버스 미리보기 */}
        <div className="p-4">
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            style={{ aspectRatio: '9/16' }}
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 px-4 pb-4">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] font-semibold text-sm"
          >
            <Download size={18} /> 저장
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm"
          >
            <Share2 size={18} /> 공유
          </button>
        </div>
      </div>
    </div>
  );
}
