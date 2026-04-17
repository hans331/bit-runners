'use client';

/**
 * Routinist 앱 로고 — 잔디 블록 "R" 스타일
 * 앱 아이콘과 동일한 디자인을 SVG로 재현
 */
export default function AppLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  // 7x5 그리드에서 "R"자를 표현하는 블록 맵
  // 1=밝은 초록, 2=중간 초록, 3=진한 초록, 0=배경(어두운)
  const grid = [
    [2, 3, 2, 2, 0],
    [2, 0, 0, 1, 0],
    [2, 3, 3, 0, 0],
    [2, 0, 2, 0, 0],
    [2, 0, 0, 3, 0],
  ];

  const colors: Record<number, string> = {
    0: 'rgba(255,255,255,0.06)',
    1: '#4ade80', // green-400
    2: '#22c55e', // green-500
    3: '#16a34a', // green-600
  };

  // 5개 블록 + 6개 gap (양 끝 + 사이 4개) = size
  const gapRatio = 0.04; // size 대비 gap 비율
  const gap = size * gapRatio;
  const blockSize = (size - gap * 6) / 5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ borderRadius: size * 0.2 }}
    >
      <rect width={size} height={size} rx={size * 0.2} fill="#1a1a2e" />
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <rect
            key={`${x}-${y}`}
            x={gap + x * (blockSize + gap)}
            y={gap + y * (blockSize + gap)}
            width={blockSize}
            height={blockSize}
            rx={blockSize * 0.15}
            fill={colors[cell]}
          />
        ))
      )}
    </svg>
  );
}
