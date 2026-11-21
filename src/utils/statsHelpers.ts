import type { ChartData } from 'chart.js';
import type { Movie } from '../types/movie';
import { CHART_PALETTE, withAlpha } from './chartTheme';

// Fields stored as comma-joined lists of full names (catalog-data-format spec) — a movie counts
// once toward each listed value, so a UK/US co-production adds to both countries rather than
// forming its own "United Kingdom, United States of America" bucket.
const MULTI_VALUED_FIELDS: ReadonlySet<keyof Movie> = new Set<keyof Movie>(['Genres', 'Production Company', 'Production Country']);

export function groupByField(movies: Movie[], field: keyof Movie): Record<string, number> {
  if (MULTI_VALUED_FIELDS.has(field)) {
    return movies.reduce<Record<string, number>>((acc, m) => {
      const raw = m[field] ?? '';
      raw.split(',').forEach(part => {
        const value = part.trim();
        if (value) acc[value] = (acc[value] ?? 0) + 1;
      });
      return acc;
    }, {});
  }
  return movies.reduce<Record<string, number>>((acc, m) => {
    const k = m[field] || 'Unknown';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

// Category charts keep at most `n` named slices plus "Other", so with n ≤ 7 the 8-colour
// CHART_PALETTE never repeats within one chart.
export const MAX_NAMED_CATEGORIES = 7;

export function topNWithOther(data: Record<string, number>, n: number = MAX_NAMED_CATEGORIES): Record<string, number> {
  const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);
  const result: Record<string, number> = Object.fromEntries(sorted.slice(0, n));
  const otherTotal = sorted.slice(n).reduce((sum, [, v]) => sum + v, 0);
  if (otherTotal > 0) result.Other = (result.Other ?? 0) + otherTotal;
  return result;
}

/** Labels that stand for "missing" or "many categories" — never drill-down targets. */
export function isDrillableLabel(label: string | undefined | null): label is string {
  return !!label && label !== 'Other' && label !== 'Unknown';
}

// ── Buckets ────────────────────────────────────────────────────────────────
// A chart's buckets are declared once and used both to count and to build the drill-down
// filter, so the list a click opens always matches the bar. Buckets are half-open
// [min, maxExclusive); the last bucket of a domain uses maxExclusive = Infinity.

export interface Bucket {
  label: string;
  min: number;
  maxExclusive: number;
}

export function bucketIndexOf(value: number, buckets: readonly Bucket[]): number {
  return buckets.findIndex((b) => value >= b.min && value < b.maxExclusive);
}

export function countIntoBuckets(values: number[], buckets: readonly Bucket[]): number[] {
  const counts = buckets.map(() => 0);
  values.forEach((v) => {
    const i = bucketIndexOf(v, buckets);
    if (i >= 0) counts[i] += 1;
  });
  return counts;
}

/**
 * Converts a half-open bucket into the Movies page's inclusive [lo, hi] range filter:
 * hi = maxExclusive − step (step = the data's precision), or `domainMax` for an open-ended bucket.
 */
export function bucketToRange(bucket: Bucket, step: number, domainMax: number): [number, number] {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const hi = Number.isFinite(bucket.maxExclusive)
    ? Number((bucket.maxExclusive - step).toFixed(decimals))
    : Math.max(bucket.min, domainMax);
  return [bucket.min, hi];
}

/** Vote averages are stored with up to 3 decimals. */
export const VOTE_STEP = 0.001;
export const VOTE_MAX = 10;

export function makeDoughnut(data: Record<string, number>, label: string): ChartData<'doughnut'> {
  return {
    labels: Object.keys(data),
    datasets: [{ label, data: Object.values(data), backgroundColor: CHART_PALETTE }],
  };
}

export function makePolar(data: Record<string, number>, label: string): ChartData<'polarArea'> {
  return {
    labels: Object.keys(data),
    datasets: [{
      label,
      data: Object.values(data),
      backgroundColor: CHART_PALETTE.map(c => withAlpha(c, 0.8)),
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

// Largest first: [size, suffix, decimals].
const REVENUE_UNITS: readonly (readonly [number, string, number])[] = [
  [1_000_000_000, 'B', 1],
  [1_000_000, 'M', 1],
  [1_000, 'K', 0],
];

const formatInUnit = (n: number, [size, suffix, digits]: readonly [number, string, number]): string =>
  `$${(n / size).toFixed(digits)}${suffix}`;

// Used for aggregates, axis ticks, slider/chip bounds — so 0 is a real "$0", not "missing".
// Rounds first, then moves up a unit if the rounded value reaches 1000 (999,600 → $1.0M, not $1000K).
export function formatRevenue(n: number): string {
  if (!Number.isFinite(n)) return 'N/A';
  if (n < 0) return `-${formatRevenue(-n)}`;
  if (n === 0) return '$0';
  for (let i = 0; i < REVENUE_UNITS.length; i++) {
    const unit = REVENUE_UNITS[i];
    if (n < unit[0]) continue;
    const rounded = Number((n / unit[0]).toFixed(unit[2]));
    return rounded >= 1000 && i > 0 ? formatInUnit(n, REVENUE_UNITS[i - 1]) : formatInUnit(n, unit);
  }
  const whole = Math.round(n);
  return whole >= 1000 ? formatInUnit(n, REVENUE_UNITS[REVENUE_UNITS.length - 1]) : `$${whole}`;
}
