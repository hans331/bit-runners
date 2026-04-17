'use client';

/**
 * Routinist 앱 로고 — 잔디 블록 "R" 스타일
 * 앱 아이콘(iOS AppIcon) 과 동일한 7×5 그리드 디자인
 */
export default function AppLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  // 7×5 그리드 — 앱 아이콘과 동일
  // -1=빈칸, 1=밝은 초록, 2=중간 초록, 3=진한 초록
  const GRID: number[][] = [
    [-1,  1,  2,  2,  3, -1, -1],
    [-1,  2, -1, -1, -1,  1, -1],
    [-1,  2,  2,  2,  1, -1, -1],
    [-1,  2, -1,  3, -1, -1, -1],
    [-1,  1, -1, -1,  2, -1, -1],
  ];
  const COLS = 7;
  const ROWS = 5;

  const colors: Record<number, string> = {
    1: '#4ade80',
    2: '#22c55e',
    3: '#16a34a',
  };

  const padRatio = 0.12;
  const pad = size * padRatio;
  const inner = size - pad * 2;
  const cellGap = inner * 0.015;
  const cellSizeByWidth = (inner - cellGap * (COLS - 1)) / COLS;
  const cellSizeByHeight = (inner - cellGap * (ROWS - 1)) / ROWS;
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
  const gridW = cellSize * COLS + cellGap * (COLS - 1);
  const gridH = cellSize * ROWS + cellGap * (ROWS - 1);
  const offsetX = (size - gridW) / 2;
  const offsetY = (size - gridH) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ borderRadius: size * 0.2 }}
    >
      <rect width={size} height={size} rx={size * 0.2} fill="#0f1729" />
      {GRID.map((row, y) =>
        row.map((cell, x) => {
          if (cell === -1) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={offsetX + x * (cellSize + cellGap)}
              y={offsetY + y * (cellSize + cellGap)}
              width={cellSize}
              height={cellSize}
              rx={cellSize * 0.18}
              fill={colors[cell]}
            />
          );
        })
      )}
    </svg>
  );
}
