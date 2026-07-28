import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import { useNavigate } from 'react-router';
import type { ChartData } from 'chart.js';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import ChartBlock from './ChartBlock';
import { parseRevenue, formatRevenue } from '../../utils/statsHelpers';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie } from '../../types/movie';

interface BoxOfficeTabProps { movies: Movie[] }

const BoxOfficeTab: React.FC<BoxOfficeTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

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

  const topProfitData = useMemo<ChartData<'bar'>>(() => {
    const top = movies
      .map(m => ({ name: m.Name, revenue: parseRevenue(m['Box Office Revenue']), budget: parseRevenue(m['Budget']) }))
      .filter(m => m.revenue > 0 && m.budget > 0)
      .map(m => ({ name: m.name, profit: m.revenue - m.budget }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20);
    return {
      labels: top.map(m => m.name),
      datasets: [{
        label: 'Profit (Revenue − Budget)',
        data: top.map(m => m.profit),
        backgroundColor: top.map(m => (m.profit >= 0 ? '#34d399' : '#f87171')),
        hoverBackgroundColor: top.map(m => (m.profit >= 0 ? '#10b981' : '#ef4444')),
      }],
    };
  }, [movies]);

  const formatProfit = (n: number): string => {
    const sign = n < 0 ? '-' : '';
    return `${sign}${formatRevenue(Math.abs(n))}`;
  };

  const MIN_BUDGET_FOR_ROI = 100_000;

  const topRoiData = useMemo<ChartData<'bar'>>(() => {
    const top = movies
      .map(m => ({ name: m.Name, revenue: parseRevenue(m['Box Office Revenue']), budget: parseRevenue(m['Budget']) }))
      .filter(m => m.revenue > 0 && m.budget >= MIN_BUDGET_FOR_ROI)
      .map(m => ({ name: m.name, roi: m.revenue / m.budget }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 20);
    return {
      labels: top.map(m => m.name),
      datasets: [{
        label: 'ROI (Revenue / Budget)',
        data: top.map(m => parseFloat(m.roi.toFixed(2))),
        backgroundColor: '#22d3ee',
        hoverBackgroundColor: '#06b6d4',
      }],
    };
  }, [movies]);

  const formatRoi = (n: number): string => `${n.toFixed(1)}x`;

  const handleGenreClick = (index: number) => {
    const genre = avgRevenueByGenreData.labels?.[index] as string | undefined;
    if (!genre) return;
    navigate('/movies', { state: { presetFilters: { genres: [genre] } } });
  };

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
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 20 Most Profitable Films (Revenue − Budget)" height={480} isDark={isDark}>
          <HorizontalBarChart data={topProfitData} height={480} isDark={isDark} formatValue={formatProfit} />
        </ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title={`Top 20 by ROI (Revenue / Budget, min $${MIN_BUDGET_FOR_ROI / 1000}K budget)`} height={480} isDark={isDark}>
          <HorizontalBarChart data={topRoiData} height={480} isDark={isDark} formatValue={formatRoi} />
        </ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Average Box Office Revenue by Genre (Top 15)" height={440} isDark={isDark}>
          <HorizontalBarChart data={avgRevenueByGenreData} height={440} isDark={isDark} formatValue={formatRevenue} onElementClick={handleGenreClick} />
        </ChartBlock>
      </Col>
    </Row>
  );
};

export default BoxOfficeTab;
