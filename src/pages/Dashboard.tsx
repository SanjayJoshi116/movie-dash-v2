import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Row, Col, Typography, Button, Tag, Grid, Alert, Empty } from 'antd';
import { useNavigate } from 'react-router';
import type { ChartData } from 'chart.js';
import {
  UnorderedListOutlined,
  BarChartOutlined,
  TrophyOutlined,
  FireOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  VideoCameraOutlined,
  StarOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../contexts/ThemeContext';
import StatCard from '../components/StatCard';
import DashboardSection from '../components/DashboardSection';
import LoadingError from '../components/LoadingError';
import LineChart from '../components/Charts/LineChart';
import BarChart from '../components/Charts/BarChart';
import DoughnutChart from '../components/Charts/DoughnutChart';
import PosterThumb from '../components/PosterThumb';
import ChunkErrorBoundary from '../components/ChunkErrorBoundary';
import { retryableLazy, retryFailedLazies } from '../utils/retryableLazy';
import EmptyState from '../components/EmptyState';
import { getCardStyle, SPACING, FONT_SIZE, CHART_PALETTE, CHART_PRIMARY, withAlpha } from '../utils/chartTheme';
import { groupByField, topNWithOther, makeDoughnut, parseRevenue, formatRevenue, drillableLabelAt, parseVote, ratingPool, countIntoBuckets, bucketToRange, VOTE_STEP, VOTE_MAX, MAX_NAMED_CATEGORIES } from '../utils/statsHelpers';
import { RATING_BUCKETS } from '../utils/chartBuckets';
import { useDrillDown } from '../contexts/DrilldownContext';
import { formatDateDDMMYYYY } from '../utils/formatDate';
import type { Movie } from '../types/movie';
import PageTitle from '../components/PageTitle';

// Lazy: the drawer (Drawer, Descriptions, Image, Popconfirm) isn't needed for the landing page's
// first paint, so it stays out of the initial bundle (frontend-performance spec) and loads on first open.
// retryableLazy, like the route pages: a failed download is a ChunkLoadError (so the boundary passes
// real drawer crashes up, B178) and retryFailedLazies() lets the next open download it again.
const MovieDrawer = retryableLazy(() => import('../components/MovieDrawer'));

const DRAWER_LOAD_ERROR = "Couldn't open movie details. Check your connection and try again.";

/** The vote badge text, or null when the movie is unrated (parseVote's rule). */
const formatVoteBadge = (raw: string): string | null => (parseVote(raw) === null ? null : `⭐ ${raw}`);

const TREND_YEARS = 10;

const NOT_RATED = 'Not rated';

const { Title, Text } = Typography;

interface HighlightCardProps {
  icon: React.ReactNode;
  label: string;
  movie: Movie | null;
  detail: string;
  isDark: boolean;
  onSelect: (movie: Movie) => void;
}

const HighlightCard: React.FC<HighlightCardProps> = ({ icon, label, movie, detail, isDark, onSelect }) => (
  <div
    style={{ ...getCardStyle(isDark), padding: SPACING.xl, height: '100%', cursor: movie ? 'pointer' : undefined }}
    role={movie ? 'button' : undefined}
    tabIndex={movie ? 0 : undefined}
    aria-label={movie ? `${label}: ${movie.Name}, ${detail}` : undefined}
    onClick={movie ? () => onSelect(movie) : undefined}
    onKeyDown={movie ? (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(movie); }
    } : undefined}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, color: 'var(--text-secondary)', fontSize: FONT_SIZE.label }}>
      {icon}
      {label}
    </div>
    {movie ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
        <PosterThumb movie={movie} width={48} height={72} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 17, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {movie.Name}
          </div>
          <Tag color={detail === NOT_RATED ? undefined : 'blue'}>{detail}</Tag>
        </div>
      </div>
    ) : (
      <Text style={{ color: 'var(--text-muted)' }}>No data</Text>
    )}
  </div>
);

interface MiniChartCardProps {
  title: string;
  isDark: boolean;
  height: number;
  children: React.ReactNode;
}

const MiniChartCard: React.FC<MiniChartCardProps> = ({ title, isDark, height, children }) => (
  <div style={{ ...getCardStyle(isDark), padding: SPACING.xl, height: '100%' }}>
    <Text style={{ color: 'var(--text-secondary)', fontSize: FONT_SIZE.label, display: 'block', marginBottom: SPACING.md }}>{title}</Text>
    <div style={{ height }}>{children}</div>
  </div>
);

