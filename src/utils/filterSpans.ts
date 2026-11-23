import type { FilterState, Movie } from '../types/movie';
import { parseRevenue } from './statsHelpers';

export interface FilterSpans {
  yearMin: number;
  yearMax: number;
  runtimeMin: number;
  runtimeMax: number;
  revenueMin: number;
  revenueMax: number;
}

/** Min/max of each range-filterable field in the data — the range sliders' bounds. */
export function computeFilterSpans(movies: Movie[]): FilterSpans {
  let yLo = Infinity, yHi = -Infinity;
  let rLo = Infinity, rHi = -Infinity;
  let revLo = Infinity, revHi = -Infinity;
  movies.forEach((m) => {
    const y = parseInt(m['Release Year'], 10);
    if (!isNaN(y)) { if (y < yLo) yLo = y; if (y > yHi) yHi = y; }
    const r = parseInt(m.Runtime, 10);
    if (r > 0) { if (r < rLo) rLo = r; if (r > rHi) rHi = r; } // runtime ≤ 0 = unknown (B119)
    const rev = parseRevenue(m['Box Office Revenue']);
    if (rev > 0) { if (rev < revLo) revLo = rev; if (rev > revHi) revHi = rev; }
  });
  return {
    yearMin: isFinite(yLo) ? yLo : 1900,
    yearMax: isFinite(yHi) ? yHi : new Date().getFullYear(),
    runtimeMin: isFinite(rLo) ? rLo : 0,
    runtimeMax: isFinite(rHi) ? rHi : 240,
    revenueMin: isFinite(revLo) ? revLo : 0,
    revenueMax: isFinite(revHi) ? revHi : 1_000_000_000,
  };
}

/**
 * Clamps `range` to `[min, max]`; a range covering the whole span becomes null (no filter). Returns
 * `range` itself when nothing changed. A range with no overlap is kept as-is by default (Movies: it
 * matches nothing, but its chip stays visible so the user can remove it); `resetOnNoOverlap` makes it
 * null instead (Stats, which has no chip to show a stale range).
 */
export function clampRange(
  range: [number, number] | null, min: number, max: number, resetOnNoOverlap = false,
): [number, number] | null {
  if (!range) return null;
  const lo = Math.min(Math.max(range[0], min), max);
  const hi = Math.min(Math.max(range[1], min), max);
  if (lo > hi || range[1] < min || range[0] > max) return resetOnNoOverlap ? null : range;
  if (lo <= min && hi >= max) return null; // clamps to the full span = no filter
  return lo === range[0] && hi === range[1] ? range : [lo, hi];
}

/**
 * Clamps restored year/runtime/revenue ranges to the current data's span (the data may have
 * changed since they were saved — e.g. after deletes). Returns `filters` itself if nothing changed.
 */
export function clampFiltersToSpans(filters: FilterState, spans: FilterSpans): FilterState {
  const yearRange = clampRange(filters.yearRange, spans.yearMin, spans.yearMax);
  const runtimeRange = clampRange(filters.runtimeRange, spans.runtimeMin, spans.runtimeMax);
  const revenueRange = clampRange(filters.revenueRange, spans.revenueMin, spans.revenueMax);
  if (yearRange === filters.yearRange && runtimeRange === filters.runtimeRange && revenueRange === filters.revenueRange) {
    return filters;
  }
  return { ...filters, yearRange, runtimeRange, revenueRange };
}

/**
 * The value a slider with this `min`/`max`/`step` shows for `v` — the same alignment
 * `@rc-component/slider` applies (nearest step from `min`, decimals cut to the inputs' precision,
 * `min` and `max` always allowed). `RangeSlider` uses it to tell an untouched handle from a moved one.
 */
export function alignToStep(v: number, min: number, max: number, step: number | null | undefined): number {
  const clamped = Math.min(Math.max(v, min), max);
  if (!step || step <= 0) return clamped;
  const decimals = (n: number) => (String(n).split('.')[1] ?? '').length;
  const fixed = Number((min + Math.round((clamped - min) / step) * step).toFixed(Math.max(decimals(step), decimals(min), decimals(max))));
  const candidates = fixed >= min && fixed <= max ? [fixed, min, max] : [min, max];
  // Same tie-break as rc-slider: on equal distance the later candidate wins.
  let best = candidates[0];
  for (const c of candidates) if (Math.abs(clamped - c) <= Math.abs(clamped - best)) best = c;
  return best;
}

/** The largest 1, 2 or 5 × 10^k not above `x` (at least 1) — a readable slider step. */
export function niceStep(x: number): number {
  if (!Number.isFinite(x) || x <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(x));
  const lead = x / pow;
  return (lead >= 5 ? 5 : lead >= 2 ? 2 : 1) * pow;
}
