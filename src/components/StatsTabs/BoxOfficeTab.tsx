import React, { useMemo } from 'react';
import { Row, Col, Typography } from 'antd';
import type { ChartData } from 'chart.js';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import { getCardStyle } from '../../utils/chartTheme';
import { parseRevenue, formatRevenue } from '../../utils/statsHelpers';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie } from '../../types/movie';

const { Title } = Typography;

interface BoxOfficeTabProps { movies: Movie[] }

const ChartBlock: React.FC<{ title: string; height?: number; isDark: boolean; children: React.ReactNode }> = ({ title, height, isDark, children }) => (
  <div style={{ ...getCardStyle(isDark), padding: 24, marginBottom: 24 }}>
    <Title level={5} style={{ color: 'var(--text-primary)', marginBottom: 16 }}>{title}</Title>
    <div style={height !== undefined ? { height } : {}}>{children}</div>
  </div>
);

const BoxOfficeTab: React.FC<BoxOfficeTabProps> = ({ movies }) => {
  const { isDark } = useTheme();

  const topGrossingData = useMemo<ChartData<'bar'>>(() => {
    const top = [...movies]
      .filter(m => parseRevenue(m['Box Office Revenue']) > 0)
      .sort((a, b) => parseRevenue(b['Box Office Revenue']) - parseRevenue(a['Box Office Revenue']))
      .slice(0, 20);
    return {
      labels: top.map(m => m.Name),
      datasets: [{
        label: 'Box Office Revenue',
        data: top.map(m => parseRevenue(m['Box Office Revenue'])),
        backgroundColor: '#34d399',
        hoverBackgroundColor: '#10b981',
      }],
    };
  }, [movies]);

  const topBudgetData = useMemo<ChartData<'bar'>>(() => {
    const top = [...movies]
      .filter(m => parseRevenue(m['Budget']) > 0)
      .sort((a, b) => parseRevenue(b['Budget']) - parseRevenue(a['Budget']))
      .slice(0, 20);
    return {
      labels: top.map(m => m.Name),
      datasets: [{
        label: 'Budget',
        data: top.map(m => parseRevenue(m['Budget'])),
        backgroundColor: '#818cf8',
        hoverBackgroundColor: '#6366f1',
      }],
    };
  }, [movies]);

  const avgRevenueByGenreData = useMemo<ChartData<'bar'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    movies.forEach(m => {
      const rev = parseRevenue(m['Box Office Revenue']);
      if (rev <= 0 || !m.Genres) return;
      m.Genres.split(',').forEach(g => {
        const genre = g.trim();
        if (!genre) return;
        if (!sums[genre]) sums[genre] = { sum: 0, count: 0 };
        sums[genre].sum += rev;
        sums[genre].count += 1;
      });
    });
    const top = Object.entries(sums)
      .map(([g, { sum, count }]) => [g, sum / count] as [string, number])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);
    return {
      labels: top.map(([g]) => g),
      datasets: [{
        label: 'Avg Box Office Revenue',
        data: top.map(([, v]) => v),
        backgroundColor: '#fb923c',
        hoverBackgroundColor: '#f97316',
      }],
    };
  }, [movies]);

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 20 Highest Grossing Films" height={480} isDark={isDark}>
          <HorizontalBarChart data={topGrossingData} height={480} isDark={isDark} formatValue={formatRevenue} />
        </ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 20 Highest Budget Films" height={480} isDark={isDark}>
          <HorizontalBarChart data={topBudgetData} height={480} isDark={isDark} formatValue={formatRevenue} />
        </ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Average Box Office Revenue by Genre (Top 15)" height={440} isDark={isDark}>
          <HorizontalBarChart data={avgRevenueByGenreData} height={440} isDark={isDark} formatValue={formatRevenue} />
        </ChartBlock>
      </Col>
    </Row>
  );
};

export default BoxOfficeTab;
