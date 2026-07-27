import { useState, useCallback } from 'react';
import type { FilterState } from '../types/movie';

const OLD_STORAGE_KEY = 'movieDash_filters_v1';
const STORAGE_KEY = 'movieDash_filters_v2';

export function usePersistedFilters(defaults: FilterState): [FilterState, (f: FilterState) => void] {
  const [filters, setFiltersRaw] = useState<FilterState>(() => {
    try {
      localStorage.removeItem(OLD_STORAGE_KEY);
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) return { ...defaults, ...JSON.parse(stored) };
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
