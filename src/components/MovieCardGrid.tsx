import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Tag, Empty, Pagination, Grid, Select } from 'antd';
import { motion } from 'framer-motion';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { Movie } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { getCardStyle } from '../utils/chartTheme';
import { POSTER_FALLBACK } from '../utils/poster';
import { useTheme } from '../contexts/ThemeContext';

const MotionCard = motion(Card);

interface MovieCardGridProps {
  movies: Movie[];
  onRowClick: (movie: Movie) => void;
}

const voteColor = (vote: number): string => (vote >= 7 ? 'green' : vote >= 5 ? 'gold' : 'red');

type SortKey = 'default' | 'name-asc' | 'name-desc' | 'year-desc' | 'year-asc' | 'vote-desc' | 'vote-asc' | 'runtime-desc' | 'runtime-asc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default order' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'year-desc', label: 'Year (Newest)' },
  { value: 'year-asc', label: 'Year (Oldest)' },
  { value: 'vote-desc', label: 'Rating (High–Low)' },
  { value: 'vote-asc', label: 'Rating (Low–High)' },
  { value: 'runtime-desc', label: 'Runtime (Long–Short)' },
  { value: 'runtime-asc', label: 'Runtime (Short–Long)' },
];

const sortMovies = (movies: Movie[], sortKey: SortKey): Movie[] => {
  if (sortKey === 'default') return movies;
  const sorted = [...movies];
  switch (sortKey) {
    case 'name-asc': return sorted.sort((a, b) => a.Name.localeCompare(b.Name));
    case 'name-desc': return sorted.sort((a, b) => b.Name.localeCompare(a.Name));
    case 'year-desc': return sorted.sort((a, b) => (parseInt(b['Release Year'], 10) || 0) - (parseInt(a['Release Year'], 10) || 0));
    case 'year-asc': return sorted.sort((a, b) => (parseInt(a['Release Year'], 10) || 0) - (parseInt(b['Release Year'], 10) || 0));
    case 'vote-desc': return sorted.sort((a, b) => (parseFloat(b['Vote Average']) || 0) - (parseFloat(a['Vote Average']) || 0));
    case 'vote-asc': return sorted.sort((a, b) => (parseFloat(a['Vote Average']) || 0) - (parseFloat(b['Vote Average']) || 0));
    case 'runtime-desc': return sorted.sort((a, b) => (parseFloat(b.Runtime) || 0) - (parseFloat(a.Runtime) || 0));
    case 'runtime-asc': return sorted.sort((a, b) => (parseFloat(a.Runtime) || 0) - (parseFloat(b.Runtime) || 0));
    default: return sorted;
  }
};

const MovieCardGrid: React.FC<MovieCardGridProps> = ({ movies, onRowClick }) => {
  const { isDark } = useTheme();
  const screens = Grid.useBreakpoint();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortKey, setSortKey] = useState<SortKey>('default');

  const sortedMovies = useMemo(() => sortMovies(movies, sortKey), [movies, sortKey]);

  if (movies.length === 0) {
    return (
      <div style={{ padding: '48px 0' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No movies match your filters" />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(sortedMovies.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageMovies = sortedMovies.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <Select<SortKey>
        value={sortKey}
        onChange={(val) => { setSortKey(val); setPage(1); }}
        options={SORT_OPTIONS}
        style={{ width: 200 }}
        aria-label="Sort"
      />
    </div>
    <Row gutter={[16, 16]}>
      {pageMovies.map((movie) => {
        const genres = movie.Genres.split(',').map(g => g.trim()).filter(Boolean).slice(0, 3);
        const vote = parseFloat(movie['Vote Average']);
        return (
          <Col key={movie['Movie ID']} xs={24} sm={12} md={8} lg={6} xl={4}>
            <MotionCard
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              hoverable
              onClick={() => onRowClick(movie)}
              role="button"
              tabIndex={0}
              aria-label={`View details for ${movie.Name}`}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(movie);
                }
              }}
              style={{ ...getCardStyle(isDark), height: '100%', cursor: 'pointer' }}
              styles={{ body: { padding: 12, display: 'flex', flexDirection: 'column', gap: 6 } }}
              cover={
                <img
                  src={movie['Poster URL'] || POSTER_FALLBACK}
                  alt={`${movie.Name} poster`}
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = POSTER_FALLBACK; }}
                  style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                />
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                  {movie.Name}
                </span>
                {!isNaN(vote) && vote > 0 && (
                  <Tag color={voteColor(vote)} style={{ flexShrink: 0, margin: 0 }}>
                    ⭐ {vote.toFixed(1)}
                  </Tag>
                )}
              </div>

              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                {movie['Release Year']} · {getLanguageName(movie.Language)}
              </span>

              {movie.Director && (
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Dir. {movie.Director}
                </span>
              )}

              {genres.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {genres.map((g) => (
                    <Tag key={g} color="purple" style={{ margin: 0 }}>{g}</Tag>
                  ))}
                </div>
              )}

              {movie.Runtime && (
                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 'auto' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {movie.Runtime} mins
                </span>
              )}
            </MotionCard>
          </Col>
        );
      })}
    </Row>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
      <Pagination
        current={safePage}
        pageSize={pageSize}
        total={movies.length}
        showSizeChanger={screens.sm}
        pageSizeOptions={['12', '24', '48', '96']}
        showTotal={screens.sm ? (total, range) => `${range[0]}–${range[1]} of ${total} movies` : undefined}
        simple={!screens.sm}
        onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
      />
    </div>
    </>
  );
};

export default MovieCardGrid;
