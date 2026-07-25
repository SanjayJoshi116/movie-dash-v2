import React from 'react';
import { Spin, Alert, Button } from 'antd';

interface LoadingErrorProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}

const LoadingError: React.FC<LoadingErrorProps> = ({ loading, error, onRetry, children }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (error) {
    return (
      <Alert
        type="error"
        message="Failed to load movies"
        description={error}
        showIcon
        style={{ margin: 24 }}
        action={<Button size="small" onClick={onRetry}>Retry</Button>}
      />
    );
  }
  return <>{children}</>;
};

export default LoadingError;
