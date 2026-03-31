import { useState, useCallback } from 'react';
import type { FilterState } from '../types/movie';

const STORAGE_KEY = 'movieDash_filters_v1';

export function usePersistedFilters(defaults: FilterState): [FilterState, (f: FilterState) => void] {
  const [filters, setFiltersRaw] = useState<FilterState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...defaults, ...JSON.parse(stored) };
    } catch { /* ignore parse errors or private-browsing restrictions */ }
    return defaults;
  });

  const setFilters = useCallback((next: FilterState) => {
    setFiltersRaw(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore quota errors */ }
  }, []);

  return [filters, setFilters];
}
