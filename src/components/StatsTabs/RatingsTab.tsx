import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import { useNavigate } from 'react-router';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import RadarChart from '../Charts/RadarChart';
import LineChart from '../Charts/LineChart';
import ScatterChart from '../Charts/ScatterChart';
import ChartBlock from './ChartBlock';
import { groupByField } from '../../utils/statsHelpers';
import { getLanguageName } from '../../utils/languages';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie } from '../../types/movie';

interface RatingsTabProps { movies: Movie[] }

const RatingsTab: React.FC<RatingsTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

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

  const avgVoteByYearData = useMemo<ChartData<'line'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    movies.forEach(m => {
      const v = parseFloat(m['Vote Average']);
      const y = m['Release Year'];
      if (!isNaN(v) && y) {
        if (!sums[y]) sums[y] = { sum: 0, count: 0 };
        sums[y].sum += v;
        sums[y].count += 1;
      }
    });
    const sorted = Object.entries(sums).sort(([a], [b]) => parseInt(a) - parseInt(b));
    return {
      labels: sorted.map(([y]) => y),
      datasets: [{
        label: 'Avg Vote',
        data: sorted.map(([, { sum, count }]) => parseFloat((sum / count).toFixed(2))),
        borderColor: '#34d399',
        backgroundColor: 'rgba(52,211,153,0.15)',
        fill: true,
      }],
    };
  }, [movies]);

  const { voteScatterData, voteScatterLabels } = useMemo(() => {
    const points: { name: string; x: number; y: number }[] = [];
    movies.forEach(m => {
      const voteCount = parseInt(m['Vote Count'], 10);
      const voteAvg = parseFloat(m['Vote Average']);
      if (!isNaN(voteCount) && voteCount > 0 && !isNaN(voteAvg) && voteAvg > 0) {
        points.push({ name: m.Name, x: voteCount, y: voteAvg });
      }
    });
    const data: ChartData<'scatter'> = {
      datasets: [{
        label: 'Movies',
        data: points.map(p => ({ x: p.x, y: p.y })),
        backgroundColor: 'rgba(129,140,248,0.5)',
        hoverBackgroundColor: '#818cf8',
      }],
    };
    return { voteScatterData: data, voteScatterLabels: points.map(p => p.name) };
  }, [movies]);

  const handleVoteBucketClick = (index: number) => {
    const label = voteDistData.labels?.[index] as string | undefined;
    if (!label) return;
    const [lo, hi] = label.split('–').map(Number);
    navigate('/movies', { state: { presetFilters: { voteRange: [lo, hi] } } });
  };

  const handleGenreClick = (index: number) => {
    const genre = avgVoteByGenreData.labels?.[index] as string | undefined;
    if (!genre) return;
    navigate('/movies', { state: { presetFilters: { genres: [genre] } } });
  };

  const handleYearClick = (index: number) => {
    const year = parseInt(avgVoteByYearData.labels?.[index] as string, 10);
    if (isNaN(year)) return;
    navigate('/movies', { state: { presetFilters: { yearRange: [year, year] } } });
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Vote Average Distribution" height={360} isDark={isDark}><BarChart data={voteDistData} isDark={isDark} onElementClick={handleVoteBucketClick} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Average Vote by Language (Top 8)" height={360} isDark={isDark}><RadarChart data={avgVoteByLanguageData} isDark={isDark} /></ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Average Vote by Year" height={360} isDark={isDark}><LineChart data={avgVoteByYearData} isDark={isDark} onElementClick={handleYearClick} /></ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Average Vote by Genre (Top 15)" height={440} isDark={isDark}><HorizontalBarChart data={avgVoteByGenreData} height={440} isDark={isDark} onElementClick={handleGenreClick} /></ChartBlock>
      </Col>
      <Col xs={24}>
        <ChartBlock title="Vote Count vs Vote Average (outlier check)" height={400} isDark={isDark}>
          <ScatterChart data={voteScatterData} isDark={isDark} xLabel="Vote Count" yLabel="Vote Average" pointLabels={voteScatterLabels} />
        </ChartBlock>
      </Col>
    </Row>
  );
};

export default RatingsTab;
