import React, { createContext, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router';
import type { FilterState } from '../types/movie';

type YearScope = [number, number] | null;

// The Stats page's Release Year Range. Charts there are computed from year-scoped movies, so a
// drill-down must carry that scope too — otherwise "Drama (40)" in 2010–2015 would open every
// Drama film. Outside a provider (e.g. the Dashboard) the scope is null and drill-downs are unscoped.
const DrilldownScopeContext = createContext<YearScope>(null);

export const DrilldownScopeProvider: React.FC<{ yearRange: YearScope; children: React.ReactNode }> = ({ yearRange, children }) => (
  <DrilldownScopeContext.Provider value={yearRange}>{children}</DrilldownScopeContext.Provider>
);

function intersect(a: [number, number], b: [number, number]): [number, number] | null {
  const lo = Math.max(a[0], b[0]);
  const hi = Math.min(a[1], b[1]);
  return lo <= hi ? [lo, hi] : null;
}

/**
 * Navigates to /movies pre-filtered by `preset`, merged with the surrounding year scope (if any).
 * A preset that selects years itself (a year or decade click) is intersected with the scope;
 * an empty intersection means the chart couldn't have shown that element, so nothing happens.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider, same as MoviesContext/ThemeContext
export function useDrillDown(): (preset: Partial<FilterState>) => void {
  const navigate = useNavigate();
  const scope = useContext(DrilldownScopeContext);
  return useCallback((preset: Partial<FilterState>) => {
    let presetFilters = preset;
    if (scope) {
      const yearRange = preset.yearRange ? intersect(preset.yearRange, scope) : scope;
      if (!yearRange) return;
      presetFilters = { ...preset, yearRange };
    }
    navigate('/movies', { state: { presetFilters } });
  }, [navigate, scope]);
}
