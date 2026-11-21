import { useState, useEffect } from 'react';

/**
 * Returns `value` after it has been stable for `delay` ms. When `immediate(value)` is true the
 * value applies in the same render instead (render-phase update, not an effect) — e.g. a cleared
 * search must stop filtering at once, and typing after a clear then debounces from the cleared value.
 */
export function useDebounce<T>(value: T, delay = 300, immediate?: (v: T) => boolean): T {
  const [debounced, setDebounced] = useState<T>(value);

  if (immediate?.(value) && !Object.is(debounced, value)) {
    setDebounced(value);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
