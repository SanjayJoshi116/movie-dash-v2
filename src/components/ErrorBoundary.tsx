import React from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: React.ReactNode;
  /** Runs before the boundary re-renders its children on "Try Again" (App wires the catalogue refetch). */
  onReset?: () => void;
  /** A change clears an error view (App passes the location key of each navigation except Stats' ?tab= sync). */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  message: string;
  /** The resetKey current when the error was caught; only a later key clears the error view. */
  errorKey?: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, message };
  }

  // Record the key the crash happened under. If the navigation that changed resetKey is itself the
  // one that crashed, componentDidUpdate then sees the same key and doesn't re-render into a second crash.
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return state.hasError && state.errorKey === undefined ? { errorKey: props.resetKey ?? '' } : null;
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  // App mounts this with key={location.pathname}, so navigating to another section already gives a
  // fresh boundary. Within a section, a resetKey newer than the one the crash happened under clears the error view;
  // with no error it does nothing, so a healthy page is never remounted. "Try Again" additionally
  // reloads the catalogue before re-rendering the page.
  componentDidUpdate() {
    const { hasError, errorKey } = this.state;
    if (hasError && errorKey !== undefined && errorKey !== (this.props.resetKey ?? '')) {
      this.setState({ hasError: false, message: '', errorKey: undefined });
    }
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, message: '', errorKey: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 24px' }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle={this.state.message}
            extra={
              <Button type="primary" onClick={this.handleReset}>
                Try Again
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
