import { useMemo } from 'react';
import type { ActiveElement, ChartEvent } from 'chart.js';
import { useLatest } from '../../hooks/useLatest';

/** The click props every clickable chart wrapper takes, read through `useLatest` at event time. */
export interface ClickProps {
  onElementClick?: (index: number) => void;
  /** Elements for which this returns false (e.g. "Other"/"Unknown") get no pointer cursor and no click. */
  isClickable?: (index: number) => boolean;
}

/**
 * Chart.js `onClick`/`onHover` that read the latest props from `latest` when they fire, so the
 * options object built around them doesn't depend on the caller's function identities (B13).
 * Both use the same element list and the same `isClickable` check, so the pointer cursor shows
 * exactly where a click drills down (the e2e drill-down tests rely on that cursor).
 */
export function clickHandlers(latest: { readonly current: ClickProps }) {
  const target = (elements: ActiveElement[]): number | null => {
    if (!elements.length) return null;
    const { index } = elements[0];
    return (latest.current.isClickable?.(index) ?? true) ? index : null;
  };
  return {
    onClick: (_evt: ChartEvent, elements: ActiveElement[]) => {
      const index = target(elements);
      if (index !== null) latest.current.onElementClick?.(index);
    },
    onHover: (evt: ChartEvent, elements: ActiveElement[]) => {
      (evt.native?.target as HTMLElement | undefined)?.style.setProperty('cursor', target(elements) !== null ? 'pointer' : 'default');
    },
  };
}

/**
 * What a chart with no click handler gets: an `onHover` that clears the cursor, so a pointer left
 * by an earlier clickable state doesn't stay on a chart that no longer drills down (B183).
 */
export const NOT_CLICKABLE = {
  onHover: (evt: ChartEvent) => {
    (evt.native?.target as HTMLElement | undefined)?.style.setProperty('cursor', '');
  },
};

/**
 * The options fragment a clickable wrapper spreads: `clickHandlers` when `onElementClick` is set,
 * else `NOT_CLICKABLE`. Callbacks are read at event time (useLatest), so the result changes only when
 * a handler appears or disappears — put it in the options memo deps, never the callback props (B13).
 */
export function useClickHandlers({ onElementClick, isClickable }: ClickProps) {
  const latest = useLatest({ onElementClick, isClickable });
  const clickable = onElementClick !== undefined;
  return useMemo(() => (clickable ? clickHandlers(latest) : NOT_CLICKABLE), [clickable, latest]);
}

/** Tooltip number: integers as-is, others with at most 2 decimals, "—" for a missing value (B26). */
export function formatNumber(raw: unknown): string {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return '—';
  return Number.isInteger(raw) ? raw.toLocaleString() : raw.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
