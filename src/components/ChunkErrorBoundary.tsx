import React from 'react';

/**
 * A lazy component's chunk failed to download. The loader wraps its `import()` rejection in this,
 * so the boundary can tell a failed download from an error thrown by the loaded component (B178).
 */
// Kept beside the boundary that checks it (like the context files' hooks); this file is rarely edited, so losing Fast Refresh here costs little.
// eslint-disable-next-line react-refresh/only-export-components
export class ChunkLoadError extends Error {
  constructor(original: unknown) {
    super(original instanceof Error ? original.message : 'Failed to load a lazy chunk');
    this.name = 'ChunkLoadError';
  }
}

interface ChunkErrorBoundaryProps {
  /** Called once when the lazy child's chunk fails to download (a `ChunkLoadError`). */
  onError: () => void;
  children: React.ReactNode;
}

interface ChunkErrorBoundaryState {
  error: unknown;
  hasError: boolean;
}

/**
 * Local boundary for a lazy-loaded piece of UI: when its chunk fails to download it renders nothing
 * and tells the parent, instead of letting the error reach the route-level ErrorBoundary. Any other
 * error is rethrown from render, so the route boundary still shows real crashes. Key it on an
 * attempt counter that changes with each fresh lazy instance (a retry), so a retry gets a fresh boundary.
 */
class ChunkErrorBoundary extends React.Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  state: ChunkErrorBoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown): ChunkErrorBoundaryState {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (error instanceof ChunkLoadError) this.props.onError();
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    // React has no way for a boundary to decline an error: rethrow it so the next boundary up gets it.
    if (!(this.state.error instanceof ChunkLoadError)) throw this.state.error;
    return null;
  }
}

export default ChunkErrorBoundary;
