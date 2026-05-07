import type { ChartData } from 'chart.js';
import type { Movie } from '../types/movie';
import { CHART_PALETTE } from './chartTheme';

export function groupByField(movies: Movie[], field: keyof Movie): Record<string, number> {
  if (field === 'Genres') {
    return movies.reduce<Record<string, number>>((acc, m) => {
      const raw = m[field] ?? '';
      raw.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) acc[genre] = (acc[genre] ?? 0) + 1;
      });
      return acc;
    }, {});
  }
  return movies.reduce<Record<string, number>>((acc, m) => {
    const k = m[field] ?? 'Unknown';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

export function withOther(data: Record<string, number>, threshold: number): Record<string, number> {
  const result: Record<string, number> = { Other: 0 };
  for (const [k, v] of Object.entries(data)) {
    if (v < threshold) result.Other += v;
    else result[k] = v;
  }
  if (result.Other === 0) delete result.Other;
  return result;
}

export function makeDoughnut(data: Record<string, number>, label: string): ChartData<'doughnut'> {
  return {
    labels: Object.keys(data),
    datasets: [{ label, data: Object.values(data), backgroundColor: CHART_PALETTE, hoverBackgroundColor: CHART_PALETTE }],
  };
}

export function makePolar(data: Record<string, number>, label: string): ChartData<'polarArea'> {
  return {
    labels: Object.keys(data),
    datasets: [{
      label,
      data: Object.values(data),
      backgroundColor: CHART_PALETTE.map(c => c + 'cc'),
      borderColor: CHART_PALETTE,
      borderWidth: 1,
    }],
  };
}

export function parseRevenue(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/[$,\s]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function formatRevenue(n: number): string {
  if (n <= 0) return 'N/A';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
