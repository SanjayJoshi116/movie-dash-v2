import type { ChartData } from 'chart.js';
import type { Movie } from '../types/movie';
import { CHART_PALETTE, withAlpha } from './chartTheme';

// Fields stored as comma-joined lists of full names (catalog-data-format spec) — a movie counts
// once toward each listed value, so a UK/US co-production adds to both countries rather than
// forming its own "United Kingdom, United States of America" bucket.
const MULTI_VALUED_FIELDS: ReadonlySet<keyof Movie> = new Set<keyof Movie>(['Genres', 'Actors/Actresses', 'Production Company', 'Production Country']);

/** The names in a comma-joined list cell, trimmed, blanks left out (`catalog-data-format`). */
export function splitNames(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map((part) => part.trim()).filter((part) => part !== '');
}

export function groupByField(movies: Movie[], field: keyof Movie): Record<string, number> {
  if (MULTI_VALUED_FIELDS.has(field)) {
    return movies.reduce<Record<string, number>>((acc, m) => {
      splitNames(m[field]).forEach((value) => { acc[value] = (acc[value] ?? 0) + 1; });
      return acc;
    }, {});
  }
  return movies.reduce<Record<string, number>>((acc, m) => {
    const k = m[field] || 'Unknown';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

/** The `n` entries with the largest `score`, largest first (ties keep insertion order). */
export function topBy<T>(data: Record<string, T>, n: number, score: (value: T) => number): [string, T][] {
  return Object.entries(data).sort(([, a], [, b]) => score(b) - score(a)).slice(0, n);
}

/** The `n` highest averages from `averagesBy`, highest first, as `[key, average]` pairs. */
export function topAverages(avgs: Record<string, { avg: number }>, n: number): [string, number][] {
  return topBy(avgs, n, (a) => a.avg).map(([key, { avg }]) => [key, avg]);
}

/** The `n` largest counts, largest first (ties keep insertion order). */
export function topN(data: Record<string, number>, n: number): [string, number][] {
  return topBy(data, n, (v) => v);
}

/**
 * Average of `valueOf(movie)` per key: each movie counts toward every key `keysOf` returns, and a
 * `null` value (unknown, e.g. an unrated vote) is skipped entirely — it neither lowers an average
 * nor adds to `count`.
 */
export function averagesBy(
  movies: Movie[],
  keysOf: (m: Movie) => readonly string[],
  valueOf: (m: Movie) => number | null,
): Record<string, { avg: number; count: number }> {
  const sums: Record<string, { sum: number; count: number }> = {};
  movies.forEach((m) => {
    const value = valueOf(m);
    if (value === null) return;
    keysOf(m).forEach((key) => {
      const entry = (sums[key] ??= { sum: 0, count: 0 });
      entry.sum += value;
      entry.count += 1;
    });
  });
  return Object.fromEntries(Object.entries(sums).map(([k, { sum, count }]) => [k, { avg: sum / count, count }]));
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

/** The chart label at `index` when it's a drill-down target, else null — for a chart's click handler and `isClickable`. */
export function drillableLabelAt(labels: readonly unknown[] | undefined, index: number): string | null {
  const label = labels?.[index];
  return typeof label === 'string' && isDrillableLabel(label) ? label : null;
}

/** Every year from `first` to `last` inclusive (empty when either is null), for continuous year axes with gaps kept. */
export function continuousYears(first: number | null, last: number | null): number[] {
  return first === null || last === null ? [] : Array.from({ length: last - first + 1 }, (_, i) => first + i);
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

/**
 * A movie's vote average, or `null` when it's unrated (missing, NaN, or ≤ 0 — TMDB stores "no votes"
 * as 0). The one rule every Stats rating chart uses, so an unrated movie never lowers an average.
 */
export function parseVote(raw: string | undefined): number | null {
  const v = parseFloat(raw ?? '');
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Vote averages are stored with up to 3 decimals. */
export const VOTE_STEP = 0.001;
export const VOTE_MAX = 10;

// A 10/10 from a single vote shouldn't top a rating ranking. Tiny datasets (e.g. the template CSV)
// may have too few qualifying movies — then the cutoff is dropped so the ranking isn't empty.
export const MIN_VOTES_FOR_RATING = 50;
export const MIN_QUALIFYING_FOR_CUTOFF = 10;

/** The movies a "highest rated" ranking picks from (Stats explorer + Dashboard Top Rated share this rule). */
export function ratingPool(movies: Movie[]): { pool: Movie[]; cutoffApplied: boolean } {
  const qualifying = movies.filter(m => (parseInt(m['Vote Count'], 10) || 0) >= MIN_VOTES_FOR_RATING);
  return qualifying.length >= MIN_QUALIFYING_FOR_CUTOFF
    ? { pool: qualifying, cutoffApplied: true }
    : { pool: movies, cutoffApplied: false };
}

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
