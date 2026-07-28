import React, { useState } from 'react';
import { Modal, Input, Button, Space, List, Alert, Avatar, Tag, Typography } from 'antd';
import { SearchOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useMovies } from '../hooks/useMovies';
import { getLanguageName } from '../utils/languages';
import { POSTER_FALLBACK } from '../utils/poster';

const { Text } = Typography;

interface TmdbSearchResult {
  id: number;
  title: string;
  year: string;
  language: string;
  posterUrl: string;
  alreadyImported: boolean;
}

interface AddMovieModalProps {
  open: boolean;
  onClose: () => void;
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? 'Request failed';
  }
  return 'Request failed';
}

const AddMovieModal: React.FC<AddMovieModalProps> = ({ open, onClose }) => {
  const { refetch } = useMovies();
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [importingId, setImportingId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query.trim() && !actor.trim()) {
      setError('Enter a movie name or actor name');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await axios.get<{ results: TmdbSearchResult[] }>('/api/tmdb/search', {
        params: { query: query.trim(), actor: actor.trim() },
      });
      setResults(res.data.results);
    } catch (err) {
      setError(extractErrorMessage(err));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (movieId: number) => {
    setImportingId(movieId);
    setError(null);
    try {
      await axios.post('/api/tmdb/import', { movieId });
      setResults((prev) => prev.map((r) => (r.id === movieId ? { ...r, alreadyImported: true } : r)));
      refetch();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setImportingId(null);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title="Add Movie from TMDB"
      open={open}
      onCancel={handleClose}
      footer={<Button onClick={handleClose}>Close</Button>}
      width={640}
      destroyOnClose={false}
    >
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Input
          placeholder="Movie name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
        />
        <Input
          placeholder="Actor (optional)"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
          style={{ maxWidth: 200 }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={searching}>
          Search
        </Button>
      </Space.Compact>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginBottom: 12 }} />}

      <List
        loading={searching}
        dataSource={results}
        locale={{ emptyText: 'No results yet — search above' }}
        style={{ maxHeight: 440, overflowY: 'auto' }}
        renderItem={(item) => (
          <List.Item
            actions={[
              item.alreadyImported ? (
                <Tag icon={<CheckOutlined />} color="success" key="added">Added</Tag>
              ) : (
                <Button
                  key="import"
                  size="small"
                  icon={<PlusOutlined />}
                  loading={importingId === item.id}
                  onClick={() => handleImport(item.id)}
                >
                  Import
                </Button>
              ),
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar shape="square" size={48} src={item.posterUrl || POSTER_FALLBACK} />}
              title={<span style={{ color: 'var(--text-primary)' }}>{item.title}</span>}
              description={
                <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {item.year || 'Unknown year'} · {getLanguageName(item.language) || 'Unknown language'}
                </Text>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default AddMovieModal;
