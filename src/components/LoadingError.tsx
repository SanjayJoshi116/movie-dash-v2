import React from 'react';
import { Alert, Button, Skeleton, Row, Col } from 'antd';

interface LoadingErrorProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}

const skeletonCardStyle: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  padding: 20,
};

const LoadingError: React.FC<LoadingErrorProps> = ({ loading, error, onRetry, children }) => {
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton.Input active size="large" style={{ width: 220, marginBottom: 8 }} />
        <Skeleton.Input active size="small" style={{ width: 360, marginBottom: 24, display: 'block' }} />
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} md={6}>
              <div style={skeletonCardStyle}>
                <Skeleton active title={false} paragraph={{ rows: 2 }} />
              </div>
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]}>
          {[0, 1].map((i) => (
            <Col key={i} xs={24} lg={12}>
              <div style={{ ...skeletonCardStyle, height: 260 }}>
                <Skeleton.Input active size="small" style={{ width: 160, marginBottom: 16 }} />
                <Skeleton.Node active style={{ width: '100%', height: 190 }} />
              </div>
            </Col>
          ))}
        </Row>
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
