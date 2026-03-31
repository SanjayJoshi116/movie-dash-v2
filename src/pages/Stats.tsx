import React from 'react';
import { Typography, Spin, Alert, Tabs } from 'antd';
import { useMovies } from '../hooks/useMovies';
import OverviewTab from '../components/StatsTabs/OverviewTab';
import PeopleTab from '../components/StatsTabs/PeopleTab';
import RatingsTab from '../components/StatsTabs/RatingsTab';
import RuntimeTab from '../components/StatsTabs/RuntimeTab';
import ExploreTab from '../components/StatsTabs/ExploreTab';

const { Title } = Typography;

const Stats: React.FC = () => {
  const { movies, loading, error } = useMovies();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" /></div>;
  }
  if (error) {
    return <Alert type="error" message="Failed to load movies" description={error} showIcon style={{ margin: 24 }} />;
  }

  const tabItems = [
    { key: 'overview', label: '📊 Overview',           children: <OverviewTab movies={movies} /> },
    { key: 'people',   label: '🎬 People',              children: <PeopleTab   movies={movies} /> },
    { key: 'ratings',  label: '⭐ Ratings',             children: <RatingsTab  movies={movies} /> },
    { key: 'runtime',  label: '⏱ Runtime & Geography', children: <RuntimeTab  movies={movies} /> },
    { key: 'explore',  label: '🔭 Explore',             children: <ExploreTab  movies={movies} /> },
  ];

  return (
    <div style={{ padding: 24, background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1030 100%)', minHeight: '100vh' }}>
      <Title level={3} style={{ color: '#fff', marginBottom: 24 }}>📊 Statistics Dashboard</Title>
      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        destroyInactiveTabPane
        size="large"
        style={{ color: '#fff' }}
      />
    </div>
  );
};

export default Stats;
