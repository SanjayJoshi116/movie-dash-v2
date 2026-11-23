import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Row, Col } from 'antd';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import LineChart from '../Charts/LineChart';
import ChartBlock from './ChartBlock';
import { getCardStyle, CHART_PALETTE, CHART_PRIMARY, withAlpha } from '../../utils/chartTheme';
import { groupByField, topNWithOther, isDrillableLabel, drillableLabelAt, continuousYears } from '../../utils/statsHelpers';
import { useDrillDown } from '../../contexts/DrilldownContext';
import { getLanguageName } from '../../utils/languages';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie, StatsCounters } from '../../types/movie';

interface OverviewTabProps { movies: Movie[] }

interface GroupMetric {
  key: string;
  label: string;
  /** `null` = unknown: shown as "—" with no suffix. */
  value: number | null;
  suffix?: string;
  color: string;
  noGrouping?: boolean;
}

const MetricGroupCard: React.FC<{ title: string; accentColor: string; metrics: GroupMetric[]; isDark: boolean; colSpan?: number }> = ({
  title, accentColor, metrics, isDark, colSpan = 12,
}) => (
  <div style={{ ...getCardStyle(isDark), padding: 16, height: '100%', borderTop: `3px solid ${accentColor}` }}>
    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>{title}</div>
    <Row gutter={[12, 14]}>
      {metrics.map(({ key, label, value, suffix, color, noGrouping }) => (
        <Col span={colSpan} key={key}>
          <div style={{ color, fontWeight: 700, fontSize: 20, lineHeight: 1.2 }}>
            {value === null ? '—' : noGrouping ? value : value.toLocaleString()}
            {value !== null && suffix && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{suffix}</span>}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</div>
        </Col>
      ))}
    </Row>
  </div>
);

