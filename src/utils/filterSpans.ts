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
    if (!isNaN(r)) { if (r < rLo) rLo = r; if (r > rHi) rHi = r; }
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

function clampRange(range: [number, number] | null, min: number, max: number): [number, number] | null {
  if (!range) return null;
  const lo = Math.min(Math.max(range[0], min), max);
  const hi = Math.min(Math.max(range[1], min), max);
  // No overlap with the data at all: keep it as-is (matches nothing, but its chip stays visible
  // so the user can see and remove it) rather than silently dropping or inverting it.
  if (lo > hi || range[1] < min || range[0] > max) return range;
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
