import React from 'react';
import { Row, Col, Card, Tag, Empty } from 'antd';
import { motion } from 'framer-motion';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { Movie } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { getCardStyle } from '../utils/chartTheme';
import { useTheme } from '../contexts/ThemeContext';

const MotionCard = motion(Card);

interface MovieCardGridProps {
  movies: Movie[];
  onRowClick: (movie: Movie) => void;
}

const voteColor = (vote: number): string => (vote >= 7 ? 'green' : vote >= 5 ? 'gold' : 'red');

const MovieCardGrid: React.FC<MovieCardGridProps> = ({ movies, onRowClick }) => {
  const { isDark } = useTheme();

  if (movies.length === 0) {
    return (
      <div style={{ padding: '48px 0' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No movies match your filters" />
      </div>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {movies.map((movie) => {
        const genres = movie.Genres.split(',').map(g => g.trim()).filter(Boolean).slice(0, 3);
        const vote = parseFloat(movie['Vote Average']);
        return (
          <Col key={movie['Movie ID']} xs={24} sm={12} md={8} lg={6}>
            <MotionCard
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              hoverable
              onClick={() => onRowClick(movie)}
              style={{ ...getCardStyle(isDark), height: '100%', cursor: 'pointer' }}
              styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', gap: 8 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
                  {movie.Name}
                </span>
                {!isNaN(vote) && vote > 0 && (
                  <Tag color={voteColor(vote)} style={{ flexShrink: 0, margin: 0 }}>
                    ⭐ {vote.toFixed(1)}
                  </Tag>
                )}
              </div>

              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {movie['Release Year']} · {getLanguageName(movie.Language)}
              </span>

              {movie.Director && (
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
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
                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 'auto' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {movie.Runtime} mins
                </span>
              )}
            </MotionCard>
          </Col>
        );
      })}
    </Row>
  );
};

export default MovieCardGrid;
