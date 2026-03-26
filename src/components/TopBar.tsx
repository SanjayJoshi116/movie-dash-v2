import React from 'react';
import { Layout, Typography, Badge, Spin } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
import { useMovies } from '../hooks/useMovies';

const { Header } = Layout;
const { Text } = Typography;

interface TopBarProps {
  title: string;
}

const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const { movies, loading } = useMovies();

  return (
    <Header
      className="glass-panel"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 0.5,
          fontFamily: 'Segoe UI, Roboto, sans-serif',
        }}
      >
        {title}
      </Text>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {loading ? (
          <Spin size="small" />
        ) : (
          <Badge
            count={movies.length.toLocaleString()}
            overflowCount={999999}
            style={{
              backgroundColor: 'rgba(129,140,248,0.15)',
              color: '#818cf8',
              border: '1px solid rgba(129,140,248,0.3)',
              fontWeight: 600,
              fontSize: 12,
              padding: '0 8px',
            }}
          />
        )}
        <VideoCameraOutlined style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }} />
      </div>
    </Header>
  );
};

export default TopBar;
