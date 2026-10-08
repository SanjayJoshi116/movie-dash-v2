import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import PolarAreaChart from '../Charts/PolarAreaChart';
import ChartBlock from './ChartBlock';
import { groupByField, topNWithOther, makePolar, isDrillableLabel, bucketIndexOf, bucketToRange, type Bucket } from '../../utils/statsHelpers';
import { useDrillDown } from '../../contexts/DrilldownContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie } from '../../types/movie';

interface RuntimeTabProps { movies: Movie[] }

// Half-open [min, maxExclusive) — a 90-minute film is in 90–120 only. Shared by chart and click;
// the open-ended last bucket drills down to the dataset's actual max runtime.
const RUNTIME_BUCKETS: Bucket[] = [
  { label: '< 60 min',    min: 0,   maxExclusive: 60 },
  { label: '60–90 min',   min: 60,  maxExclusive: 90 },
  { label: '90–120 min',  min: 90,  maxExclusive: 120 },
  { label: '120–150 min', min: 120, maxExclusive: 150 },
  { label: '150–180 min', min: 150, maxExclusive: 180 },
  { label: '> 180 min',   min: 180, maxExclusive: Infinity },
];

const RuntimeTab: React.FC<RuntimeTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const drillDown = useDrillDown();

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
        const i = bucketIndexOf(r, RUNTIME_BUCKETS);
        if (i >= 0) { sums[RUNTIME_BUCKETS[i].label].sum += v; sums[RUNTIME_BUCKETS[i].label].count += 1; }
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
    () => makePolar(topNWithOther(groupByField(movies, 'Production Country')), 'Movies by Country'),
    [movies]
  );

  const genrePolarData = useMemo(
    () => makePolar(topNWithOther(groupByField(movies, 'Genres')), 'Movies by Genre'),
    [movies]
  );

  const handleGenreClick = (index: number) => {
    const genre = genrePolarData.labels?.[index] as string | undefined;
    if (!isDrillableLabel(genre)) return;
    drillDown({ genres: [genre] });
  };

  const handleRuntimeBucketClick = (index: number) => {
    const bucket = RUNTIME_BUCKETS[index];
    if (!bucket) return;
    const maxRuntime = movies.reduce((max, m) => Math.max(max, parseFloat(m.Runtime) || 0), 0);
    drillDown({ runtimeRange: bucketToRange(bucket, 1, maxRuntime) });
  };

  const handleDecadeClick = (index: number) => {
    const decade = avgRuntimeByDecadeData.labels?.[index] as string | undefined;
    if (!decade) return;
    const start = parseInt(decade, 10);
    if (isNaN(start)) return;
    drillDown({ yearRange: [start, start + 9] });
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Country" height={400} isDark={isDark}><PolarAreaChart data={countryPolarData} isDark={isDark} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Genre" height={400} isDark={isDark}><PolarAreaChart data={genrePolarData} isDark={isDark} onElementClick={handleGenreClick} isClickable={(i) => isDrillableLabel(genrePolarData.labels?.[i] as string | undefined)} /></ChartBlock>
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
