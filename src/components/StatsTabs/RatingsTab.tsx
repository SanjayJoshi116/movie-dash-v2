import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import HorizontalBarChart from '../Charts/HorizontalBarChart';
import RadarChart from '../Charts/RadarChart';
import LineChart from '../Charts/LineChart';
import ScatterChart from '../Charts/ScatterChart';
import ChartBlock from './ChartBlock';
import { countIntoBuckets, bucketToRange, parseVote, continuousYears, VOTE_STEP, VOTE_MAX, averagesBy, splitNames, topAverages } from '../../utils/statsHelpers';
import { VOTE_BUCKETS } from '../../utils/chartBuckets';
import { useDrillDown } from '../../contexts/DrilldownContext';
import { getLanguageName } from '../../utils/languages';
import { useTheme } from '../../contexts/ThemeContext';
import { CHART_PALETTE, CHART_PRIMARY, withAlpha } from '../../utils/chartTheme';
import type { Movie } from '../../types/movie';

interface RatingsTabProps { movies: Movie[] }

const RatingsTab: React.FC<RatingsTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const drillDown = useDrillDown();

  const voteDistData = useMemo<ChartData<'bar'>>(() => {
    // 0 = unrated: skipped here, and excluded by the Movies vote filter, so counts match drill-downs.
    const votes = movies.map(m => parseVote(m['Vote Average'])).filter((v): v is number => v !== null);
    const counts = countIntoBuckets(votes, VOTE_BUCKETS);
    return { labels: VOTE_BUCKETS.map(b => b.label), datasets: [{ label: 'Movies', data: counts, backgroundColor: CHART_PRIMARY }] };
  }, [movies]);

  const avgVoteByGenreData = useMemo<ChartData<'bar'>>(() => {
    const avgs = averagesBy(movies, (m) => splitNames(m.Genres), (m) => parseVote(m['Vote Average']));
    const top = topAverages(avgs, 15);
    return {
      labels: top.map(([g]) => g),
      datasets: [{ label: 'Avg Vote', data: top.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: CHART_PALETTE[6] }],
    };
  }, [movies]);

  const avgVoteByLanguageData = useMemo<ChartData<'radar'>>(() => {
    const sums = averagesBy(movies, (m) => (m.Language ? [m.Language] : []), (m) => parseVote(m['Vote Average']));
    // Top 8 among languages with rated movies (most rated first, code for ties): every spoke is a
    // real average — no blank-language "Unknown" or unrated-only language plotted at 0.
    const top8 = Object.entries(sums)
      .sort(([a, x], [b, y]) => y.count - x.count || a.localeCompare(b))
      .slice(0, 8)
      .map(([l]) => l);
    const avgs = top8.map(l => parseFloat(sums[l].avg.toFixed(2)));
    return {
      labels: top8.map(getLanguageName),
      datasets: [{
        label: 'Avg Vote Average',
        data: avgs,
        backgroundColor: withAlpha(CHART_PRIMARY, 0.2),
        borderColor: CHART_PRIMARY,
        pointBackgroundColor: CHART_PRIMARY,
      }],
    };
  }, [movies]);

  // Every year from the first to the last with a rated release; years with none are `null`, so the
  // line breaks there (spanGaps stays false) and they aren't drill-down targets.
  const avgVoteByYearData = useMemo<ChartData<'line', (number | null)[]>>(() => {
    const avgs = averagesBy(movies, (m) => {
      const y = parseInt(m['Release Year'], 10);
      return isNaN(y) ? [] : [String(y)];
    }, (m) => parseVote(m['Vote Average']));
    const rated = Object.keys(avgs).map(Number);
    const years = rated.length ? continuousYears(Math.min(...rated), Math.max(...rated)) : [];
    return {
      labels: years.map(String),
      datasets: [{
        label: 'Avg Vote',
        data: years.map((y) => (avgs[y] ? parseFloat(avgs[y].avg.toFixed(2)) : null)),
        borderColor: CHART_PALETTE[1],
        backgroundColor: withAlpha(CHART_PALETTE[1], 0.15),
        fill: true,
      }],
    };
  }, [movies]);

  const { voteScatterData, voteScatterLabels } = useMemo(() => {
    const points: { name: string; x: number; y: number }[] = [];
    movies.forEach(m => {
      const voteCount = parseInt(m['Vote Count'], 10);
      const voteAvg = parseVote(m['Vote Average']);
      if (!isNaN(voteCount) && voteCount > 0 && voteAvg !== null) {
        points.push({ name: m.Name, x: voteCount, y: voteAvg });
      }
    });
    const data: ChartData<'scatter'> = {
      datasets: [{
        label: 'Movies',
        data: points.map(p => ({ x: p.x, y: p.y })),
        backgroundColor: withAlpha(CHART_PRIMARY, 0.5),
      }],
    };
    return { voteScatterData: data, voteScatterLabels: points.map(p => p.name) };
  }, [movies]);

  // Plain functions: the chart wrappers read callbacks at event time (useLatest), so identity doesn't matter.
  // onElementClick only fires for elements isClickable accepts, so handleYearClick needs no second guard.
  const handleVoteBucketClick = (index: number) => {
    const bucket = VOTE_BUCKETS[index];
    if (bucket) drillDown({ voteRange: bucketToRange(bucket, VOTE_STEP, VOTE_MAX) });
  };

  const handleGenreClick = (index: number) => {
    const genre = avgVoteByGenreData.labels?.[index] as string | undefined;
    if (genre) drillDown({ genres: [genre] });
  };

  const isYearClickable = (index: number) => typeof avgVoteByYearData.datasets[0].data[index] === 'number';
  const handleYearClick = (index: number) => {
    const year = parseInt(avgVoteByYearData.labels?.[index] as string, 10);
    drillDown({ yearRange: [year, year] });
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
        <ChartBlock title="Average Vote by Year" height={360} isDark={isDark}><LineChart data={avgVoteByYearData} isDark={isDark} onElementClick={handleYearClick} isClickable={isYearClickable} /></ChartBlock>
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
