import { useState, useCallback } from 'react';
import type { FilterState } from '../types/movie';

const OLD_STORAGE_KEY = 'movieDash_filters_v1';
const STORAGE_KEY = 'movieDash_filters_v2';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isRange(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2
    && value.every((v) => typeof v === 'number' && Number.isFinite(v))
    && value[0] <= value[1];
}

/**
 * Field-by-field shape check of filters restored from sessionStorage: a corrupted or stale field
 * falls back to its default instead of crashing the Movies page (e.g. `genres: null` used to throw
 * on `.length`); valid fields are kept. Range clamping against the data happens in Movies.tsx,
 * since this hook doesn't know the data.
 */
export function sanitizeFilters(raw: unknown, defaults: FilterState): FilterState {
  if (typeof raw !== 'object' || raw === null) return defaults;
  const r = raw as Record<string, unknown>;
  const range = (v: unknown, fallback: [number, number] | null) => (v === null ? null : isRange(v) ? v : fallback);
  return {
    search: typeof r.search === 'string' ? r.search : defaults.search,
    languages: isStringArray(r.languages) ? r.languages : defaults.languages,
    genres: isStringArray(r.genres) ? r.genres : defaults.genres,
    directors: isStringArray(r.directors) ? r.directors : defaults.directors,
    yearRange: range(r.yearRange, defaults.yearRange),
    voteRange: range(r.voteRange, defaults.voteRange),
    runtimeRange: range(r.runtimeRange, defaults.runtimeRange),
    revenueRange: range(r.revenueRange, defaults.revenueRange),
  };
}

export function usePersistedFilters(defaults: FilterState): [FilterState, (f: FilterState) => void] {
  const [filters, setFiltersRaw] = useState<FilterState>(() => {
    try {
      localStorage.removeItem(OLD_STORAGE_KEY);
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) return sanitizeFilters(JSON.parse(stored), defaults);
    } catch { /* ignore parse errors or private-browsing restrictions */ }
    return defaults;
  });

  const setFilters = useCallback((next: FilterState) => {
    setFiltersRaw(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore quota errors */ }
  }, []);

  return [filters, setFilters];
}
