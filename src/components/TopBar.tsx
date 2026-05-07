import React from 'react';
import { Layout, Typography, Badge, Spin, Button } from 'antd';
import { VideoCameraOutlined, SunOutlined, MoonOutlined, DownloadOutlined } from '@ant-design/icons';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../contexts/ThemeContext';

const { Header } = Layout;
const { Text } = Typography;

interface TopBarProps {
  title: string;
}

const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const { movies, loading } = useMovies();
  const { isDark, toggleTheme } = useTheme();

  return (
    <Header
      className="glass-panel"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
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
          color: 'var(--text-primary)',
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
        <a href="/movies.template.csv" download="movies.template.csv" title="Download CSV template">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            style={{ color: 'var(--text-secondary)', fontSize: 16 }}
          />
        </a>
        <Button
          type="text"
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ color: 'var(--text-secondary)', fontSize: 16 }}
        />
        <VideoCameraOutlined style={{ color: 'var(--text-muted)', fontSize: 16 }} />
      </div>
    </Header>
  );
};

export default TopBar;
