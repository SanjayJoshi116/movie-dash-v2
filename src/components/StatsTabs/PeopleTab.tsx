import React, { useMemo } from 'react';
import { Row, Col, Typography } from 'antd';
import type { ChartData } from 'chart.js';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import DoughnutChart from '../Charts/DoughnutChart';
import { CHART_CARD_STYLE } from '../../utils/chartTheme';
import { groupByField, withOther, makeDoughnut } from '../../utils/statsHelpers';
import type { Movie } from '../../types/movie';

const { Title } = Typography;

interface PeopleTabProps { movies: Movie[] }

const ChartBlock: React.FC<{ title: string; height?: number; children: React.ReactNode }> = ({ title, height, children }) => (
  <div style={{ ...CHART_CARD_STYLE, padding: 24, marginBottom: 24 }}>
    <Title level={5} style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>{title}</Title>
    <div style={height !== undefined ? { height } : {}}>{children}</div>
  </div>
);

const PeopleTab: React.FC<PeopleTabProps> = ({ movies }) => {
  const topActorsData = useMemo<ChartData<'bar'>>(() => {
    const counts: Record<string, number> = {};
    movies.forEach(m => {
      m['Actors/Actresses'].split(',').forEach(a => {
        const name = a.trim();
        if (name) counts[name] = (counts[name] ?? 0) + 1;
      });
    });
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 15);
    return {
      labels: top.map(([name]) => name),
      datasets: [{ label: 'Appearances', data: top.map(([, c]) => c), backgroundColor: '#818cf8', hoverBackgroundColor: '#6366f1' }],
    };
  }, [movies]);

  const topDirectorsData = useMemo<ChartData<'bar'>>(() => {
    const g = groupByField(movies, 'Director');
    const top = Object.entries(g).sort(([, a], [, b]) => b - a).slice(0, 15);
    return {
      labels: top.map(([d]) => d),
      datasets: [{ label: 'Movies', data: top.map(([, c]) => c), backgroundColor: '#34d399', hoverBackgroundColor: '#10b981' }],
    };
  }, [movies]);

  const companyDoughnutData = useMemo(
    () => makeDoughnut(withOther(groupByField(movies, 'Production Company'), 10), 'Movies by Company'),
    [movies]
  );

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 15 Actors & Actresses" height={480}><HorizontalBarChart data={topActorsData} height={480} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 15 Directors" height={480}><HorizontalBarChart data={topDirectorsData} height={480} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Production Company" height={380}><DoughnutChart data={companyDoughnutData} /></ChartBlock>
      </Col>
    </Row>
  );
};

export default PeopleTab;
