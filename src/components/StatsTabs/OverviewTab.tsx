import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Row, Col, Typography } from 'antd';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import LineChart from '../Charts/LineChart';
import { getCardStyle } from '../../utils/chartTheme';
import { groupByField } from '../../utils/statsHelpers';
import { getLanguageName } from '../../utils/languages';
import { useTheme } from '../../contexts/ThemeContext';
import type { Movie, StatsCounters } from '../../types/movie';

const { Title } = Typography;

interface OverviewTabProps { movies: Movie[] }

const ChartBlock: React.FC<{ title: string; height?: number; isDark: boolean; children: React.ReactNode }> = ({ title, height, isDark, children }) => (
  <div style={{ ...getCardStyle(isDark), padding: 24, marginBottom: 24 }}>
    <Title level={5} style={{ color: 'var(--text-primary)', marginBottom: 16 }}>{title}</Title>
    <div style={height !== undefined ? { height } : {}}>{children}</div>
  </div>
);

interface GroupMetric {
  key: string;
  label: string;
  value: number;
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
            {noGrouping ? value : value.toLocaleString()}
            {suffix && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{suffix}</span>}
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

  const yearSpan = useMemo(() => {
    const years = movies.map(m => parseInt(m['Release Year'], 10)).filter(y => !isNaN(y));
    return {
      earliest: years.length ? Math.min(...years) : 0,
      latest: years.length ? Math.max(...years) : 0,
    };
  }, [movies]);

  useEffect(() => {
    const targets: StatsCounters = { totalMovies, avgRuntime, longestRuntime, shortestRuntime, totalTimeSpent };
    const prev = prevTargetsRef.current;
    const unchanged = prev !== null && (Object.keys(targets) as (keyof StatsCounters)[])
      .every(key => prev[key] === targets[key]);
    if (unchanged) return;
    prevTargetsRef.current = targets;

    const animate = (key: keyof StatsCounters, value: number, speed = 10) => {
      const step = Math.ceil(value / 100);
      intervalsRef.current[key] = setInterval(() => {
        setCounts(prev => {
          if (prev[key] >= value) { clearInterval(intervalsRef.current[key]); return { ...prev, [key]: value }; }
          return { ...prev, [key]: Math.min(prev[key] + step, value) };
        });
      }, speed);
    };
    setCounts({ totalMovies: 0, avgRuntime: 0, longestRuntime: 0, shortestRuntime: 0, totalTimeSpent: 0 });
    Object.values(intervalsRef.current).forEach(clearInterval);
    if (totalMovies     > 0) animate('totalMovies', totalMovies);
    if (avgRuntime      > 0) animate('avgRuntime', Math.round(avgRuntime), 20);
    if (longestRuntime  > 0) animate('longestRuntime', longestRuntime);
    if (shortestRuntime > 0) animate('shortestRuntime', shortestRuntime);
    if (totalTimeSpent  > 0) animate('totalTimeSpent', Math.round(totalTimeSpent));
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      prevTargetsRef.current = null;
    };
  }, [totalMovies, avgRuntime, longestRuntime, shortestRuntime, totalTimeSpent]);

  const languageBarData = useMemo<ChartData<'bar'>>(() => {
    const g = groupByField(movies, 'Language');
    const palette = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fb923c', '#fbbf24', '#a3e635', '#e879f9', '#22d3ee', '#f87171', '#4ade80', '#facc15', '#60a5fa', '#c084fc', '#fb7185'];
    return { labels: Object.keys(g).map(getLanguageName), datasets: [{ label: 'Movies', data: Object.values(g), backgroundColor: palette, hoverBackgroundColor: palette }] };
  }, [movies]);

  const yearLineData = useMemo<ChartData<'line'>>(() => {
    const g = groupByField(movies, 'Release Year');
    const sorted = Object.entries(g).sort(([a], [b]) => parseInt(a) - parseInt(b));
    return {
      labels: sorted.map(([y]) => y),
      datasets: [{
        label: 'Movies Released',
        data: sorted.map(([, c]) => c),
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129,140,248,0.15)',
        fill: true,
      }],
    };
  }, [movies]);

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
              { key: 'earliest', label: 'Earliest Release', value: yearSpan.earliest, color: '#34d399', noGrouping: true },
              { key: 'latest', label: 'Latest Release', value: yearSpan.latest, color: '#f472b6', noGrouping: true },
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
          <ChartBlock title="Movies by Language" height={360} isDark={isDark}><BarChart data={languageBarData} isDark={isDark} /></ChartBlock>
        </Col>
        <Col xs={24} lg={12}>
          <ChartBlock title="Movies Released per Year" height={360} isDark={isDark}><LineChart data={yearLineData} isDark={isDark} /></ChartBlock>
        </Col>
      </Row>
    </>
  );
};

export default OverviewTab;
