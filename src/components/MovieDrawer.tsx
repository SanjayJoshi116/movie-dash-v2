import React from 'react';
import { Drawer, Descriptions, Tag, Typography } from 'antd';
import type { Movie } from '../types/movie';
import { getLanguageName } from '../utils/languages';

const { Title } = Typography;

interface MovieDrawerProps {
  movie: Movie | null;
  onClose: () => void;
}

const MovieDrawer: React.FC<MovieDrawerProps> = ({ movie, onClose }) => {
  return (
    <Drawer
      title={
        <Title level={5} style={{ margin: 0, color: '#fff' }}>
          🎬 {movie?.Name ?? ''}
        </Title>
      }
      placement="right"
      width={480}
      open={movie !== null}
      onClose={onClose}
      styles={{
        header: {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        },
        body: {
          background: 'rgba(13, 13, 26, 0.85)',
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
          labelStyle={{ color: 'rgba(255,255,255,0.6)', width: 160, background: 'rgba(255,255,255,0.04)' }}
          contentStyle={{ color: '#fff', background: 'rgba(255,255,255,0.02)' }}
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
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
};

export default MovieDrawer;
