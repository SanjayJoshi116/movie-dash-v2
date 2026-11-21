import type React from 'react';

export const CHART_PALETTE = [
  '#7C93E0', // muted indigo
  '#5FB3A3', // muted teal
  '#D98E73', // muted terracotta
  '#C9A15C', // muted amber
  '#8E8FC7', // muted violet
  '#6FA8C9', // muted sky
  '#B08BC4', // muted plum
  '#82A87A', // muted sage
];

// Single-series charts (one colour per chart, colour encodes nothing) pick one palette entry —
// never cycle CHART_PALETTE across a single series' bars. Hover colours are left to Chart.js.
export const CHART_PRIMARY = CHART_PALETTE[0];
// Semantic pair for signed values (e.g. profit vs loss).
export const CHART_POSITIVE = CHART_PALETTE[7];
export const CHART_NEGATIVE = CHART_PALETTE[2];

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * `#RGB` / `#RRGGBB` → `rgba(r, g, b, alpha)`, for fills/heatmaps derived from a palette colour.
 * Throws a TypeError for any other format, so a bad colour fails on first render instead of
 * silently rendering the wrong one.
 */
export const withAlpha = (hex: string, alpha: number): string => {
  const match = HEX_COLOR.exec(hex);
  if (!match) throw new TypeError('withAlpha expects #RGB or #RRGGBB');
  const digits = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  const n = parseInt(digits, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const FONT_SIZE = { label: 13, body: 14, value: 28, hero: 40 } as const;

// _isDark kept (optional) for call-site compatibility; theme switching is now driven by CSS vars
export const getCardStyle = (_isDark?: boolean): React.CSSProperties => ({
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  boxShadow: 'var(--glass-shadow)',
});
