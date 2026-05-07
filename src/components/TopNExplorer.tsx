import React, { useMemo, useState } from 'react';
import { Select, Typography } from 'antd';
import type { Movie } from '../types/movie';

const { Text } = Typography;

type Metric = 'highest_rated' | 'longest_runtime' | 'most_recent' | 'oldest' | 'most_popular';

interface TopNExplorerProps {
  movies: Movie[];
  isDark?: boolean;
}

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'highest_rated',   label: 'Highest Rated' },
  { value: 'longest_runtime', label: 'Longest Runtime' },
  { value: 'most_recent',     label: 'Most Recent' },
  { value: 'oldest',          label: 'Oldest' },
  { value: 'most_popular',    label: 'Most Popular' },
];

function getMetricValue(movie: Movie, metric: Metric): { raw: number; display: string } {
  switch (metric) {
    case 'highest_rated':
      return { raw: parseFloat(movie['Vote Average']) || 0, display: `${movie['Vote Average']} / 10` };
    case 'longest_runtime':
      return { raw: parseFloat(movie.Runtime) || 0, display: `${movie.Runtime} mins` };
    case 'most_recent': {
      const d = new Date(movie['Release Date']);
      if (isNaN(d.getTime())) return { raw: -Infinity, display: movie['Release Date'] || movie['Release Year'] };
      const diff = Math.abs(Date.now() - d.getTime());
      return { raw: -diff, display: movie['Release Date'] };
    }
    case 'oldest':
      return { raw: -(parseInt(movie['Release Year'], 10) || 9999), display: movie['Release Year'] };
    case 'most_popular': {
      const p = parseFloat(movie['Popularity Score']) || 0;
      return { raw: p, display: p.toFixed(1) };
    }
  }
}

const RANK_COLORS = ['#e879f9', '#818cf8', '#38bdf8', '#34d399', '#fbbf24'];

const TopNExplorer: React.FC<TopNExplorerProps> = ({ movies, isDark = true }) => {
  const [metric, setMetric] = useState<Metric>('highest_rated');

  const topMovies = useMemo(() => {
    return [...movies]
      .filter(m => {
        const v = getMetricValue(m, metric).raw;
        return !isNaN(v) && v !== 0 && isFinite(v);
      })
      .sort((a, b) => getMetricValue(b, metric).raw - getMetricValue(a, metric).raw)
      .slice(0, 10);
  }, [movies, metric]);

  const textPrimary = isDark ? '#fff' : '#1e1e3f';
  const textSecondary = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,63,0.6)';
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(30,30,63,0.45)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(129,140,248,0.05)';
  const rankBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(129,140,248,0.08)';
  const borderDefault = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(129,140,248,0.15)';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Text style={{ color: textSecondary, fontSize: 14 }}>Sort by:</Text>
        <Select
          value={metric}
          onChange={setMetric}
          options={METRIC_OPTIONS}
          style={{ width: 200 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {topMovies.map((movie, index) => {
          const { display } = getMetricValue(movie, metric);
          const rankColor = RANK_COLORS[index] ?? 'rgba(255,255,255,0.3)';
          const isTop3 = index < 3;

          return (
            <div
              key={movie['Movie ID']}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 20px',
                background: rowBg,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${isTop3 ? rankColor + '40' : borderDefault}`,
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isTop3 ? rankColor + '22' : rankBg,
                  border: `2px solid ${isTop3 ? rankColor : borderDefault}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: isTop3 ? 15 : 13,
                  color: isTop3 ? rankColor : textMuted,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: textPrimary,
                    fontSize: 14,
                    fontWeight: isTop3 ? 600 : 400,
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {movie.Name}
                </Text>
                <Text style={{ color: textMuted, fontSize: 12 }}>
                  {movie.Director} · {movie.Genres}
                </Text>
              </div>

              <div style={{ color: rankColor, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {display}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopNExplorer;
