import React from 'react';
import { ChunkLoadError } from '../components/ChunkErrorBoundary';

type Loader<P> = () => Promise<{ default: React.ComponentType<P> }>;

/** Swaps a fresh React.lazy in for each page whose chunk failed, until retryFailedLazies() runs. */
const pendingRetries = new Set<() => void>();

/**
 * `React.lazy` for a route page whose chunk download can be retried (B10). React caches a rejected
 * lazy component forever, so a failed download (dev server restart, a redeploy with new chunk hashes,
 * a dropped connection) would fail again on every "Try Again" and every visit. A failed load queues
 * a swap to a fresh `React.lazy`, applied by `retryFailedLazies()` (App passes it as the route
 * ErrorBoundary's `onClear`: on "Try Again", a newer resetKey and when a fresh boundary mounts;
 * Dashboard calls it after the drawer fails), so the next render downloads the chunk again.
 * The swap can't happen inside the rejection itself: React re-renders the suspended tree once the
 * promise settles, and a fresh lazy there would just start another download, forever.
 *
 * The rejection is wrapped in `ChunkLoadError`, so the boundary can offer "Reload page" (browsers
 * other than Chromium may cache the failed module, and after a redeploy the old chunk is gone).
 * A module whose top-level code throws also rejects `import()`, so it is reported the same way: browsers'
 * error messages can't reliably tell the two apart (B192, B201, accepted). Render crashes are unaffected.
 * Call it at module level, like `React.lazy`, so Vite still sees a static `import()` to split on.
 */
export function retryableLazy<P extends object>(loader: Loader<P>): React.FC<P> {
  const load: Loader<P> = () =>
    loader().catch((err: unknown) => {
      pendingRetries.add(() => { current = React.lazy(load); });
      throw new ChunkLoadError(err);
    });
  let current = React.lazy(load);
  const Retryable: React.FC<P> = (props) => React.createElement(current, props);
  return Retryable;
}

/** Lets every page whose chunk failed to download try again on its next render. */
export function retryFailedLazies(): void {
  const retries = [...pendingRetries];
  pendingRetries.clear();
  retries.forEach((retry) => retry());
}
