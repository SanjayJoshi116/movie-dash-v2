import React, { useMemo, useState } from 'react';
import { Row, Col, Typography, Button, Tag, List, Grid, Empty } from 'antd';
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
import MovieDrawer from '../components/MovieDrawer';
import LoadingError from '../components/LoadingError';
import LineChart from '../components/Charts/LineChart';
import BarChart from '../components/Charts/BarChart';
import DoughnutChart from '../components/Charts/DoughnutChart';
import PosterThumb from '../components/PosterThumb';
import { getCardStyle, SPACING, FONT_SIZE } from '../utils/chartTheme';
import { groupByField, makeDoughnut, parseRevenue, formatRevenue } from '../utils/statsHelpers';
import type { Movie } from '../types/movie';

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
    aria-label={movie ? `View details for ${movie.Name}` : undefined}
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
          <Tag color="blue">{detail}</Tag>
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
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const screens = Grid.useBreakpoint();
  const miniChartHeight = screens.md ? 240 : 180;

  const stats = useMemo(() => {
    const votes = movies.map(m => parseFloat(m['Vote Average'])).filter(v => !isNaN(v) && v > 0);
    const runtimes = movies.map(m => parseFloat(m.Runtime)).filter(r => !isNaN(r) && r > 0);
    const totalRevenue = movies.reduce((sum, m) => sum + parseRevenue(m['Box Office Revenue']), 0);

    return {
      totalMovies: movies.length,
      avgRating: votes.length ? votes.reduce((a, b) => a + b, 0) / votes.length : 0,
      avgRuntime: runtimes.length ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length) : 0,
      totalRevenue,
    };
  }, [movies]);

  const highlights = useMemo(() => {
    let topRated: Movie | null = null;
    let mostPopular: Movie | null = null;
    let newest: Movie | null = null;
    let newestTime = -Infinity;

    movies.forEach((m) => {
      const vote = parseFloat(m['Vote Average']);
      if (!isNaN(vote) && (!topRated || vote > parseFloat(topRated['Vote Average']))) topRated = m;

      const popularity = parseFloat(m['Popularity Score']);
      if (!isNaN(popularity) && (!mostPopular || popularity > parseFloat(mostPopular['Popularity Score']))) mostPopular = m;

      const time = Date.parse(m['Release Date']);
      if (!isNaN(time) && time > newestTime) { newestTime = time; newest = m; }
    });

    return { topRated, mostPopular, newest };
  }, [movies]);

  const yearTrendData = useMemo<ChartData<'line'>>(() => {
    const g = groupByField(movies, 'Release Year');
    const sorted = Object.entries(g)
      .filter(([y]) => !isNaN(parseInt(y, 10)))
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
      .slice(-10);
    return {
      labels: sorted.map(([y]) => y),
      datasets: [{
        label: 'Movies Released',
        data: sorted.map(([, c]) => c),
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129,140,248,0.15)',
        fill: true,
      }],
    };
  }, [movies]);

  const genreDoughnutData = useMemo<ChartData<'doughnut'>>(() => {
    const counts = groupByField(movies, 'Genres');
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const top = sorted.slice(0, 6);
    const otherTotal = sorted.slice(6).reduce((sum, [, c]) => sum + c, 0);
    const data: Record<string, number> = Object.fromEntries(top);
    if (otherTotal > 0) data.Other = otherTotal;
    return makeDoughnut(data, 'Genres');
  }, [movies]);

  const RATING_BUCKET_RANGES: [number, number][] = [[0, 2], [2, 4], [4, 6], [6, 8], [8, 10]];

  const ratingBucketData = useMemo<ChartData<'bar'>>(() => {
    const buckets = ['0–2', '2–4', '4–6', '6–8', '8–10'];
    const counts = [0, 0, 0, 0, 0];
    movies.forEach((m) => {
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(v) && v > 0) counts[Math.min(Math.floor(v / 2), 4)] += 1;
    });
    return { labels: buckets, datasets: [{ label: 'Movies', data: counts, backgroundColor: '#34d399', hoverBackgroundColor: '#10b981' }] };
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

  const handleGenreClick = (index: number) => {
    const label = (genreDoughnutData.labels?.[index] ?? null) as string | null;
    if (!label || label === 'Other') { navigate('/movies'); return; }
    navigate('/movies', { state: { presetFilters: { genres: [label] } } });
  };

  const handleRatingBucketClick = (index: number) => {
    const range = RATING_BUCKET_RANGES[index];
    if (!range) return;
    navigate('/movies', { state: { presetFilters: { voteRange: range } } });
  };

  const handleYearClick = (index: number) => {
    const year = yearLabels[index];
    if (!year) return;
    const y = parseInt(year, 10);
    navigate('/movies', { state: { presetFilters: { yearRange: [y, y] } } });
  };

  return (
    <LoadingError loading={loading} error={error} onRetry={refetch}>
    <div style={{ padding: SPACING.xxl }}>
      <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 4 }}>🏠 Dashboard</Title>
      <Text style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: SPACING.xxl }}>
        Snapshot of your movie collection — key stats, highlights, and trends at a glance.
      </Text>
      {movies.length === 0 ? (
        <div style={{ ...getCardStyle(isDark), padding: `48px ${SPACING.xxl}px` }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No movies yet — add one to see stats and trends here."
          >
            <Button type="primary" onClick={() => navigate('/movies')}>Go to Movies</Button>
          </Empty>
        </div>
      ) : (
      <>
      <DashboardSection title="Overview">
        <Row gutter={[SPACING.lg, SPACING.lg]}>
          <Col xs={24} md={12}>
            <StatCard label="Total Movies" value={stats.totalMovies} color="#818cf8" icon={<VideoCameraOutlined />} hero />
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[SPACING.lg, SPACING.lg]} style={{ height: '100%' }}>
              <Col xs={24} sm={8}><StatCard label="Average Rating" value={stats.avgRating.toFixed(1)} color="#34d399" suffix="/ 10" icon={<StarOutlined />} /></Col>
              <Col xs={24} sm={8}><StatCard label="Average Runtime" value={stats.avgRuntime} color="#a78bfa" suffix="mins" icon={<ClockCircleOutlined />} /></Col>
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
              detail={highlights.topRated ? `⭐ ${highlights.topRated['Vote Average']}` : ''}
              isDark={isDark}
              onSelect={setSelectedMovie}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <HighlightCard
              icon={<FireOutlined />}
              label="Most Popular"
              movie={highlights.mostPopular}
              detail={highlights.mostPopular ? `${parseFloat(highlights.mostPopular['Popularity Score']).toFixed(1)} popularity` : ''}
              isDark={isDark}
              onSelect={setSelectedMovie}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <HighlightCard
              icon={<CalendarOutlined />}
              label="Newest Release"
              movie={highlights.newest}
              detail={highlights.newest ? highlights.newest['Release Date'] : ''}
              isDark={isDark}
              onSelect={setSelectedMovie}
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
              <LineChart data={yearTrendData} isDark={isDark} onElementClick={handleYearClick} />
            </MiniChartCard>
          </Col>
          <Col xs={24} lg={12}>
            <MiniChartCard title="Genre Breakdown (Top 6)" isDark={isDark} height={miniChartHeight}>
              <DoughnutChart data={genreDoughnutData} isDark={isDark} onElementClick={handleGenreClick} />
            </MiniChartCard>
          </Col>
          <Col xs={24} lg={12}>
            <MiniChartCard title="Rating Distribution" isDark={isDark} height={miniChartHeight}>
              <BarChart data={ratingBucketData} isDark={isDark} onElementClick={handleRatingBucketClick} />
            </MiniChartCard>
          </Col>
          <Col xs={24} lg={12}>
            <div style={{ ...getCardStyle(isDark), padding: SPACING.xl, height: '100%' }}>
              <Text style={{ color: 'var(--text-secondary)', fontSize: FONT_SIZE.label, display: 'block', marginBottom: SPACING.md }}>
                Recent Releases
              </Text>
              <List
                dataSource={recentMovies}
                locale={{ emptyText: 'No data' }}
                renderItem={(movie) => (
                  <List.Item
                    onClick={() => setSelectedMovie(movie)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${movie.Name}`}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedMovie(movie);
                      }
                    }}
                    style={{ cursor: 'pointer', padding: '10px 4px', borderBlockEnd: '1px solid var(--glass-border)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: SPACING.md }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <PosterThumb movie={movie} width={32} height={48} radius={4} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {movie.Name}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                            <ClockCircleOutlined /> {movie['Release Date']}
                          </div>
                        </div>
                      </div>
                      <Tag color="blue" style={{ flexShrink: 0 }}>⭐ {movie['Vote Average']}</Tag>
                    </div>
                  </List.Item>
                )}
              />
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

      <MovieDrawer movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </div>
    </LoadingError>
  );
};

export default Dashboard;
