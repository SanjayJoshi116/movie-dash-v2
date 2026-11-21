import { useLayoutEffect, useRef } from 'react';

/**
 * A ref that always holds the latest `value`, assigned in a layout effect (never during render).
 * Read `.current` only from callbacks that run after commit (event handlers, Chart.js callbacks),
 * so memoized options can stay stable while still calling the newest function a parent passed.
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
