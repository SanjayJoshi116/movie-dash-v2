import React, { useMemo } from 'react';
import { Row, Col, Typography, Spin, Alert, Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { UnorderedListOutlined, BarChartOutlined, TrophyOutlined, FireOutlined, CalendarOutlined } from '@ant-design/icons';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../contexts/ThemeContext';
import StatCard from '../components/StatCard';
import { getCardStyle } from '../utils/chartTheme';
import { parseRevenue, formatRevenue } from '../utils/statsHelpers';
import type { Movie } from '../types/movie';

const { Title, Text } = Typography;

interface HighlightCardProps {
  icon: React.ReactNode;
  label: string;
  movie: Movie | null;
  detail: string;
  isDark: boolean;
}

const HighlightCard: React.FC<HighlightCardProps> = ({ icon, label, movie, detail, isDark }) => (
  <div style={{ ...getCardStyle(isDark), padding: 20, height: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
      {icon}
      {label}
    </div>
    {movie ? (
      <>
        <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
          {movie.Name}
        </div>
        <Tag color="blue">{detail}</Tag>
      </>
    ) : (
      <Text style={{ color: 'var(--text-muted)' }}>No data</Text>
    )}
  </div>
);

const Dashboard: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const { isDark } = useTheme();
  const navigate = useNavigate();

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
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

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}><StatCard label="Total Movies" value={stats.totalMovies} color="#818cf8" /></Col>
        <Col xs={24} sm={12} md={6}><StatCard label="Average Rating" value={stats.avgRating.toFixed(1)} color="#34d399" suffix="/ 10" /></Col>
        <Col xs={24} sm={12} md={6}><StatCard label="Average Runtime" value={stats.avgRuntime} color="#a78bfa" suffix="mins" /></Col>
        <Col xs={24} sm={12} md={6}><StatCard label="Total Box Office" value={formatRevenue(stats.totalRevenue)} color="#fb923c" /></Col>
      </Row>

      <Title level={5} style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Highlights</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <HighlightCard
            icon={<TrophyOutlined />}
            label="Top Rated"
            movie={highlights.topRated}
            detail={highlights.topRated ? `⭐ ${highlights.topRated['Vote Average']}` : ''}
            isDark={isDark}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <HighlightCard
            icon={<FireOutlined />}
            label="Most Popular"
            movie={highlights.mostPopular}
            detail={highlights.mostPopular ? `${parseFloat(highlights.mostPopular['Popularity Score']).toFixed(1)} popularity` : ''}
            isDark={isDark}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <HighlightCard
            icon={<CalendarOutlined />}
            label="Newest Release"
            movie={highlights.newest}
            detail={highlights.newest ? highlights.newest['Release Date'] : ''}
            isDark={isDark}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <div style={{ ...getCardStyle(isDark), padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Title level={5} style={{ color: 'var(--text-primary)', margin: 0 }}>Browse the full catalogue</Title>
              <Text style={{ color: 'var(--text-secondary)' }}>Search, filter, and compare every movie</Text>
            </div>
            <Button type="primary" icon={<UnorderedListOutlined />} onClick={() => navigate('/movies')}>
              Go to Movies
            </Button>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ ...getCardStyle(isDark), padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Title level={5} style={{ color: 'var(--text-primary)', margin: 0 }}>Dive into the analytics</Title>
              <Text style={{ color: 'var(--text-secondary)' }}>Charts on people, ratings, runtime, revenue</Text>
            </div>
            <Button icon={<BarChartOutlined />} onClick={() => navigate('/stats')}>
              Go to Stats
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
