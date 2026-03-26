import React, { useMemo, useState } from 'react';
import { Select, Typography } from 'antd';
import type { Movie } from '../types/movie';

const { Text } = Typography;

type Metric = 'highest_rated' | 'longest_runtime' | 'most_recent' | 'oldest';

interface TopNExplorerProps {
  movies: Movie[];
}

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'highest_rated',   label: 'Highest Rated' },
  { value: 'longest_runtime', label: 'Longest Runtime' },
  { value: 'most_recent',     label: 'Most Recent' },
  { value: 'oldest',          label: 'Oldest' },
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
  }
}

const RANK_COLORS = ['#e879f9', '#818cf8', '#38bdf8', '#34d399', '#fbbf24'];

const TopNExplorer: React.FC<TopNExplorerProps> = ({ movies }) => {
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Sort by:</Text>
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
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${isTop3 ? rankColor + '40' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isTop3 ? rankColor + '22' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${isTop3 ? rankColor : 'rgba(255,255,255,0.12)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: isTop3 ? 15 : 13,
                  color: isTop3 ? rankColor : 'rgba(255,255,255,0.5)',
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: '#fff',
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
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                  {movie.Director} · {movie.Genres}
                </Text>
              </div>

              <div
                style={{
                  color: rankColor,
                  fontWeight: 700,
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
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
