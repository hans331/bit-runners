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
};

export function getTooltipStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? chartColors.tooltipBgDark : chartColors.tooltipBg,
    border: `1px solid ${isDark ? chartColors.tooltipBorderDark : chartColors.tooltipBorder}`,
    borderRadius: '12px',
    color: isDark ? '#e2e8f0' : '#1e293b',
    fontSize: 12,
    padding: '8px 12px',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
  };
}

export function getAxisColor(isDark: boolean) {
  return isDark ? chartColors.gridDark : chartColors.grid;
}

export function getTextColor(isDark: boolean) {
  return isDark ? chartColors.textDark : chartColors.text;
}
