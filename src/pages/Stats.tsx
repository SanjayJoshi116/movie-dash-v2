import React, { useEffect, useMemo, useState } from 'react';
import { Typography, Tabs, Button } from 'antd';
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
import RangeSlider from '../components/RangeSlider';
import { DrilldownScopeProvider } from '../contexts/DrilldownContext';
import { getCardStyle } from '../utils/chartTheme';
import type { Movie } from '../types/movie';

const { Title, Text } = Typography;

const TAB_KEYS = ['overview', 'people', 'ratings', 'runtime', 'boxoffice', 'explore'] as const;
type TabKey = typeof TAB_KEYS[number];

function isTabKey(value: unknown): value is TabKey {
  return typeof value === 'string' && (TAB_KEYS as readonly string[]).includes(value);
}

const Stats: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const { isDark } = useTheme();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Drill-down hand-off (location.state) wins, then ?tab=, then Overview — an unknown key from
  // either source falls through instead of rendering a tab bar with nothing selected.
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const fromState = (location.state as { tab?: string } | null)?.tab;
    if (isTabKey(fromState)) return fromState;
    const fromUrl = searchParams.get('tab');
    return isTabKey(fromUrl) ? fromUrl : 'overview';
  });
  const [yearRange, setYearRange] = useState<[number, number] | null>(null);

  // Keep ?tab= in step with the shown tab from the first render (e.g. after a Dashboard link
  // hand-off or an invalid ?tab=), so the URL is shareable/reloadable without a tab switch first.
  // Writes to the URL (an external system), not React state, so it's a legitimate effect.
  useEffect(() => {
    if (searchParams.get('tab') === activeTab) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', activeTab);
      return next;
    }, { replace: true });
  }, [activeTab, searchParams, setSearchParams]);

  const handleTabChange = (key: string) => {
    if (isTabKey(key)) setActiveTab(key);
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
    { key: 'overview',   label: <><span aria-hidden="true">📊 </span>Overview</>, children: <OverviewTab   movies={scopedMovies} /> },
    { key: 'people',     label: <><span aria-hidden="true">🎬 </span>People</>, children: <PeopleTab     movies={scopedMovies} /> },
    { key: 'ratings',    label: <><span aria-hidden="true">⭐ </span>Ratings</>, children: <RatingsTab    movies={scopedMovies} /> },
    { key: 'runtime',    label: <><span aria-hidden="true">⏱ </span>Runtime &amp; Geography</>, children: <RuntimeTab    movies={scopedMovies} /> },
    { key: 'boxoffice',  label: <><span aria-hidden="true">💰 </span>Box Office</>, children: <BoxOfficeTab  movies={scopedMovies} /> },
    { key: 'explore',    label: <><span aria-hidden="true">🔭 </span>Explore</>, children: <ExploreTab    movies={scopedMovies} /> },
  ];

  return (
    <LoadingError loading={loading} error={error} onRetry={refetch}>
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 4 }}><span aria-hidden="true">📊 </span>Statistics Dashboard</Title>
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
        {/* Commits on release: re-scoping recomputes every visited tab's charts, so not per drag tick. */}
        <RangeSlider
          min={yearMin}
          max={yearMax}
          value={yearRange ?? [yearMin, yearMax]}
          disabled={yearMin === yearMax}
          onCommit={([lo, hi]) => setYearRange(lo <= yearMin && hi >= yearMax ? null : [lo, hi])}
          tooltip={{ formatter: (v) => v }}
        />
      </div>
      <DrilldownScopeProvider yearRange={yearRange}>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        style={{ color: isDark ? '#fff' : '#1e1e3f' }}
      />
      </DrilldownScopeProvider>
    </div>
    </LoadingError>
  );
};

export default Stats;
