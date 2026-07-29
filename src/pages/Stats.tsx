import React, { useMemo, useState } from 'react';
import { Typography, Tabs, Slider, Button } from 'antd';
import { useLocation, useSearchParams } from 'react-router';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../contexts/ThemeContext';
import OverviewTab from '../components/StatsTabs/OverviewTab';
import PeopleTab from '../components/StatsTabs/PeopleTab';
import RatingsTab from '../components/StatsTabs/RatingsTab';
import RuntimeTab from '../components/StatsTabs/RuntimeTab';
import ExploreTab from '../components/StatsTabs/ExploreTab';
import BoxOfficeTab from '../components/StatsTabs/BoxOfficeTab';
import LoadingError from '../components/LoadingError';
import { getCardStyle } from '../utils/chartTheme';
import type { Movie } from '../types/movie';

const { Title, Text } = Typography;

const Stats: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const { isDark } = useTheme();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    () => (location.state as { tab?: string } | null)?.tab ?? searchParams.get('tab') ?? 'overview'
  );
  const [yearRange, setYearRange] = useState<[number, number] | null>(null);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', key);
      return next;
    }, { replace: true });
  };

  const { yearMin, yearMax } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    movies.forEach((m) => {
      const y = parseInt(m['Release Year'], 10);
      if (!isNaN(y)) { if (y < lo) lo = y; if (y > hi) hi = y; }
    });
    return {
      yearMin: isFinite(lo) ? lo : 1900,
      yearMax: isFinite(hi) ? hi : new Date().getFullYear(),
    };
  }, [movies]);

  const scopedMovies = useMemo<Movie[]>(() => {
    if (!yearRange) return movies;
    const [lo, hi] = yearRange;
    return movies.filter((m) => {
      const y = parseInt(m['Release Year'], 10);
      return !isNaN(y) && y >= lo && y <= hi;
    });
  }, [movies, yearRange]);

  const tabItems = [
    { key: 'overview',   label: '📊 Overview',           children: <OverviewTab   movies={scopedMovies} /> },
    { key: 'people',     label: '🎬 People',              children: <PeopleTab     movies={scopedMovies} /> },
    { key: 'ratings',    label: '⭐ Ratings',             children: <RatingsTab    movies={scopedMovies} /> },
    { key: 'runtime',    label: '⏱ Runtime & Geography', children: <RuntimeTab    movies={scopedMovies} /> },
    { key: 'boxoffice',  label: '💰 Box Office',          children: <BoxOfficeTab  movies={scopedMovies} /> },
    { key: 'explore',    label: '🔭 Explore',             children: <ExploreTab    movies={scopedMovies} /> },
  ];

  return (
    <LoadingError loading={loading} error={error} onRetry={refetch}>
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 4 }}>📊 Statistics Dashboard</Title>
      <Text style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 24 }}>
        Deep-dive charts and breakdowns across ratings, people, runtime, box office, and more.
      </Text>
      <div style={{ ...getCardStyle(isDark), padding: '16px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Release Year Range
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>
              {(yearRange ?? [yearMin, yearMax]).join(' – ')} · {scopedMovies.length.toLocaleString()} movies
            </Text>
            {yearRange !== null && (
              <Button size="small" onClick={() => setYearRange(null)}>Reset</Button>
            )}
          </div>
        </div>
        <Slider
          range
          min={yearMin}
          max={yearMax}
          value={yearRange ?? [yearMin, yearMax]}
          disabled={yearMin === yearMax}
          onChange={(val) => {
            const [lo, hi] = val as [number, number];
            setYearRange(lo <= yearMin && hi >= yearMax ? null : [lo, hi]);
          }}
          tooltip={{ formatter: (v) => v }}
        />
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        style={{ color: isDark ? '#fff' : '#1e1e3f' }}
      />
    </div>
    </LoadingError>
  );
};

export default Stats;
