import React from 'react';
import { Drawer, Descriptions, Tag, Typography } from 'antd';
import { FireOutlined, LikeOutlined } from '@ant-design/icons';
import type { Movie } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { useTheme } from '../contexts/ThemeContext';

const { Title } = Typography;

interface MovieDrawerProps {
  movie: Movie | null;
  onClose: () => void;
}

const MovieDrawer: React.FC<MovieDrawerProps> = ({ movie, onClose }) => {
  const { isDark } = useTheme();

  const headerBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)';
  const bodyBg = isDark ? 'rgba(13,13,26,0.85)' : 'rgba(245,247,255,0.92)';
  const labelStyle = isDark
    ? { color: 'rgba(255,255,255,0.6)', width: 160, background: 'rgba(255,255,255,0.04)' }
    : { color: 'rgba(30,30,63,0.6)', width: 160, background: 'rgba(129,140,248,0.04)' };
  const contentStyle = isDark
    ? { color: '#fff', background: 'rgba(255,255,255,0.02)' }
    : { color: '#1e1e3f', background: 'rgba(255,255,255,0.6)' };

  const voteCount = movie?.['Vote Count'];
  const popularity = movie?.['Popularity Score'];

  return (
    <Drawer
      title={
        <Title level={5} style={{ margin: 0, color: isDark ? '#fff' : '#1e1e3f' }}>
          🎬 {movie?.Name ?? ''}
        </Title>
      }
      placement="right"
      width={480}
      open={movie !== null}
      onClose={onClose}
      styles={{
        header: {
          background: headerBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--glass-border)',
        },
        body: {
          background: bodyBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: 24,
        },
        mask: { backdropFilter: 'blur(4px)' },
      }}
    >
      {movie && (
        <Descriptions
          column={1}
          bordered
          size="small"
          labelStyle={labelStyle}
          contentStyle={contentStyle}
        >
          <Descriptions.Item label="Movie ID">{movie['Movie ID']}</Descriptions.Item>
          <Descriptions.Item label="Language">
            <Tag color="blue">{getLanguageName(movie.Language)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Runtime">{movie.Runtime} mins</Descriptions.Item>
          <Descriptions.Item label="Release Year">{movie['Release Year']}</Descriptions.Item>
          <Descriptions.Item label="Release Date">{movie['Release Date']}</Descriptions.Item>
          <Descriptions.Item label="Genres">
            {movie.Genres.split(',').map((g) => (
              <Tag key={g.trim()} color="purple" style={{ marginBottom: 4 }}>
                {g.trim()}
              </Tag>
            ))}
          </Descriptions.Item>
          <Descriptions.Item label="Director">{movie.Director}</Descriptions.Item>
          <Descriptions.Item label="Actors/Actresses">{movie['Actors/Actresses']}</Descriptions.Item>
          <Descriptions.Item label="Production Company">{movie['Production Company']}</Descriptions.Item>
          <Descriptions.Item label="Country">{movie['Production Country']}</Descriptions.Item>
          <Descriptions.Item label="Vote Average">
            <Tag color={parseFloat(movie['Vote Average']) >= 7 ? 'green' : parseFloat(movie['Vote Average']) >= 5 ? 'gold' : 'red'}>
              ⭐ {movie['Vote Average']}
            </Tag>
            {voteCount && voteCount !== '0' && (
              <span style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(30,30,63,0.5)', fontSize: 12, marginLeft: 8 }}>
                <LikeOutlined style={{ marginRight: 3 }} />
                {parseInt(voteCount).toLocaleString()} votes
              </span>
            )}
          </Descriptions.Item>
          {popularity && popularity !== '0' && (
            <Descriptions.Item label="Popularity">
              <span style={{ color: '#fb923c', fontWeight: 600 }}>
                <FireOutlined style={{ marginRight: 4 }} />
                {parseFloat(popularity).toFixed(1)}
              </span>
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Drawer>
  );
};

export default MovieDrawer;
