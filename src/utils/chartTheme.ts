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

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const FONT_SIZE = { label: 13, body: 14, value: 28, hero: 40 } as const;

// _isDark kept for call-site compatibility; theme switching is now driven by CSS vars
export const getCardStyle = (_isDark: boolean): React.CSSProperties => ({
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  boxShadow: 'var(--glass-shadow)',
});
