import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import { useNavigate } from 'react-router';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import PolarAreaChart from '../Charts/PolarAreaChart';
import ChartBlock from './ChartBlock';
import { groupByField, withOther, makePolar } from '../../utils/statsHelpers';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie } from '../../types/movie';

interface RuntimeTabProps { movies: Movie[] }

const RUNTIME_BUCKETS = [
  { label: '< 60 min',    min: 0,   max: 60   },
  { label: '60–90 min',   min: 60,  max: 90   },
  { label: '90–120 min',  min: 90,  max: 120  },
  { label: '120–150 min', min: 120, max: 150  },
  { label: '150–180 min', min: 150, max: 180  },
  { label: '> 180 min',   min: 180, max: 9999 },
];

const RuntimeTab: React.FC<RuntimeTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const top50RuntimeData = useMemo<ChartData<'bar'>>(() => {
    const top50 = [...movies]
      .filter(m => !isNaN(parseFloat(m.Runtime)) && parseFloat(m.Runtime) > 0)
      .sort((a, b) => parseFloat(b.Runtime) - parseFloat(a.Runtime))
      .slice(0, 50);
    return {
      labels: top50.map(m => m.Name),
      datasets: [{ label: 'Runtime (mins)', data: top50.map(m => parseFloat(m.Runtime)), backgroundColor: '#fb923c', hoverBackgroundColor: '#f97316' }],
    };
  }, [movies]);

  const runtimeBucketVoteData = useMemo<ChartData<'bar'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    RUNTIME_BUCKETS.forEach(b => { sums[b.label] = { sum: 0, count: 0 }; });
    movies.forEach(m => {
      const r = parseFloat(m.Runtime);
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(r) && !isNaN(v)) {
        const bucket = RUNTIME_BUCKETS.find(b => r >= b.min && r < b.max);
        if (bucket) { sums[bucket.label].sum += v; sums[bucket.label].count += 1; }
      }
    });
    const avgs = RUNTIME_BUCKETS.map(b => sums[b.label].count ? parseFloat((sums[b.label].sum / sums[b.label].count).toFixed(2)) : 0);
    return {
      labels: RUNTIME_BUCKETS.map(b => b.label),
      datasets: [{ label: 'Avg Vote', data: avgs, backgroundColor: '#fbbf24', hoverBackgroundColor: '#f59e0b' }],
    };
  }, [movies]);

  const avgRuntimeByDecadeData = useMemo<ChartData<'bar'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    movies.forEach(m => {
      const r = parseFloat(m.Runtime);
      const y = parseInt(m['Release Year'], 10);
      if (isNaN(r) || r <= 0 || isNaN(y)) return;
      const decade = `${Math.floor(y / 10) * 10}s`;
      if (!sums[decade]) sums[decade] = { sum: 0, count: 0 };
      sums[decade].sum += r;
      sums[decade].count += 1;
    });
    const sorted = Object.entries(sums).sort(([a], [b]) => parseInt(a) - parseInt(b));
    return {
      labels: sorted.map(([d]) => d),
      datasets: [{
        label: 'Avg Runtime (mins)',
        data: sorted.map(([, { sum, count }]) => Math.round(sum / count)),
        backgroundColor: '#a78bfa',
        hoverBackgroundColor: '#8b5cf6',
      }],
    };
  }, [movies]);

  const countryPolarData = useMemo(
    () => makePolar(withOther(groupByField(movies, 'Production Country'), 10), 'Movies by Country'),
    [movies]
  );

  const genrePolarData = useMemo(
    () => makePolar(withOther(groupByField(movies, 'Genres'), 35), 'Movies by Genre'),
    [movies]
  );

  const handleGenreClick = (index: number) => {
    const genre = genrePolarData.labels?.[index] as string | undefined;
    if (!genre || genre === 'Other') return;
    navigate('/movies', { state: { presetFilters: { genres: [genre] } } });
  };

  const handleRuntimeBucketClick = (index: number) => {
    const bucket = RUNTIME_BUCKETS[index];
    if (!bucket) return;
    navigate('/movies', { state: { presetFilters: { runtimeRange: [bucket.min, bucket.max] } } });
  };

  const handleDecadeClick = (index: number) => {
    const decade = avgRuntimeByDecadeData.labels?.[index] as string | undefined;
    if (!decade) return;
    const start = parseInt(decade, 10);
    if (isNaN(start)) return;
    navigate('/movies', { state: { presetFilters: { yearRange: [start, start + 9] } } });
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Country" height={400} isDark={isDark}><PolarAreaChart data={countryPolarData} isDark={isDark} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Genre" height={400} isDark={isDark}><PolarAreaChart data={genrePolarData} isDark={isDark} onElementClick={handleGenreClick} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Avg Vote by Runtime Length" height={320} isDark={isDark}><HorizontalBarChart data={runtimeBucketVoteData} height={320} isDark={isDark} onElementClick={handleRuntimeBucketClick} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Avg Runtime by Decade" height={320} isDark={isDark}><BarChart data={avgRuntimeByDecadeData} isDark={isDark} onElementClick={handleDecadeClick} /></ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Top 50 Longest Films" height={500} isDark={isDark}><HorizontalBarChart data={top50RuntimeData} height={500} isDark={isDark} /></ChartBlock>
      </Col>
    </Row>
  );
};

export default RuntimeTab;
