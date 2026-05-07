import React, { useMemo } from 'react';
import { Row, Col, Typography } from 'antd';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import RadarChart from '../Charts/RadarChart';
import { getCardStyle } from '../../utils/chartTheme';
import { groupByField } from '../../utils/statsHelpers';
import { getLanguageName } from '../../utils/languages';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie } from '../../types/movie';

const { Title } = Typography;

interface RatingsTabProps { movies: Movie[] }

const ChartBlock: React.FC<{ title: string; height?: number; isDark: boolean; children: React.ReactNode }> = ({ title, height, isDark, children }) => (
  <div style={{ ...getCardStyle(isDark), padding: 24, marginBottom: 24 }}>
    <Title level={5} style={{ color: 'var(--text-primary)', marginBottom: 16 }}>{title}</Title>
    <div style={height !== undefined ? { height } : {}}>{children}</div>
  </div>
);

const RatingsTab: React.FC<RatingsTabProps> = ({ movies }) => {
  const { isDark } = useTheme();

  const voteDistData = useMemo<ChartData<'bar'>>(() => {
    const buckets: Record<string, number> = {};
    for (let i = 0; i < 10; i++) buckets[`${i}–${i + 1}`] = 0;
    movies.forEach(m => {
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(v)) { const idx = Math.min(Math.floor(v), 9); buckets[`${idx}–${idx + 1}`] += 1; }
    });
    return { labels: Object.keys(buckets), datasets: [{ label: 'Movies', data: Object.values(buckets), backgroundColor: '#818cf8', hoverBackgroundColor: '#6366f1' }] };
  }, [movies]);

  const avgVoteByGenreData = useMemo<ChartData<'bar'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    movies.forEach(m => {
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(v) && m.Genres) {
        m.Genres.split(',').forEach(g => {
          const genre = g.trim();
          if (!genre) return;
          if (!sums[genre]) sums[genre] = { sum: 0, count: 0 };
          sums[genre].sum += v;
          sums[genre].count += 1;
        });
      }
    });
    const top = Object.entries(sums)
      .map(([g, { sum, count }]) => [g, sum / count] as [string, number])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);
    return {
      labels: top.map(([g]) => g),
      datasets: [{ label: 'Avg Vote', data: top.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: '#f472b6', hoverBackgroundColor: '#ec4899' }],
    };
  }, [movies]);

  const avgVoteByLanguageData = useMemo<ChartData<'radar'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    movies.forEach(m => {
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(v) && m.Language) {
        if (!sums[m.Language]) sums[m.Language] = { sum: 0, count: 0 };
        sums[m.Language].sum += v;
        sums[m.Language].count += 1;
      }
    });
    const langCounts = groupByField(movies, 'Language');
    const top8 = Object.entries(langCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([l]) => l);
    const avgs = top8.map(l => sums[l] ? parseFloat((sums[l].sum / sums[l].count).toFixed(2)) : 0);
    return {
      labels: top8.map(getLanguageName),
      datasets: [{
        label: 'Avg Vote Average',
        data: avgs,
        backgroundColor: 'rgba(129,140,248,0.2)',
        borderColor: '#818cf8',
        pointBackgroundColor: '#818cf8',
        pointBorderColor: isDark ? '#fff' : '#1e1e3f',
      }],
    };
  }, [movies, isDark]);

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Vote Average Distribution" height={360} isDark={isDark}><BarChart data={voteDistData} isDark={isDark} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Average Vote by Language (Top 8)" height={360} isDark={isDark}><RadarChart data={avgVoteByLanguageData} isDark={isDark} /></ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Average Vote by Genre (Top 15)" height={440} isDark={isDark}><HorizontalBarChart data={avgVoteByGenreData} height={440} isDark={isDark} /></ChartBlock>
      </Col>
    </Row>
  );
};

export default RatingsTab;
