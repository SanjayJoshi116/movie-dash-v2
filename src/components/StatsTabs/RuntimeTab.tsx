import React, { useMemo } from 'react';
import { Row, Col, Typography } from 'antd';
import type { ChartData } from 'chart.js';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import PolarAreaChart from '../Charts/PolarAreaChart';
import { CHART_CARD_STYLE } from '../../utils/chartTheme';
import { groupByField, withOther, makePolar } from '../../utils/statsHelpers';
import type { Movie } from '../../types/movie';

const { Title } = Typography;

interface RuntimeTabProps { movies: Movie[] }

const ChartBlock: React.FC<{ title: string; height?: number; children: React.ReactNode }> = ({ title, height, children }) => (
  <div style={{ ...CHART_CARD_STYLE, padding: 24, marginBottom: 24 }}>
    <Title level={5} style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>{title}</Title>
    <div style={height !== undefined ? { height } : {}}>{children}</div>
  </div>
);

const RuntimeTab: React.FC<RuntimeTabProps> = ({ movies }) => {
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
    const buckets = [
      { label: '< 60 min',    min: 0,   max: 60       },
      { label: '60–90 min',   min: 60,  max: 90       },
      { label: '90–120 min',  min: 90,  max: 120      },
      { label: '120–150 min', min: 120, max: 150      },
      { label: '150–180 min', min: 150, max: 180      },
      { label: '> 180 min',   min: 180, max: Infinity },
    ];
    const sums: Record<string, { sum: number; count: number }> = {};
    buckets.forEach(b => { sums[b.label] = { sum: 0, count: 0 }; });
    movies.forEach(m => {
      const r = parseFloat(m.Runtime);
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(r) && !isNaN(v)) {
        const bucket = buckets.find(b => r >= b.min && r < b.max);
        if (bucket) { sums[bucket.label].sum += v; sums[bucket.label].count += 1; }
      }
    });
    const avgs = buckets.map(b => sums[b.label].count ? parseFloat((sums[b.label].sum / sums[b.label].count).toFixed(2)) : 0);
    return {
      labels: buckets.map(b => b.label),
      datasets: [{ label: 'Avg Vote', data: avgs, backgroundColor: '#fbbf24', hoverBackgroundColor: '#f59e0b' }],
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

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Country" height={400}><PolarAreaChart data={countryPolarData} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Genre" height={400}><PolarAreaChart data={genrePolarData} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Avg Vote by Runtime Length" height={320}><HorizontalBarChart data={runtimeBucketVoteData} height={320} /></ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Top 50 Longest Films" height={500}><HorizontalBarChart data={top50RuntimeData} height={500} /></ChartBlock>
      </Col>
    </Row>
  );
};

export default RuntimeTab;
