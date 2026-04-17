// 앱 아이콘 + 스플래시 재생성 — AppLogo.tsx와 같은 디자인을 꽉 찬 정사각형으로
// 실행: node scripts/generate-icons.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

// 7×5 그리드 — 원본 아이콘과 동일한 "R" 패턴 (IMG_3501 기준)
// 값: 0=배경(매우 어두움), 1=밝은 초록, 2=중간 초록, 3=진한 초록, -1=빈 칸
const GRID = [
  [-1,  1,  2,  2,  3, -1, -1],
  [-1,  2, -1, -1, -1,  1, -1],
  [-1,  2,  2,  2,  1, -1, -1],
  [-1,  2, -1,  3, -1, -1, -1],
  [-1,  1, -1, -1,  2, -1, -1],
];
const COLS = GRID[0].length; // 7
const ROWS = GRID.length;    // 5

const COLORS = {
  '-1': null,
  '0': 'rgba(255,255,255,0.04)',
  '1': '#4ade80',
  '2': '#22c55e',
  '3': '#16a34a',
};
const BG = '#0f1729';

function buildSvg(size, { padRatio = 0.12, showDim = 'square' } = {}) {
  // showDim='square' 은 정사각형 영역에 그리드 꽉 차게
  // 그리드 영역: size × (size * ROWS/COLS)  → 가로가 길어서 세로 여백이 생김
  // 정사각형에 꽉 채우려면 COLS, ROWS 중 작은 쪽에 맞추고 나머지는 크롭/센터
  const pad = size * padRatio;
  const inner = size - pad * 2;
  // 그리드는 7×5 비율, 아이콘은 정사각. 가로에 맞추면 위아래 여백. 세로에 맞추면 좌우 크롭.
  // 사용자는 "꽉 차게" 원함 → 가로폭이 inner와 같고, 세로폭은 inner * 5/7 (중앙 배치)
  const cellGap = inner * 0.015;
  const cellSizeByWidth = (inner - cellGap * (COLS - 1)) / COLS;
  const cellSizeByHeight = (inner - cellGap * (ROWS - 1)) / ROWS;
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
  const gridW = cellSize * COLS + cellGap * (COLS - 1);
  const gridH = cellSize * ROWS + cellGap * (ROWS - 1);
  const offsetX = (size - gridW) / 2;
  const offsetY = (size - gridH) / 2;

  let rects = '';
  GRID.forEach((row, y) => {
    row.forEach((cell, x) => {
      const color = COLORS[String(cell)];
      if (!color) return;
      const rx = cellSize * 0.18;
      rects += `<rect x="${offsetX + x * (cellSize + cellGap)}" y="${offsetY + y * (cellSize + cellGap)}" width="${cellSize}" height="${cellSize}" rx="${rx}" fill="${color}"/>`;
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${BG}"/>${rects}</svg>`;
}

async function write(filePath, size, opts = {}) {
  const abs = path.join(ROOT, filePath);
  const svg = buildSvg(size, opts);
  await sharp(Buffer.from(svg)).png().toFile(abs);
  console.log(`  ✓ ${filePath} (${size}×${size})`);
}

async function writeSplash(filePath, size) {
  const abs = path.join(ROOT, filePath);
  // 스플래시: 흰 배경(Capacitor SplashScreen backgroundColor와 일치), 중앙에 아이콘 크게
  const iconSize = Math.round(size * 0.4);
  const iconSvg = buildSvg(iconSize, { padRatio: 0 });
  const iconBuf = await sharp(Buffer.from(iconSvg)).png().toBuffer();

  const round = Math.round(iconSize * 0.2);
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}"><rect width="${iconSize}" height="${iconSize}" rx="${round}" ry="${round}" fill="white"/></svg>`;
  const rounded = await sharp(iconBuf)
    .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 흰 배경 (SplashScreen backgroundColor #ffffff와 매칭)
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#ffffff"/></svg>`;
  await sharp(Buffer.from(bgSvg))
    .composite([{ input: rounded, gravity: 'center' }])
    .png()
    .toFile(abs);
  console.log(`  ✓ ${filePath} (${size}×${size}, icon ${iconSize})`);
}

console.log('앱 아이콘 생성 중...');
await write('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024);
await write('public/apple-touch-icon.png', 180);
await write('public/icon-192.png', 192);
await write('public/favicon.png', 64);
await write('public/favicon-32.png', 32);
await write('public/bit_run.png', 1024);

console.log('\n스플래시 생성 중...');
await writeSplash('ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png', 2732);
await writeSplash('ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png', 2732);
await writeSplash('ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png', 2732);

console.log('\n완료! 다음 빌드에 반영됩니다.');
