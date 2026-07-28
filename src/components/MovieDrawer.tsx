import React, { useState } from 'react';
import { Drawer, Descriptions, Tag, Typography, Grid, Image, Button, Popconfirm, Alert } from 'antd';
import { FireOutlined, LikeOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { Movie } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { formatDateDDMMYYYY } from '../utils/formatDate';
import { POSTER_FALLBACK } from '../utils/poster';
import { useTheme } from '../contexts/ThemeContext';
import { useMovies } from '../hooks/useMovies';

const { Title } = Typography;

interface MovieDrawerProps {
  movie: Movie | null;
  onClose: () => void;
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? 'Delete failed';
  }
  return 'Delete failed';
}

const MovieDrawer: React.FC<MovieDrawerProps> = ({ movie, onClose }) => {
  const { isDark } = useTheme();
  const screens = Grid.useBreakpoint();
  const { refetch } = useMovies();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lastMovieId, setLastMovieId] = useState<string | null>(null);

  const currentId = movie?.['Movie ID'] ?? null;
  if (currentId !== lastMovieId) {
    setLastMovieId(currentId);
    if (deleteError) setDeleteError(null);
  }

  const handleDelete = async () => {
    if (!movie) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await axios.delete(`/api/movies/${movie['Movie ID']}`);
      refetch();
      onClose();
    } catch (err) {
      setDeleteError(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const headerBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)';
  const bodyBg = isDark ? 'rgba(13,13,26,0.85)' : 'rgba(245,247,255,0.92)';
  const labelStyle = {
    color: 'var(--text-secondary)',
    width: 140,
    padding: '6px 10px',
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(129,140,248,0.04)',
  };
  const contentStyle = {
    color: 'var(--text-primary)',
    padding: '6px 10px',
    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
  };

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
      width={screens.sm ? 480 : '100%'}
      open={movie !== null}
      onClose={onClose}
      footer={
        movie && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Popconfirm
              title="Delete this movie?"
              description="Removes it from src/movies.csv. This can't be undone."
              okText="Delete"
              okType="danger"
              onConfirm={handleDelete}
            >
              <Button danger icon={<DeleteOutlined />} loading={deleting}>
                Delete
              </Button>
            </Popconfirm>
          </div>
        )
      }
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
          padding: 16,
        },
        mask: { backdropFilter: 'blur(4px)' },
      }}
    >
      {movie && (
        <>
        {deleteError && (
          <Alert
            type="error"
            message={deleteError}
            showIcon
            closable
            onClose={() => setDeleteError(null)}
            style={{ marginBottom: 16 }}
          />
        )}
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <Image
            src={movie['Poster URL'] || POSTER_FALLBACK}
            alt={`${movie.Name} poster`}
            width={90}
            height={135}
            style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            fallback={POSTER_FALLBACK}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', minWidth: 0 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginRight: 6 }}>Language</span>
              <Tag color="blue">{getLanguageName(movie.Language)}</Tag>
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginRight: 6 }}>Runtime</span>
              {movie.Runtime} mins
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginRight: 6 }}>Release</span>
              {formatDateDDMMYYYY(movie['Release Date'])} ({movie['Release Year']})
            </div>
          </div>
        </div>
        <Descriptions
          column={1}
          bordered
          size="small"
          labelStyle={labelStyle}
          contentStyle={contentStyle}
        >
          <Descriptions.Item label="Movie ID">{movie['Movie ID']}</Descriptions.Item>
          <Descriptions.Item label="Genres">
            {movie.Genres.split(',').map(g => g.trim()).filter(Boolean).map((g) => (
              <Tag key={g} color="purple" style={{ marginBottom: 4 }}>
                {g}
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
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
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
        </>
      )}
    </Drawer>
  );
};

export default MovieDrawer;