const OverviewTab: React.FC<OverviewTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const [counts, setCounts] = useState<StatsCounters>({
    totalMovies: 0, avgRuntime: 0, longestRuntime: 0, shortestRuntime: 0, totalTimeSpent: 0,
  });
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const prevTargetsRef = useRef<StatsCounters | null>(null);

  const validRuntimes   = useMemo(() => movies.map(m => parseFloat(m.Runtime)).filter(r => !isNaN(r) && r > 0), [movies]);
  const totalMovies     = useMemo(() => movies.length, [movies]);
  const avgRuntime      = useMemo(() => validRuntimes.length ? validRuntimes.reduce((a, b) => a + b, 0) / validRuntimes.length : 0, [validRuntimes]);
  const longestRuntime  = useMemo(() => validRuntimes.reduce((a, b) => Math.max(a, b), 0), [validRuntimes]);
  const shortestRuntime = useMemo(() => validRuntimes.length ? validRuntimes.reduce((a, b) => Math.min(a, b), Infinity) : 0, [validRuntimes]);
  const totalTimeSpent  = useMemo(() => validRuntimes.reduce((a, b) => a + b, 0), [validRuntimes]);

  const catalogueCounts = useMemo(() => {
    const languages = new Set<string>();
    const genres = new Set<string>();
    const directors = new Set<string>();
    movies.forEach((m) => {
      if (m.Language) languages.add(m.Language);
      if (m.Director) directors.add(m.Director);
      m.Genres?.split(',').forEach(g => { const t = g.trim(); if (t) genres.add(t); });
    });
    return { languages: languages.size, genres: genres.size, directors: directors.size };
  }, [movies]);

  // One pass for the per-year counts and the span, no spread into Math.min/max (that throws RangeError
  // on a very large catalogue). Span is `null` when no movie in scope has a year, so the cards show "—".
  const { byYear, earliest, latest } = useMemo(() => {
    const byYear = new Map<number, number>();
    let earliest: number | null = null;
    let latest: number | null = null;
    for (const m of movies) {
      const y = parseInt(m['Release Year'], 10);
      if (isNaN(y)) continue;
      byYear.set(y, (byYear.get(y) ?? 0) + 1);
      if (earliest === null || y < earliest) earliest = y;
      if (latest === null || y > latest) latest = y;
    }
    return { byYear, earliest, latest };
  }, [movies]);

  useEffect(() => {
    const intervals = intervalsRef.current;
    const targets: StatsCounters = { totalMovies, avgRuntime, longestRuntime, shortestRuntime, totalTimeSpent };
    const prev = prevTargetsRef.current;
    const unchanged = prev !== null && (Object.keys(targets) as (keyof StatsCounters)[])
      .every(key => prev[key] === targets[key]);
    if (unchanged) return;
    prevTargetsRef.current = targets;

    const animate = (key: keyof StatsCounters, value: number, speed = 10) => {
      const step = Math.ceil(value / 100);
      intervals[key] = setInterval(() => {
        setCounts(prev => {
          if (prev[key] >= value) { clearInterval(intervals[key]); return { ...prev, [key]: value }; }
          return { ...prev, [key]: Math.min(prev[key] + step, value) };
        });
      }, speed);
    };
    setCounts({ totalMovies: 0, avgRuntime: 0, longestRuntime: 0, shortestRuntime: 0, totalTimeSpent: 0 });
    Object.values(intervals).forEach(clearInterval);
    if (totalMovies     > 0) animate('totalMovies', totalMovies);
    if (avgRuntime      > 0) animate('avgRuntime', Math.round(avgRuntime), 20);
    if (longestRuntime  > 0) animate('longestRuntime', longestRuntime);
    if (shortestRuntime > 0) animate('shortestRuntime', shortestRuntime);
    if (totalTimeSpent  > 0) animate('totalTimeSpent', Math.round(totalTimeSpent));
    return () => {
      Object.values(intervals).forEach(clearInterval);
      prevTargetsRef.current = null;
    };
  }, [totalMovies, avgRuntime, longestRuntime, shortestRuntime, totalTimeSpent]);

  const drillDown = useDrillDown();

  const { languageBarData, languageCodes } = useMemo(() => {
    const g = topNWithOther(groupByField(movies, 'Language'));
    const codes = Object.keys(g);
    const labels = codes.map((c) => (isDrillableLabel(c) ? getLanguageName(c) : c));
    const data: ChartData<'bar'> = { labels, datasets: [{ label: 'Movies', data: Object.values(g), backgroundColor: CHART_PALETTE }] };
    return { languageBarData: data, languageCodes: codes };
  }, [movies]);

  // Every year from the earliest to the latest dated release, 0 for gap years; undated movies are
  // left off (they still count in Total Movies). Zero years aren't drill-down targets.
  const { yearLineData, yearLabels, yearCounts } = useMemo(() => {
    const years = continuousYears(earliest, latest);
    const labels = years.map(String);
    const counts = years.map((y) => byYear.get(y) ?? 0);
    const data: ChartData<'line'> = {
      labels,
      datasets: [{
        label: 'Movies Released',
        data: counts,
        borderColor: CHART_PRIMARY,
        backgroundColor: withAlpha(CHART_PRIMARY, 0.15),
        fill: true,
      }],
    };
    return { yearLineData: data, yearLabels: labels, yearCounts: counts };
  }, [byYear, earliest, latest]);

  // Plain functions: the chart wrappers read callbacks at event time and only call onElementClick
  // for elements isClickable accepts, so neither identity nor a second guard is needed.
  const handleLanguageClick = (index: number) => {
    const code = drillableLabelAt(languageCodes, index);
    if (code) drillDown({ languages: [code] });
  };
  const isLanguageClickable = (index: number) => drillableLabelAt(languageCodes, index) !== null;

  const isYearClickable = (index: number) => (yearCounts[index] ?? 0) > 0;
  const handleYearClick = (index: number) => {
    const year = parseInt(yearLabels[index], 10);
    drillDown({ yearRange: [year, year] });
  };

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <MetricGroupCard
            title="Movies"
            accentColor="#818cf8"
            isDark={isDark}
            colSpan={24}
            metrics={[
              { key: 'total', label: 'Total Movies', value: counts.totalMovies, color: '#818cf8' },
              { key: 'earliest', label: 'Earliest Release', value: earliest, color: '#34d399', noGrouping: true },
              { key: 'latest', label: 'Latest Release', value: latest, color: '#f472b6', noGrouping: true },
            ]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricGroupCard
            title="Runtime"
            accentColor="#a78bfa"
            isDark={isDark}
            colSpan={24}
            metrics={[
              { key: 'avg', label: 'Average Runtime', value: Math.round(counts.avgRuntime), suffix: 'mins', color: '#a78bfa' },
              { key: 'longest', label: 'Longest Runtime', value: counts.longestRuntime, suffix: 'mins', color: '#34d399' },
              { key: 'shortest', label: 'Shortest Runtime', value: counts.shortestRuntime, suffix: 'mins', color: '#f472b6' },
            ]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricGroupCard
            title="Watch Time"
            accentColor="#fb923c"
            isDark={isDark}
            metrics={[
              { key: 'mins', label: 'Total Time Spent', value: Math.round(counts.totalTimeSpent), suffix: 'mins', color: '#fb923c' },
              { key: 'hrs', label: 'Hours Watched', value: Math.round((counts.totalTimeSpent / 60) * 10) / 10, suffix: 'hrs', color: '#38bdf8' },
              { key: 'days', label: 'Days Watched', value: Math.round((counts.totalTimeSpent / 1440) * 10) / 10, suffix: 'days', color: '#fbbf24' },
              { key: 'yrs', label: 'Years Watched', value: Math.round((counts.totalTimeSpent / 525600) * 10) / 10, suffix: 'yrs', color: '#e879f9' },
            ]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricGroupCard
            title="Catalogue"
            accentColor="#22d3ee"
            isDark={isDark}
            colSpan={24}
            metrics={[
              { key: 'languages', label: 'Languages', value: catalogueCounts.languages, color: '#22d3ee' },
              { key: 'genres', label: 'Genres', value: catalogueCounts.genres, color: '#a3e635' },
              { key: 'directors', label: 'Directors', value: catalogueCounts.directors, color: '#f87171' },
            ]}
          />
        </Col>
      </Row>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <ChartBlock title="Movies by Language" height={360} isDark={isDark}><BarChart data={languageBarData} isDark={isDark} onElementClick={handleLanguageClick} isClickable={isLanguageClickable} /></ChartBlock>
        </Col>
        <Col xs={24} lg={12}>
          <ChartBlock title="Movies Released per Year" height={360} isDark={isDark}><LineChart data={yearLineData} isDark={isDark} onElementClick={handleYearClick} isClickable={isYearClickable} /></ChartBlock>
        </Col>
      </Row>
    </>
  );
};

export default OverviewTab;
