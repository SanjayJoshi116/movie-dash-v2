import React, { useEffect, useMemo, useState } from 'react';
import { Typography, Tabs, Button } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
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
import EmptyState from '../components/EmptyState';
import { DrilldownScopeProvider } from '../contexts/DrilldownContext';
import { getCardStyle } from '../utils/chartTheme';
import { clampRange, computeFilterSpans } from '../utils/filterSpans';
import type { Movie } from '../types/movie';
import PageTitle from '../components/PageTitle';

const { Text } = Typography;

const TAB_KEYS = ['overview', 'people', 'ratings', 'runtime', 'boxoffice', 'explore'] as const;
type TabKey = typeof TAB_KEYS[number];

function isTabKey(value: unknown): value is TabKey {
  return typeof value === 'string' && (TAB_KEYS as readonly string[]).includes(value);
}

const Stats: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
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

  // Same year bounds as the Movies year slider.
  const { yearMin, yearMax } = useMemo(() => computeFilterSpans(movies), [movies]);

  // When the data's year span changes (a refetch after add/delete or an external edit), keep the
  // chosen range inside it — render-phase, like App.tsx's breakpoint sync. A range that no longer
  // overlaps, or now covers the whole span, resets: Stats has no chip to show a stale range.
  const [prevBounds, setPrevBounds] = useState<[number, number]>([yearMin, yearMax]);
  if (prevBounds[0] !== yearMin || prevBounds[1] !== yearMax) {
    setPrevBounds([yearMin, yearMax]);
    const next = clampRange(yearRange, yearMin, yearMax, true);
    if (next !== yearRange) setYearRange(next);
  }

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
    <div style={{ padding: 24 }}>
      <PageTitle emoji="📊" title="Statistics Dashboard" />
      <LoadingError loading={loading} error={error} onRetry={refetch}>
      <Text style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 24 }}>
        Deep-dive charts and breakdowns across ratings, people, runtime, box office, and more.
      </Text>
      {movies.length === 0 ? (
        <EmptyState description="No movies yet — add one to see analytics here." actionLabel="Go to Movies" onAction={() => navigate('/movies')} />
      ) : (
      <>
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
          label="Release year"
          min={yearMin}
          max={yearMax}
          value={yearRange ?? [yearMin, yearMax]}
          disabled={yearMin === yearMax}
          onCommit={([lo, hi]) => setYearRange(lo <= yearMin && hi >= yearMax ? null : [lo, hi])}
          tooltip={{ formatter: (v) => v }}
        />
      </div>
      {scopedMovies.length === 0 ? (
        // activeTab and ?tab= stay as they are, so Reset brings back the same tab.
        <EmptyState description="No movies released in this range" actionLabel="Reset range" onAction={() => setYearRange(null)} />
      ) : (
        <DrilldownScopeProvider yearRange={yearRange}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          style={{ color: isDark ? '#fff' : '#1e1e3f' }}
        />
        </DrilldownScopeProvider>
      )}
      </>
      )}
      </LoadingError>
    </div>
  );
};

export default Stats;
