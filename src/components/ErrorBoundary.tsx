import React from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: React.ReactNode;
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

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
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
