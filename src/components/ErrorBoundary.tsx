import React from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: React.ReactNode;
  /** Runs before the boundary re-renders its children on "Try Again" (App wires the catalogue refetch). */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  // App mounts this with key={location.pathname}, so navigating to another section already gives a
  // fresh boundary; "Try Again" additionally reloads the catalogue before re-rendering the page.
  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, message: '' });
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
