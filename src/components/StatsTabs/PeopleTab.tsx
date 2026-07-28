import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import { useNavigate } from 'react-router';
import type { ChartData } from 'chart.js';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import DoughnutChart from '../Charts/DoughnutChart';
import ChartBlock from './ChartBlock';
import { groupByField, withOther, makeDoughnut } from '../../utils/statsHelpers';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie } from '../../types/movie';

interface PeopleTabProps { movies: Movie[] }

const MIN_FILMS = 2;

const PeopleTab: React.FC<PeopleTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

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

  const avgVoteByDirectorData = useMemo<ChartData<'bar'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    movies.forEach(m => {
      const v = parseFloat(m['Vote Average']);
      if (isNaN(v) || !m.Director) return;
      if (!sums[m.Director]) sums[m.Director] = { sum: 0, count: 0 };
      sums[m.Director].sum += v;
      sums[m.Director].count += 1;
    });
    const top = Object.entries(sums)
      .filter(([, { count }]) => count >= MIN_FILMS)
      .map(([d, { sum, count }]) => [d, sum / count] as [string, number])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);
    return {
      labels: top.map(([d]) => d),
      datasets: [{ label: 'Avg Vote', data: top.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: '#f472b6', hoverBackgroundColor: '#ec4899' }],
    };
  }, [movies]);

  const avgVoteByActorData = useMemo<ChartData<'bar'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    movies.forEach(m => {
      const v = parseFloat(m['Vote Average']);
      if (isNaN(v)) return;
      m['Actors/Actresses'].split(',').forEach(a => {
        const name = a.trim();
        if (!name) return;
        if (!sums[name]) sums[name] = { sum: 0, count: 0 };
        sums[name].sum += v;
        sums[name].count += 1;
      });
    });
    const top = Object.entries(sums)
      .filter(([, { count }]) => count >= MIN_FILMS)
      .map(([a, { sum, count }]) => [a, sum / count] as [string, number])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);
    return {
      labels: top.map(([a]) => a),
      datasets: [{ label: 'Avg Vote', data: top.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: '#38bdf8', hoverBackgroundColor: '#0ea5e9' }],
    };
  }, [movies]);

  const handleDirectorClick = (index: number) => {
    const name = topDirectorsData.labels?.[index] as string | undefined;
    if (!name) return;
    navigate('/movies', { state: { presetFilters: { directors: [name] } } });
  };

  const handleAvgVoteDirectorClick = (index: number) => {
    const name = avgVoteByDirectorData.labels?.[index] as string | undefined;
    if (!name) return;
    navigate('/movies', { state: { presetFilters: { directors: [name] } } });
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 15 Actors & Actresses" height={480} isDark={isDark}><HorizontalBarChart data={topActorsData} height={480} isDark={isDark} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 15 Directors" height={480} isDark={isDark}><HorizontalBarChart data={topDirectorsData} height={480} isDark={isDark} onElementClick={handleDirectorClick} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title={`Highest Rated Directors (${MIN_FILMS}+ films)`} height={440} isDark={isDark}>
          <HorizontalBarChart data={avgVoteByDirectorData} height={440} isDark={isDark} onElementClick={handleAvgVoteDirectorClick} />
        </ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title={`Highest Rated Actors & Actresses (${MIN_FILMS}+ films)`} height={440} isDark={isDark}>
          <HorizontalBarChart data={avgVoteByActorData} height={440} isDark={isDark} />
        </ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Movies by Production Company" height={380} isDark={isDark}><DoughnutChart data={companyDoughnutData} isDark={isDark} /></ChartBlock>
      </Col>
    </Row>
  );
};

export default PeopleTab;
