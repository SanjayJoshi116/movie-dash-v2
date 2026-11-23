import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import PolarAreaChart from '../Charts/PolarAreaChart';
import ChartBlock from './ChartBlock';
import { groupByField, topNWithOther, makePolar, drillableLabelAt, bucketIndexOf, bucketToRange, parseVote, averagesBy, type Bucket } from '../../utils/statsHelpers';
import { computeFilterSpans } from '../../utils/filterSpans';
import { useDrillDown } from '../../contexts/DrilldownContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CHART_PALETTE } from '../../utils/chartTheme';
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
      datasets: [{ label: 'Runtime (mins)', data: top50.map(m => parseFloat(m.Runtime)), backgroundColor: CHART_PALETTE[2] }],
    };
  }, [movies]);

  const runtimeBucketVoteData = useMemo<ChartData<'bar', (number | null)[]>>(() => {
    // Runtime ≤ 0 is unknown: skipped, so "< 60 min" counts what its drill-down lists (B119).
    // Unrated movies (parseVote → null) don't lower a bucket's average.
    const byBucket = averagesBy(movies, (m) => {
      const r = parseFloat(m.Runtime);
      const i = r > 0 ? bucketIndexOf(r, RUNTIME_BUCKETS) : -1;
      return i >= 0 ? [RUNTIME_BUCKETS[i].label] : [];
    }, (m) => parseVote(m['Vote Average']));
    // A bucket with no rated movie has no average: null (no bar), not a fake 0.
    const avgs = RUNTIME_BUCKETS.map(b => (byBucket[b.label] ? parseFloat(byBucket[b.label].avg.toFixed(2)) : null));
    return {
      labels: RUNTIME_BUCKETS.map(b => b.label),
      datasets: [{ label: 'Avg Vote', data: avgs, backgroundColor: CHART_PALETTE[3] }],
    };
  }, [movies]);

  const avgRuntimeByDecadeData = useMemo<ChartData<'bar'>>(() => {
    const avgs = averagesBy(movies, (m) => {
      const y = parseInt(m['Release Year'], 10);
      return isNaN(y) ? [] : [`${Math.floor(y / 10) * 10}s`];
    }, (m) => {
      const r = parseFloat(m.Runtime);
      return r > 0 ? r : null; // runtime ≤ 0 = unknown
    });
    const sorted = Object.entries(avgs).sort(([a], [b]) => parseInt(a) - parseInt(b));
    return {
      labels: sorted.map(([d]) => d),
      datasets: [{
        label: 'Avg Runtime (mins)',
        data: sorted.map(([, { avg }]) => Math.round(avg)),
        backgroundColor: CHART_PALETTE[4],
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

  // The open "> 180 min" bucket ends at the Movies runtime slider's own max.
  const maxRuntime = useMemo(() => computeFilterSpans(movies).runtimeMax, [movies]);

  // Plain functions: the chart wrappers read callbacks at event time (useLatest), so identity doesn't matter.
  const handleGenreClick = (index: number) => {
    const genre = drillableLabelAt(genrePolarData.labels, index);
    if (genre) drillDown({ genres: [genre] });
  };
  const isGenreClickable = (index: number) => drillableLabelAt(genrePolarData.labels, index) !== null;

  const handleRuntimeBucketClick = (index: number) => {
    const bucket = RUNTIME_BUCKETS[index];
    if (bucket) drillDown({ runtimeRange: bucketToRange(bucket, 1, maxRuntime) });
  };

  const handleDecadeClick = (index: number) => {
    const start = parseInt(avgRuntimeByDecadeData.labels?.[index] as string, 10);
    if (!isNaN(start)) drillDown({ yearRange: [start, start + 9] });
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Country" height={400} isDark={isDark}><PolarAreaChart data={countryPolarData} isDark={isDark} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Genre" height={400} isDark={isDark}><PolarAreaChart data={genrePolarData} isDark={isDark} onElementClick={handleGenreClick} isClickable={isGenreClickable} /></ChartBlock>
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
