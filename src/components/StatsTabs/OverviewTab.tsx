import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Row, Col, Typography } from 'antd';
import type { ChartData } from 'chart.js';
import BarChart from '../Charts/BarChart';
import LineChart from '../Charts/LineChart';
import StatCard from '../StatCard';
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

const OverviewTab: React.FC<OverviewTabProps> = ({ movies }) => {
  const { isDark } = useTheme();
  const [counts, setCounts] = useState<StatsCounters>({
    totalMovies: 0, avgRuntime: 0, longestRuntime: 0, shortestRuntime: 0, totalTimeSpent: 0,
  });
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const validRuntimes   = useMemo(() => movies.map(m => parseFloat(m.Runtime)).filter(r => !isNaN(r) && r > 0), [movies]);
  const totalMovies     = useMemo(() => movies.length, [movies]);
  const avgRuntime      = useMemo(() => validRuntimes.length ? validRuntimes.reduce((a, b) => a + b, 0) / validRuntimes.length : 0, [validRuntimes]);
  const longestRuntime  = useMemo(() => validRuntimes.reduce((a, b) => Math.max(a, b), 0), [validRuntimes]);
  const shortestRuntime = useMemo(() => validRuntimes.reduce((a, b) => Math.min(a, b), Infinity) || 0, [validRuntimes]);
  const totalTimeSpent  = useMemo(() => validRuntimes.reduce((a, b) => a + b, 0), [validRuntimes]);

  useEffect(() => {
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
    return () => { Object.values(intervalsRef.current).forEach(clearInterval); };
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
        <Col xs={24} sm={12} md={8}><StatCard label="Total Movies"     value={counts.totalMovies}     color="#818cf8" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Average Runtime"  value={counts.avgRuntime}      color="#a78bfa" suffix="mins" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Longest Runtime"  value={counts.longestRuntime}  color="#34d399" suffix="mins" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Shortest Runtime" value={counts.shortestRuntime} color="#f472b6" suffix="mins" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Total Time Spent" value={counts.totalTimeSpent}  color="#fb923c" suffix="mins" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Hours Watched"    value={Math.round((counts.totalTimeSpent / 60) * 10) / 10}     color="#38bdf8" suffix="hrs"  /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Days Watched"     value={Math.round((counts.totalTimeSpent / 1440) * 10) / 10}   color="#fbbf24" suffix="days" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Years Watched"    value={Math.round((counts.totalTimeSpent / 525600) * 10) / 10} color="#e879f9" suffix="yrs"  /></Col>
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
