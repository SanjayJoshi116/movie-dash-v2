import React from 'react';
import { Typography, Spin, Alert, Tabs, Button } from 'antd';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../contexts/ThemeContext';
import OverviewTab from '../components/StatsTabs/OverviewTab';
import PeopleTab from '../components/StatsTabs/PeopleTab';
import RatingsTab from '../components/StatsTabs/RatingsTab';
import RuntimeTab from '../components/StatsTabs/RuntimeTab';
import ExploreTab from '../components/StatsTabs/ExploreTab';
import BoxOfficeTab from '../components/StatsTabs/BoxOfficeTab';

const { Title } = Typography;

const Stats: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const { isDark } = useTheme();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" /></div>;
  }
  if (error) {
    return (
      <Alert
        type="error"
        message="Failed to load movies"
        description={error}
        showIcon
        style={{ margin: 24 }}
        action={<Button size="small" onClick={refetch}>Retry</Button>}
      />
    );
  }

  const tabItems = [
    { key: 'overview',   label: '📊 Overview',           children: <OverviewTab   movies={movies} /> },
    { key: 'people',     label: '🎬 People',              children: <PeopleTab     movies={movies} /> },
    { key: 'ratings',    label: '⭐ Ratings',             children: <RatingsTab    movies={movies} /> },
    { key: 'runtime',    label: '⏱ Runtime & Geography', children: <RuntimeTab    movies={movies} /> },
    { key: 'boxoffice',  label: '💰 Box Office',          children: <BoxOfficeTab  movies={movies} /> },
    { key: 'explore',    label: '🔭 Explore',             children: <ExploreTab    movies={movies} /> },
  ];

  return (
    <div style={{ padding: 24, background: 'var(--bg-gradient)', minHeight: '100vh' }}>
      <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 24 }}>📊 Statistics Dashboard</Title>
      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        size="large"
        style={{ color: isDark ? '#fff' : '#1e1e3f' }}
      />
    </div>
  );
};

export default Stats;
