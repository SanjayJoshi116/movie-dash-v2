import React from 'react';
import { Layout, Badge, Spin, Button, Tooltip } from 'antd';
import { SunOutlined, MoonOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING } from '../utils/chartTheme';

const { Header } = Layout;

const TopBar: React.FC = () => {
  const { movies, loading, refreshing, refreshError, refetch } = useMovies();
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
        justifyContent: 'flex-end',
        padding: `0 ${SPACING.xxl}px`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
        {loading ? (
          <Spin size="small" />
        ) : (
          <Badge
            count={movies.length.toLocaleString()}
            overflowCount={999999}
            showZero
            title={`${movies.length.toLocaleString()} movies in catalogue`}
            style={{
              backgroundColor: 'rgba(129,140,248,0.15)',
              color: '#818cf8',
              border: '1px solid rgba(129,140,248,0.3)',
              fontWeight: 600,
              fontSize: 12,
              padding: `0 ${SPACING.sm}px`,
            }}
          />
        )}
        {/* Background refetch after add/delete: the page stays mounted, so signal it here instead. */}
        {refreshing && <Spin size="small" aria-label="Refreshing catalogue" />}
        {refreshError && (
          <Tooltip title={`Couldn't refresh the catalogue (${refreshError}) — showing the last loaded data. Click to retry.`}>
            <Button
              type="text"
              danger
              icon={<ExclamationCircleOutlined />}
              onClick={refetch}
              aria-label="Catalogue refresh failed — retry"
            />
          </Tooltip>
        )}
        {/* One focusable link-button (not a <Button> nested in an <a>), with an accessible name. */}
        <Button
          type="text"
          href="/movies.template.csv"
          download="movies.template.csv"
          title="Download CSV template"
          aria-label="Download CSV template"
          icon={<DownloadOutlined />}
          style={{ color: 'var(--text-secondary)', fontSize: 16 }}
        />
        <Button
          type="text"
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ color: 'var(--text-secondary)', fontSize: 16 }}
        />
      </div>
    </Header>
  );
};

export default TopBar;
