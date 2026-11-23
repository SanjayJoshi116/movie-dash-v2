import React from 'react';
import { Result, Button } from 'antd';
import { ChunkLoadError } from './ChunkErrorBoundary';
import { setDocumentTitle } from '../utils/documentTitle';

const CHUNK_LOAD_MESSAGE = "Couldn't load this page. Check your connection and try again, or reload the page.";

interface Props {
  children: React.ReactNode;
  /**
   * Runs on "Try Again" (App wires the catalogue refetch). If it returns a promise, the error view
   * stays up (button spinning) until it settles, so the page re-renders with the fresh data. Not run
   * for a failed page download: the catalogue has nothing to do with it, so that retry is immediate.
   */
  onReset?: () => void | Promise<unknown>;
  /**
   * Runs right before the boundary renders its children afresh: when it mounts and whenever it clears
   * an error view. App passes retryFailedLazies, so a page whose chunk failed downloads again.
   */
  onClear?: () => void;
  /** A change clears an error view (App passes the location key of each navigation except Stats' ?tab= sync). */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  message: string;
  /** The resetKey current when the error was caught; only a later key clears the error view. */
  errorKey?: string;
  /** "Try Again" is waiting for onReset's promise. */
  retrying?: boolean;
  /** The page's code failed to download (a `ChunkLoadError`), not a crash: also offer "Reload page". */
  chunkError?: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  /** Bumped whenever the error view clears, so a "Try Again" still waiting on onReset can tell its error is gone. */
  private retryToken = 0;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
    // A fresh boundary (App keys it on the pathname) renders its page for the first time. onClear must
    // be idempotent: StrictMode constructs twice.
    props.onClear?.();
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    if (error instanceof ChunkLoadError) return { hasError: true, chunkError: true, message: CHUNK_LOAD_MESSAGE };
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, chunkError: false, message };
  }

  // Record the key the crash happened under. If the navigation that changed resetKey is itself the
  // one that crashed, componentDidUpdate then sees the same key and doesn't re-render into a second crash.
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return state.hasError && state.errorKey === undefined ? { errorKey: props.resetKey ?? '' } : null;
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
    // The page may have failed before its PageTitle rendered, leaving the previous page's tab title.
    setDocumentTitle('Something went wrong');
  }

  // App mounts this with key={location.pathname}, so navigating to another section already gives a
  // fresh boundary. Within a section, a resetKey newer than the one the crash happened under clears the error view;
  // with no error it does nothing, so a healthy page is never remounted. "Try Again" additionally
  // reloads the catalogue and waits for it (handleReset) before re-rendering the page.
  componentDidUpdate() {
    const { hasError, errorKey } = this.state;
    if (hasError && errorKey !== undefined && errorKey !== (this.props.resetKey ?? '')) this.clearError();
  }

  clearError = () => {
    this.retryToken++;
    this.props.onClear?.();
    this.setState({ hasError: false, message: '', errorKey: undefined, retrying: false });
  };

  handleReset = () => {
    const pending = this.state.chunkError ? undefined : this.props.onReset?.();
    if (pending instanceof Promise) {
      this.setState({ retrying: true });
      // Only clear the error this retry was for: a newer resetKey may have cleared it meanwhile and
      // the page crashed again, and that new error view must stay up.
      const token = this.retryToken;
      const settle = () => { if (token === this.retryToken) this.clearError(); };
      pending.then(settle, settle);
    } else {
      this.clearError();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 24px' }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle={this.state.message}
            extra={[
              <Button key="retry" type="primary" onClick={this.handleReset} loading={this.state.retrying}>
                Try Again
              </Button>,
              this.state.chunkError && (
                <Button key="reload" onClick={() => window.location.reload()}>
                  Reload page
                </Button>
              ),
            ]}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
