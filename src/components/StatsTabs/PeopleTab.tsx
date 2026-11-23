import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import type { ChartData } from 'chart.js';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import DoughnutChart from '../Charts/DoughnutChart';
import ChartBlock from './ChartBlock';
import { groupByField, topNWithOther, makeDoughnut, drillableLabelAt, parseVote, averagesBy, splitNames, topN, topAverages } from '../../utils/statsHelpers';
import { useDrillDown } from '../../contexts/DrilldownContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CHART_PALETTE, CHART_PRIMARY } from '../../utils/chartTheme';
import type { Movie } from '../../types/movie';

interface PeopleTabProps { movies: Movie[] }

const MIN_FILMS = 2;

/** Only people with at least MIN_FILMS rated films qualify for an average ranking. */
const qualifying = <T extends { count: number }>(data: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(data).filter(([, { count }]) => count >= MIN_FILMS));

const PeopleTab: React.FC<PeopleTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const drillDown = useDrillDown();

  const topActorsData = useMemo<ChartData<'bar'>>(() => {
    const top = topN(groupByField(movies, 'Actors/Actresses'), 15);
    return {
      labels: top.map(([name]) => name),
      datasets: [{ label: 'Appearances', data: top.map(([, c]) => c), backgroundColor: CHART_PRIMARY }],
    };
  }, [movies]);

  const topDirectorsData = useMemo<ChartData<'bar'>>(() => {
    const top = topN(groupByField(movies, 'Director'), 15);
    return {
      labels: top.map(([d]) => d),
      datasets: [{ label: 'Movies', data: top.map(([, c]) => c), backgroundColor: CHART_PALETTE[1] }],
    };
  }, [movies]);

  const companyDoughnutData = useMemo(
    () => makeDoughnut(topNWithOther(groupByField(movies, 'Production Company')), 'Movies by Company'),
    [movies]
  );

  const avgVoteByDirectorData = useMemo<ChartData<'bar'>>(() => {
    // Unrated films neither lower the average nor count toward MIN_FILMS.
    const avgs = averagesBy(movies, (m) => (m.Director ? [m.Director] : []), (m) => parseVote(m['Vote Average']));
    const top = topAverages(qualifying(avgs), 15);
    return {
      labels: top.map(([d]) => d),
      datasets: [{ label: 'Avg Vote', data: top.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: CHART_PALETTE[6] }],
    };
  }, [movies]);

  const avgVoteByActorData = useMemo<ChartData<'bar'>>(() => {
    const avgs = averagesBy(movies, (m) => splitNames(m['Actors/Actresses']), (m) => parseVote(m['Vote Average']));
    const top = topAverages(qualifying(avgs), 15);
    return {
      labels: top.map(([a]) => a),
      datasets: [{ label: 'Avg Vote', data: top.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: CHART_PALETTE[5] }],
    };
  }, [movies]);

  // Plain functions: the chart wrappers read callbacks at event time (useLatest), so identity doesn't matter.
  const handleDirectorClick = (index: number) => {
    const name = drillableLabelAt(topDirectorsData.labels, index);
    if (name) drillDown({ directors: [name] });
  };
  const isDirectorClickable = (index: number) => drillableLabelAt(topDirectorsData.labels, index) !== null;

  const handleAvgVoteDirectorClick = (index: number) => {
    const name = drillableLabelAt(avgVoteByDirectorData.labels, index);
    if (name) drillDown({ directors: [name] });
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 15 Actors & Actresses" height={480} isDark={isDark}><HorizontalBarChart data={topActorsData} height={480} isDark={isDark} /></ChartBlock>
      </Col>
      <Col xs={24} lg={12}>
        <ChartBlock title="Top 15 Directors" height={480} isDark={isDark}><HorizontalBarChart data={topDirectorsData} height={480} isDark={isDark} onElementClick={handleDirectorClick} isClickable={isDirectorClickable} /></ChartBlock>
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
