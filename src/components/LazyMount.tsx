'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 뷰포트에 들어올 때만 children을 마운트.
 * 홈의 차트 섹션들을 감싸면 초기 렌더 시 화면 밖 차트는 건너뛰어 체감 성능이 빨라짐.
 */
export default function LazyMount({
  children,
  minHeight = 200,
  rootMargin = '200px',
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;

    // IntersectionObserver 미지원 환경은 즉시 표시
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return (
    <div ref={ref} style={shown ? undefined : { minHeight }}>
      {shown ? children : null}
    </div>
  );
}
