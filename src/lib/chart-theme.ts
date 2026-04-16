// 차트 공통 테마 설정

export const chartColors = {
  grid: '#e2e8f0',
  gridDark: '#1e2d4a',
  axis: '#94a3b8',
  tooltipBg: '#ffffff',
  tooltipBgDark: '#131c31',
  tooltipBorder: '#e2e8f0',
  tooltipBorderDark: '#1e2d4a',
  text: '#475569',
  textDark: '#94a3b8',
  // 메인 팔레트 (세련된 그라데이션용)
  primary: '#3B82F6',
  primaryLight: '#93C5FD',
  secondary: '#8B5CF6',
  secondaryLight: '#C4B5FD',
  success: '#10B981',
  successLight: '#6EE7B7',
  warning: '#F59E0B',
  danger: '#EF4444',
  accent: '#06B6D4',
  prev: '#CBD5E1',
};

// 다중 시리즈 차트용 컬러 팔레트
export const chartPalette = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

export function getTooltipStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? chartColors.tooltipBgDark : chartColors.tooltipBg,
    border: `1px solid ${isDark ? chartColors.tooltipBorderDark : chartColors.tooltipBorder}`,
    borderRadius: '14px',
    color: isDark ? '#e2e8f0' : '#1e293b',
    fontSize: 13,
    padding: '10px 14px',
    boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.1)',
  };
}

export function getAxisColor(isDark: boolean) {
  return isDark ? chartColors.gridDark : chartColors.grid;
}

export function getTextColor(isDark: boolean) {
  return isDark ? chartColors.textDark : chartColors.text;
}

// 차트 공통 스타일 상수
export const chartStyle = {
  barRadius: [6, 6, 0, 0] as [number, number, number, number],
  barRadiusSmall: [4, 4, 0, 0] as [number, number, number, number],
  gridDash: '3 6',
  animationDuration: 800,
  animationEasing: 'ease-out' as const,
  dotRadius: 4,
  activeDotRadius: 6,
  strokeWidth: 2.5,
  tickFontSize: 12,
  labelFontSize: 13,
};
