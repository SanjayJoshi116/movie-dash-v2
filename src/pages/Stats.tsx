import React from 'react';
import { Typography, Tabs } from 'antd';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../contexts/ThemeContext';
import OverviewTab from '../components/StatsTabs/OverviewTab';
import PeopleTab from '../components/StatsTabs/PeopleTab';
import RatingsTab from '../components/StatsTabs/RatingsTab';
import RuntimeTab from '../components/StatsTabs/RuntimeTab';
import ExploreTab from '../components/StatsTabs/ExploreTab';
import BoxOfficeTab from '../components/StatsTabs/BoxOfficeTab';
import LoadingError from '../components/LoadingError';

const { Title, Text } = Typography;

const Stats: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const { isDark } = useTheme();

  const tabItems = [
    { key: 'overview',   label: '📊 Overview',           children: <OverviewTab   movies={movies} /> },
    { key: 'people',     label: '🎬 People',              children: <PeopleTab     movies={movies} /> },
    { key: 'ratings',    label: '⭐ Ratings',             children: <RatingsTab    movies={movies} /> },
    { key: 'runtime',    label: '⏱ Runtime & Geography', children: <RuntimeTab    movies={movies} /> },
    { key: 'boxoffice',  label: '💰 Box Office',          children: <BoxOfficeTab  movies={movies} /> },
    { key: 'explore',    label: '🔭 Explore',             children: <ExploreTab    movies={movies} /> },
  ];

  return (
    <LoadingError loading={loading} error={error} onRetry={refetch}>
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 4 }}>📊 Statistics Dashboard</Title>
      <Text style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 24 }}>
        Deep-dive charts and breakdowns across ratings, people, runtime, box office, and more.
      </Text>
      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        size="large"
        style={{ color: isDark ? '#fff' : '#1e1e3f' }}
      />
    </div>
    </LoadingError>
  );
};

export default Stats;
