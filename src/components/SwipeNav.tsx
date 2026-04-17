'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// 하단 탭 순서 — 이 순서대로 좌우 스와이프
const TABS = ['/dashboard', '/map', '/social', '/shop', '/profile'];

const MIN_SWIPE_PX = 70;         // 최소 스와이프 거리
const MAX_VERTICAL_PX = 60;      // 수직 이동이 이 이상이면 스와이프 아님 (스크롤)
const RATIO = 1.8;               // 수평이 수직의 1.8배 이상일 때만 스와이프 인정
const EDGE_IGNORE_PX = 20;       // 화면 좌우 가장자리 (시스템 제스처 영역) 제외

/**
 * 좌우 스와이프로 하단 탭을 순차 이동.
 * 탭 그룹 레이아웃 안에서만 동작 (pathname 이 TABS 중 하나).
 */
export default function SwipeNav() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let startX = 0, startY = 0, tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) { tracking = false; return; }
      const t = e.touches[0];
      // 가장자리 시스템 제스처 영역 제외
      if (t.clientX < EDGE_IGNORE_PX || t.clientX > window.innerWidth - EDGE_IGNORE_PX) {
        tracking = false;
        return;
      }
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (Math.abs(dx) < MIN_SWIPE_PX) return;
      if (Math.abs(dy) > MAX_VERTICAL_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * RATIO) return;

      const idx = TABS.findIndex(tab => pathname === tab || pathname.startsWith(tab + '/'));
      if (idx < 0) return;

      if (dx < 0 && idx < TABS.length - 1) {
        router.push(TABS[idx + 1]);
      } else if (dx > 0 && idx > 0) {
        router.push(TABS[idx - 1]);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [pathname, router]);

  return null;
}
