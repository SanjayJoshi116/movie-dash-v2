import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Row, Col, Typography, Spin, Alert, Tabs, Card } from 'antd';
import { Chart as ChartJS, registerables } from 'chart.js';
import type { ChartData } from 'chart.js';
import { motion } from 'framer-motion';
import { useMovies } from '../hooks/useMovies';
import BarChart from '../components/Charts/BarChart';
import LineChart from '../components/Charts/LineChart';
import HorizontalBarChart from '../components/Charts/HorizontalBarChart';
import DoughnutChart from '../components/Charts/DoughnutChart';
import RadarChart from '../components/Charts/RadarChart';
import PolarAreaChart from '../components/Charts/PolarAreaChart';
import StatCard from '../components/StatCard';
import type { Movie, StatsCounters } from '../types/movie';

ChartJS.register(...registerables);

const { Title } = Typography;
const MotionCard = motion(Card);

// ── Color palettes ───────────────────────────────────────────────────────────
const PALETTE = [
  '#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fb923c',
  '#fbbf24', '#a3e635', '#e879f9', '#22d3ee', '#f87171',
  '#4ade80', '#facc15', '#60a5fa', '#c084fc', '#fb7185',
];
const CHART_CARD: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2d3748 0%, #1e293b 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function groupByField(movies: Movie[], field: keyof Movie): Record<string, number> {
  return movies.reduce<Record<string, number>>((acc, m) => {
    const k = m[field] ?? 'Unknown';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function withOther(data: Record<string, number>, threshold: number): Record<string, number> {
  const result: Record<string, number> = { Other: 0 };
  for (const [k, v] of Object.entries(data)) {
    if (v < threshold) result.Other += v;
    else result[k] = v;
  }
  if (result.Other === 0) delete result.Other;
  return result;
}

function makeDoughnut(data: Record<string, number>, label: string): ChartData<'doughnut'> {
  return { labels: Object.keys(data), datasets: [{ label, data: Object.values(data), backgroundColor: PALETTE, hoverBackgroundColor: PALETTE }] };
}

function makePolar(data: Record<string, number>, label: string): ChartData<'polarArea'> {
  return { labels: Object.keys(data), datasets: [{ label, data: Object.values(data), backgroundColor: PALETTE.map(c => c + 'cc'), borderColor: PALETTE, borderWidth: 1 }] };
}

// ── Shared chart block wrapper ────────────────────────────────────────────────
const ChartBlock: React.FC<{ title: string; height?: number; children: React.ReactNode }> = ({ title, height = 400, children }) => (
  <div style={{ ...CHART_CARD, padding: 24, marginBottom: 24 }}>
    <Title level={5} style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>{title}</Title>
    <div style={{ height }}>{children}</div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const Stats: React.FC = () => {
  const { movies, loading, error } = useMovies();
  const [counts, setCounts] = useState<StatsCounters>({
    totalMovies: 0, avgRuntime: 0, longestRuntime: 0, shortestRuntime: 0, totalTimeSpent: 0,
  });
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ── Numeric stats ─────────────────────────────────────────────────────────
  const validRuntimes   = useMemo(() => movies.map(m => parseFloat(m.Runtime)).filter(r => !isNaN(r) && r > 0), [movies]);
  const totalMovies     = useMemo(() => movies.length, [movies]);
  const avgRuntime      = useMemo(() => validRuntimes.length ? validRuntimes.reduce((a, b) => a + b, 0) / validRuntimes.length : 0, [validRuntimes]);
  const longestRuntime  = useMemo(() => validRuntimes.length ? Math.max(...validRuntimes) : 0, [validRuntimes]);
  const shortestRuntime = useMemo(() => validRuntimes.length ? Math.min(...validRuntimes) : 0, [validRuntimes]);
  const totalTimeSpent  = useMemo(() => validRuntimes.reduce((a, b) => a + b, 0), [validRuntimes]);

  // ── Animated counters ─────────────────────────────────────────────────────
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
    if (totalMovies    > 0) animate('totalMovies', totalMovies);
    if (avgRuntime     > 0) animate('avgRuntime', Math.round(avgRuntime), 20);
    if (longestRuntime > 0) animate('longestRuntime', longestRuntime);
    if (shortestRuntime > 0) animate('shortestRuntime', shortestRuntime);
    if (totalTimeSpent > 0) animate('totalTimeSpent', Math.round(totalTimeSpent));
    return () => { Object.values(intervalsRef.current).forEach(clearInterval); };
  }, [totalMovies, avgRuntime, longestRuntime, shortestRuntime, totalTimeSpent]);

  // ── Tab 1: Overview ───────────────────────────────────────────────────────
  const languageBarData = useMemo<ChartData<'bar'>>(() => {
    const g = groupByField(movies, 'Language');
    return { labels: Object.keys(g), datasets: [{ label: 'Movies', data: Object.values(g), backgroundColor: PALETTE, hoverBackgroundColor: PALETTE }] };
  }, [movies]);

  const yearLineData = useMemo<ChartData<'line'>>(() => {
    const g = groupByField(movies, 'Release Year');
    const sorted = Object.entries(g).sort(([a], [b]) => parseInt(a) - parseInt(b));
    return {
      labels: sorted.map(([y]) => y),
      datasets: [{
        label: 'Movies Released',
        data: sorted.map(([, c]) => c),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56,189,248,0.15)',
        fill: true,
      }],
    };
  }, [movies]);

  // ── Tab 2: People ─────────────────────────────────────────────────────────
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

  const companyDoughnutData = useMemo(() => makeDoughnut(withOther(groupByField(movies, 'Production Company'), 10), 'Movies by Company'), [movies]);

  // ── Tab 3: Ratings ────────────────────────────────────────────────────────
  const voteDistData = useMemo<ChartData<'bar'>>(() => {
    const buckets: Record<string, number> = {};
    for (let i = 0; i < 10; i++) buckets[`${i}–${i + 1}`] = 0;
    movies.forEach(m => {
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(v)) { const idx = Math.min(Math.floor(v), 9); buckets[`${idx}–${idx + 1}`] += 1; }
    });
    return { labels: Object.keys(buckets), datasets: [{ label: 'Movies', data: Object.values(buckets), backgroundColor: '#38bdf8', hoverBackgroundColor: '#0ea5e9' }] };
  }, [movies]);

  const avgVoteByGenreData = useMemo<ChartData<'bar'>>(() => {
    const sums: Record<string, { sum: number; count: number }> = {};
    movies.forEach(m => {
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(v) && m.Genres) {
        if (!sums[m.Genres]) sums[m.Genres] = { sum: 0, count: 0 };
        sums[m.Genres].sum += v;
        sums[m.Genres].count += 1;
      }
    });
    const top = Object.entries(sums).map(([g, { sum, count }]) => [g, sum / count] as [string, number]).sort(([, a], [, b]) => b - a).slice(0, 15);
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
    // Top 8 languages by movie count
    const langCounts = groupByField(movies, 'Language');
    const top8 = Object.entries(langCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([l]) => l);
    const avgs = top8.map(l => sums[l] ? parseFloat((sums[l].sum / sums[l].count).toFixed(2)) : 0);
    return {
      labels: top8,
      datasets: [{
        label: 'Avg Vote Average',
        data: avgs,
        backgroundColor: 'rgba(56,189,248,0.2)',
        borderColor: '#38bdf8',
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#fff',
      }],
    };
  }, [movies]);

  // ── Tab 4: Runtime & Geography ────────────────────────────────────────────
  const top50RuntimeData = useMemo<ChartData<'bar'>>(() => {
    const top50 = [...movies]
      .filter(m => !isNaN(parseFloat(m.Runtime)) && parseFloat(m.Runtime) > 0)
      .sort((a, b) => parseFloat(b.Runtime) - parseFloat(a.Runtime))
      .slice(0, 50);
    return {
      labels: top50.map(m => m.Name),
      datasets: [{ label: 'Runtime (mins)', data: top50.map(m => parseFloat(m.Runtime)), backgroundColor: '#fb923c', hoverBackgroundColor: '#f97316' }],
    };
  }, [movies]);

  const runtimeBucketVoteData = useMemo<ChartData<'bar'>>(() => {
    const buckets: { label: string; min: number; max: number }[] = [
      { label: '< 60 min',   min: 0,   max: 60  },
      { label: '60–90 min',  min: 60,  max: 90  },
      { label: '90–120 min', min: 90,  max: 120 },
      { label: '120–150 min',min: 120, max: 150 },
      { label: '150–180 min',min: 150, max: 180 },
      { label: '> 180 min',  min: 180, max: Infinity },
    ];
    const sums: Record<string, { sum: number; count: number }> = {};
    buckets.forEach(b => { sums[b.label] = { sum: 0, count: 0 }; });
    movies.forEach(m => {
      const r = parseFloat(m.Runtime);
      const v = parseFloat(m['Vote Average']);
      if (!isNaN(r) && !isNaN(v)) {
        const bucket = buckets.find(b => r >= b.min && r < b.max);
        if (bucket) { sums[bucket.label].sum += v; sums[bucket.label].count += 1; }
      }
    });
    const avgs = buckets.map(b => sums[b.label].count ? parseFloat((sums[b.label].sum / sums[b.label].count).toFixed(2)) : 0);
    return {
      labels: buckets.map(b => b.label),
      datasets: [{ label: 'Avg Vote', data: avgs, backgroundColor: '#fbbf24', hoverBackgroundColor: '#f59e0b' }],
    };
  }, [movies]);

  const countryPolarData  = useMemo(() => makePolar(withOther(groupByField(movies, 'Production Country'), 10), 'Movies by Country'), [movies]);
  const genrePolarData    = useMemo(() => makePolar(withOther(groupByField(movies, 'Genres'), 35), 'Movies by Genre'), [movies]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" /></div>;
  }
  if (error) {
    return <Alert type="error" message="Failed to load movies" description={error} showIcon style={{ margin: 24 }} />;
  }

  const tabItems = [
    {
      key: 'overview',
      label: '📊 Overview',
      children: (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}><StatCard label="Total Movies"     value={counts.totalMovies}     color="#38bdf8" /></Col>
            <Col xs={24} sm={12} md={8}><StatCard label="Average Runtime"  value={counts.avgRuntime}      color="#a78bfa" suffix="mins" /></Col>
            <Col xs={24} sm={12} md={8}><StatCard label="Longest Runtime"  value={counts.longestRuntime}  color="#34d399" suffix="mins" /></Col>
            <Col xs={24} sm={12} md={8}><StatCard label="Shortest Runtime" value={counts.shortestRuntime} color="#f472b6" suffix="mins" /></Col>
            <Col xs={24} sm={12} md={8}><StatCard label="Total Time Spent" value={counts.totalTimeSpent}  color="#fb923c" suffix="mins" /></Col>
          </Row>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <ChartBlock title="Movies by Language" height={360}><BarChart data={languageBarData} /></ChartBlock>
            </Col>
            <Col xs={24} lg={12}>
              <ChartBlock title="Movies Released per Year" height={360}><LineChart data={yearLineData} /></ChartBlock>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'people',
      label: '🎬 People',
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <ChartBlock title="Top 15 Actors & Actresses" height={480}><HorizontalBarChart data={topActorsData} height={480} /></ChartBlock>
          </Col>
          <Col xs={24} lg={12}>
            <ChartBlock title="Top 15 Directors" height={480}><HorizontalBarChart data={topDirectorsData} height={480} /></ChartBlock>
          </Col>
          <Col xs={24} lg={12}>
            <ChartBlock title="Movies by Production Company" height={380}>
              <DoughnutChart data={companyDoughnutData} />
            </ChartBlock>
          </Col>
        </Row>
      ),
    },
    {
      key: 'ratings',
      label: '⭐ Ratings',
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <ChartBlock title="Vote Average Distribution" height={360}><BarChart data={voteDistData} /></ChartBlock>
          </Col>
          <Col xs={24} lg={12}>
            <ChartBlock title="Average Vote by Language (Top 8)" height={360}><RadarChart data={avgVoteByLanguageData} /></ChartBlock>
          </Col>
          <Col xs={24}>
            <ChartBlock title="Average Vote by Genre (Top 15)" height={440}><HorizontalBarChart data={avgVoteByGenreData} height={440} /></ChartBlock>
          </Col>
        </Row>
      ),
    },
    {
      key: 'runtime',
      label: '⏱ Runtime & Geography',
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <ChartBlock title="Movies by Country" height={400}><PolarAreaChart data={countryPolarData} /></ChartBlock>
          </Col>
          <Col xs={24} lg={12}>
            <ChartBlock title="Movies by Genre" height={400}><PolarAreaChart data={genrePolarData} /></ChartBlock>
          </Col>
          <Col xs={24} lg={12}>
            <ChartBlock title="Avg Vote by Runtime Length" height={320}><HorizontalBarChart data={runtimeBucketVoteData} height={320} /></ChartBlock>
          </Col>
          <Col xs={24}>
            <ChartBlock title="Top 50 Longest Films" height={500}><HorizontalBarChart data={top50RuntimeData} height={500} /></ChartBlock>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: 'linear-gradient(120deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh' }}>
      <Title level={3} style={{ color: '#fff', marginBottom: 24 }}>📊 Statistics Dashboard</Title>

      {/* Sample motion doughnut cards preserved for genre/director in old style */}
      <div style={{ display: 'none' }}>
        {[companyDoughnutData].map((d, i) => (
          <MotionCard key={i} whileHover={{ scale: 1.02 }} style={CHART_CARD}><DoughnutChart data={d} /></MotionCard>
        ))}
      </div>

      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        size="large"
        style={{ color: '#fff' }}
      />
    </div>
  );
};

export default Stats;
