import React, { useMemo } from 'react';
import { Row, Col, Typography } from 'antd';
import type { ChartData } from 'chart.js';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import MatrixChart from '../Charts/MatrixChart';
import type { MatrixDataPoint } from '../Charts/MatrixChart';
import TopNExplorer from '../TopNExplorer';
import { getCardStyle, CHART_PALETTE } from '../../utils/chartTheme';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie } from '../../types/movie';

const { Title } = Typography;

interface ExploreTabProps { movies: Movie[] }

const DECADE_LABELS = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
const TOP_GENRES_N = 10;

const ChartBlock: React.FC<{ title: string; height?: number; isDark: boolean; children: React.ReactNode }> = ({ title, height, isDark, children }) => (
  <div style={{ ...getCardStyle(isDark), padding: 24, marginBottom: 24 }}>
    <Title level={5} style={{ color: 'var(--text-primary)', marginBottom: 16 }}>{title}</Title>
    <div style={height !== undefined ? { height } : {}}>{children}</div>
  </div>
);

const ExploreTab: React.FC<ExploreTabProps> = ({ movies }) => {
  const { isDark } = useTheme();

  const genreBarData = useMemo<ChartData<'bar'>>(() => {
    const counts: Record<string, number> = {};
    movies.forEach(m => {
      m.Genres.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) counts[genre] = (counts[genre] ?? 0) + 1;
      });
    });
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 20);
    return {
      labels: top.map(([label]) => label),
      datasets: [{ label: 'Movies', data: top.map(([, v]) => v), backgroundColor: CHART_PALETTE, hoverBackgroundColor: CHART_PALETTE }],
    };
  }, [movies]);

  const { matrixData, matrixGenres } = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    movies.forEach(m => {
      m.Genres.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) genreCounts[genre] = (genreCounts[genre] ?? 0) + 1;
      });
    });
    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_GENRES_N)
      .map(([g]) => g);

    const matrix: Record<string, Record<string, number>> = {};
    DECADE_LABELS.forEach(d => {
      matrix[d] = {};
      topGenres.forEach(g => { matrix[d][g] = 0; });
    });

    movies.forEach(m => {
      const year = parseInt(m['Release Year'], 10);
      if (isNaN(year)) return;
      const decadeLabel = `${Math.floor(year / 10) * 10}s`;
      if (!matrix[decadeLabel]) return;
      m.Genres.split(',').forEach(g => {
        const genre = g.trim();
        if (topGenres.includes(genre)) {
          matrix[decadeLabel][genre] = (matrix[decadeLabel][genre] ?? 0) + 1;
        }
      });
    });

    const matrixData: MatrixDataPoint[] = [];
    DECADE_LABELS.forEach(decade => {
      topGenres.forEach(genre => {
        matrixData.push({ x: decade, y: genre, v: matrix[decade]?.[genre] ?? 0 });
      });
    });

    return { matrixData, matrixGenres: topGenres };
  }, [movies]);

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Genre Distribution (Top 20)" height={420} isDark={isDark}>
          <HorizontalBarChart data={genreBarData} height={420} isDark={isDark} />
        </ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Year × Genre Heatmap" height={420} isDark={isDark}>
          <MatrixChart data={matrixData} xLabels={DECADE_LABELS} yLabels={matrixGenres} height={420} isDark={isDark} />
        </ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Top 10 Explorer" isDark={isDark}>
          <TopNExplorer movies={movies} isDark={isDark} />
        </ChartBlock>
      </Col>
    </Row>
  );
};

export default ExploreTab;