const CtaCard: React.FC<{ title: string; text: string; buttonText: string; icon: React.ReactNode; primary?: boolean; onClick: () => void; isDark: boolean }> = ({
  title, text, buttonText, icon, primary, onClick, isDark,
}) => (
  <div style={{ ...getCardStyle(isDark), padding: SPACING.xxl, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.lg, flexWrap: 'wrap', height: '100%' }}>
    <div>
      <Title level={5} style={{ color: 'var(--text-primary)', margin: 0 }}>{title}</Title>
      <Text style={{ color: 'var(--text-secondary)' }}>{text}</Text>
    </div>
    <Button type={primary ? 'primary' : 'default'} icon={icon} onClick={onClick}>
      {buttonText}
    </Button>
  </div>
);

const Dashboard: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const drillDown = useDrillDown();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  // Mount the lazy drawer on first open and keep it mounted, so its close animation still plays.
  const [drawerMounted, setDrawerMounted] = useState(false);
  if (selectedMovie && !drawerMounted) setDrawerMounted(true);
  // An inline Alert, not antd `message`: message isn't on the landing route and would add ~9 kB gzip to it.
  const [drawerLoadFailed, setDrawerLoadFailed] = useState(false);
  const handleDrawerLoadError = useCallback(() => {
    setDrawerLoadFailed(true);
    setSelectedMovie(null);
    // Unmounting drops the failed boundary; the next open mounts a fresh one and downloads again.
    // Chromium fetches a failed module again; a browser that caches the failure keeps failing, which
    // is why the alert also offers a reload (B179).
    setDrawerMounted(false);
    retryFailedLazies();
  }, []);
  // A new open is a retry, so the previous failure's alert goes away.
  const openMovie = useCallback((movie: Movie) => {
    setDrawerLoadFailed(false);
    setSelectedMovie(movie);
  }, []);
  const screens = Grid.useBreakpoint();
  const miniChartHeight = screens.md ? 240 : 180;
  // The doughnut's bottom legend wraps to several rows on phones; give it room so no row is dropped.
  const genreChartHeight = screens.md ? miniChartHeight : 280;

  const stats = useMemo(() => {
    const votes = movies.map((m) => parseVote(m['Vote Average'])).filter((v): v is number => v !== null);
    const runtimes = movies.map(m => parseFloat(m.Runtime)).filter(r => !isNaN(r) && r > 0);
    // Revenue ≤ 0 is unknown (as on the Box Office tab), so it never lowers the total.
    const totalRevenue = movies.reduce((sum, m) => sum + Math.max(0, parseRevenue(m['Box Office Revenue'])), 0);

    return {
      totalMovies: movies.length,
      avgRating: votes.length ? votes.reduce((a, b) => a + b, 0) / votes.length : null,
      avgRuntime: runtimes.length ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length) : null,
      totalRevenue,
    };
  }, [movies]);

  const highlights = useMemo(() => {
    let topRated: Movie | null = null;
    let mostPopular: Movie | null = null;
    let newest: Movie | null = null;
    let newestTime = -Infinity;

    // Same vote-count rule as Stats › Explore "Highest Rated"; unrated movies are never picked.
    let topVote = 0;
    ratingPool(movies).pool.forEach((m) => {
      const vote = parseVote(m['Vote Average']) ?? 0;
      if (vote > topVote) { topVote = vote; topRated = m; }
    });

    movies.forEach((m) => {
      const popularity = parseFloat(m['Popularity Score']);
      if (!isNaN(popularity) && (!mostPopular || popularity > parseFloat(mostPopular['Popularity Score']))) mostPopular = m;

      const time = Date.parse(m['Release Date']);
      if (!isNaN(time) && time > newestTime) { newestTime = time; newest = m; }
    });

    return { topRated, mostPopular, newest };
  }, [movies]);

  const yearTrendData = useMemo<ChartData<'line'>>(() => {
    // A continuous span of the last TREND_YEARS calendar years ending at the latest release year;
    // years with no releases show as 0 instead of being skipped, so the axis and title stay honest.
    const g = groupByField(movies, 'Release Year');
    const years = Object.keys(g).map((y) => parseInt(y, 10)).filter((y) => !isNaN(y));
    const latest = years.length ? Math.max(...years) : null;
    const sorted: [string, number][] = latest === null
      ? []
      : Array.from({ length: TREND_YEARS }, (_, i) => {
          const y = String(latest - TREND_YEARS + 1 + i);
          return [y, g[y] ?? 0];
        });
    return {
      labels: sorted.map(([y]) => y),
      datasets: [{
        label: 'Movies Released',
        data: sorted.map(([, c]) => c),
        borderColor: CHART_PRIMARY,
        backgroundColor: withAlpha(CHART_PRIMARY, 0.15),
        fill: true,
      }],
    };
  }, [movies]);

  const genreDoughnutData = useMemo<ChartData<'doughnut'>>(() => {
    return makeDoughnut(topNWithOther(groupByField(movies, 'Genres')), 'Genres');
  }, [movies]);

  const ratingBucketData = useMemo<ChartData<'bar'>>(() => {
    // 0 = unrated: skipped here and excluded by the Movies vote filter, so counts match drill-downs.
    const votes = movies.map((m) => parseVote(m['Vote Average'])).filter((v): v is number => v !== null);
    const counts = countIntoBuckets(votes, RATING_BUCKETS);
    return { labels: RATING_BUCKETS.map((b) => b.label), datasets: [{ label: 'Movies', data: counts, backgroundColor: CHART_PALETTE[1] }] };
  }, [movies]);

  const recentMovies = useMemo(() => {
    return [...movies]
      .filter((m) => !isNaN(Date.parse(m['Release Date'])))
      .sort((a, b) => Date.parse(b['Release Date']) - Date.parse(a['Release Date']))
      .slice(0, 5);
  }, [movies]);

  const yearLabels = (yearTrendData.labels ?? []) as string[];
  const yearRangeTitle = yearLabels.length
    ? `Movies Released — ${yearLabels[0]}–${yearLabels[yearLabels.length - 1]}`
    : 'Movies Released';

  // Plain functions: the chart wrappers read callbacks at event time (useLatest), so identity doesn't matter.
  const handleGenreClick = (index: number) => {
    const genre = drillableLabelAt(genreDoughnutData.labels, index);
    if (genre) drillDown({ genres: [genre] });
  };
  const isGenreClickable = (index: number) => drillableLabelAt(genreDoughnutData.labels, index) !== null;

  const handleRatingBucketClick = (index: number) => {
    const bucket = RATING_BUCKETS[index];
    if (bucket) drillDown({ voteRange: bucketToRange(bucket, VOTE_STEP, VOTE_MAX) });
  };

  // A zero-filled year or an empty bucket would drill down to an empty list, so it isn't clickable.
  const isYearClickable = (index: number) => Number(yearTrendData.datasets[0]?.data[index] ?? 0) > 0;
  const isRatingBucketClickable = (index: number) => Number(ratingBucketData.datasets[0]?.data[index] ?? 0) > 0;

  const handleYearClick = (index: number) => {
    const year = parseInt(yearLabels[index], 10);
    if (!isNaN(year)) drillDown({ yearRange: [year, year] });
  };

  return (
    <LoadingError loading={loading} error={error} onRetry={refetch}>
    <div style={{ padding: SPACING.xxl }}>
      <PageTitle emoji="🏠" title="Dashboard" />
      <Text style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: SPACING.xxl }}>
        Snapshot of your movie collection — key stats, highlights, and trends at a glance.
      </Text>
      {drawerLoadFailed && (
        <Alert
          type="error"
          showIcon
          title={DRAWER_LOAD_ERROR}
          action={<Button size="small" onClick={() => window.location.reload()}>Reload page</Button>}
          closable={{ onClose: () => setDrawerLoadFailed(false) }}
          style={{ marginBottom: SPACING.lg }}
        />
      )}
      {movies.length === 0 ? (
        <EmptyState
          description="No movies yet — add one to see stats and trends here."
          actionLabel="Go to Movies"
          onAction={() => navigate('/movies')}
          isDark={isDark}
        />
      ) : (
      <>
      <DashboardSection title="Overview">
        <Row gutter={[SPACING.lg, SPACING.lg]}>
          <Col xs={24} md={12}>
            <StatCard label="Total Movies" value={stats.totalMovies} color="#818cf8" icon={<VideoCameraOutlined />} hero />
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[SPACING.lg, SPACING.lg]} style={{ height: '100%' }}>
              <Col xs={24} sm={8}><StatCard label="Average Rating" value={stats.avgRating === null ? '—' : stats.avgRating.toFixed(1)} color="#34d399" suffix={stats.avgRating === null ? undefined : '/ 10'} icon={<StarOutlined />} /></Col>
              <Col xs={24} sm={8}><StatCard label="Average Runtime" value={stats.avgRuntime ?? '—'} color="#a78bfa" suffix={stats.avgRuntime === null ? undefined : 'mins'} icon={<ClockCircleOutlined />} /></Col>
              <Col xs={24} sm={8}>
                <StatCard
                  label="Total Box Office"
                  value={formatRevenue(stats.totalRevenue)}
                  color="#fb923c"
                  icon={<DollarOutlined />}
                  onClick={() => navigate('/stats', { state: { tab: 'boxoffice' } })}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </DashboardSection>

      <DashboardSection title="Highlights">
        <Row gutter={[SPACING.lg, SPACING.lg]}>
          <Col xs={24} sm={12} lg={8}>
            <HighlightCard
              icon={<TrophyOutlined />}
              label="Top Rated"
              movie={highlights.topRated}
              detail={highlights.topRated ? (formatVoteBadge(highlights.topRated['Vote Average']) ?? NOT_RATED) : ''}
              isDark={isDark}
              onSelect={openMovie}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <HighlightCard
              icon={<FireOutlined />}
              label="Most Popular"
              movie={highlights.mostPopular}
              detail={highlights.mostPopular ? `${parseFloat(highlights.mostPopular['Popularity Score']).toFixed(1)} popularity` : ''}
              isDark={isDark}
              onSelect={openMovie}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <HighlightCard
              icon={<CalendarOutlined />}
              label="Newest Release"
              movie={highlights.newest}
              detail={highlights.newest ? formatDateDDMMYYYY(highlights.newest['Release Date']) : ''}
              isDark={isDark}
              onSelect={openMovie}
            />
          </Col>
        </Row>
      </DashboardSection>

      <DashboardSection
        title="Trends & Breakdown"
        action={<Button type="link" icon={<BarChartOutlined />} onClick={() => navigate('/stats')}>Full analytics</Button>}
      >
        <Row gutter={[SPACING.lg, SPACING.lg]}>
          <Col xs={24} lg={12}>
            <MiniChartCard title={yearRangeTitle} isDark={isDark} height={miniChartHeight}>
              <LineChart data={yearTrendData} isDark={isDark} onElementClick={handleYearClick} isClickable={isYearClickable} />
            </MiniChartCard>
          </Col>
          <Col xs={24} lg={12}>
            <MiniChartCard title={`Genre Breakdown (Top ${MAX_NAMED_CATEGORIES})`} isDark={isDark} height={genreChartHeight}>
              <DoughnutChart data={genreDoughnutData} isDark={isDark} onElementClick={handleGenreClick} isClickable={isGenreClickable} />
            </MiniChartCard>
          </Col>
          <Col xs={24} lg={12}>
            <MiniChartCard title="Rating Distribution" isDark={isDark} height={miniChartHeight}>
              <BarChart data={ratingBucketData} isDark={isDark} onElementClick={handleRatingBucketClick} isClickable={isRatingBucketClickable} />
            </MiniChartCard>
          </Col>
          <Col xs={24} lg={12}>
            <div style={{ ...getCardStyle(isDark), padding: SPACING.xl, height: '100%' }}>
              <Text style={{ color: 'var(--text-secondary)', fontSize: FONT_SIZE.label, display: 'block', marginBottom: SPACING.md }}>
                Recent Releases
              </Text>
              {/* A plain list (antd List is deprecated in v6, B49). Each <li> keeps its list-item role;
                  the clickable control is a real button inside it. A catalogue with no parseable
                  Release Date gets here with nothing to list. */}
              {recentMovies.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No dated releases" />
              ) : (
                <ul className="plain-list" aria-label="Recent releases">
                  {recentMovies.map((movie) => {
                    const date = formatDateDDMMYYYY(movie['Release Date']);
                    const badge = formatVoteBadge(movie['Vote Average']);
                    return (
                      <li key={movie['Movie ID']} style={{ padding: '10px 4px', borderBlockEnd: '1px solid var(--glass-border)' }}>
                        <button
                          type="button"
                          className="recent-release-button"
                          onClick={() => openMovie(movie)}
                          aria-label={`${movie.Name}${date ? `, released ${date}` : ''}, ${badge ? `rated ${movie['Vote Average']}` : 'not rated'}`}
                          style={{ justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <PosterThumb movie={movie} width={32} height={48} radius={4} />
                            <span style={{ display: 'block', minWidth: 0 }}>
                              <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {movie.Name}
                              </span>
                              <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                                <ClockCircleOutlined /> {date}
                              </span>
                            </span>
                          </span>
                          <Tag color={badge ? 'blue' : undefined} style={{ flexShrink: 0 }}>{badge ?? NOT_RATED}</Tag>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Col>
        </Row>
      </DashboardSection>

      <DashboardSection title="Explore More">
        <Row gutter={[SPACING.lg, SPACING.lg]}>
          <Col xs={24} sm={12}>
            <CtaCard
              title="Browse the full catalogue"
              text="Search, filter, and compare every movie"
              buttonText="Go to Movies"
              icon={<UnorderedListOutlined />}
              primary
              onClick={() => navigate('/movies')}
              isDark={isDark}
            />
          </Col>
          <Col xs={24} sm={12}>
            <CtaCard
              title="Dive into the analytics"
              text="Charts on people, ratings, runtime, revenue"
              buttonText="Go to Stats"
              icon={<BarChartOutlined />}
              onClick={() => navigate('/stats')}
              isDark={isDark}
            />
          </Col>
        </Row>
      </DashboardSection>
      </>
      )}

      {drawerMounted && (
        <ChunkErrorBoundary onError={handleDrawerLoadError}>
          <Suspense fallback={null}>
            <MovieDrawer movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </div>
    </LoadingError>
  );
};

export default Dashboard;
