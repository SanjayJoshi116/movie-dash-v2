import React, { useMemo, useRef, useState } from 'react';
import { Modal, Input, Button, Space, List, Alert, Avatar, Tag, Typography } from 'antd';
import { SearchOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useMovies } from '../hooks/useMovies';
import { getLanguageName } from '../utils/languages';
import { POSTER_FALLBACK } from '../utils/poster';
import { hasStatus, serverErrorMessage } from '../utils/httpError';

const { Text } = Typography;

interface TmdbSearchResult {
  id: number;
  title: string;
  year: string;
  language: string;
  posterUrl: string;
}

interface AddMovieModalProps {
  open: boolean;
  onClose: () => void;
}

const requestError = (err: unknown) => serverErrorMessage(err) ?? 'Request failed';

const AddMovieModal: React.FC<AddMovieModalProps> = ({ open, onClose }) => {
  const { movies, refetch } = useMovies();
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('');
  const [year, setYear] = useState('');
  // The server silently ignores a year that isn't 4 digits, which would look like the year
  // was applied — so reject it here instead of searching without it.
  const yearInvalid = year.trim() !== '' && !/^\d{4}$/.test(year.trim());
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [importingIds, setImportingIds] = useState<ReadonlySet<number>>(new Set());
  // Only the latest search's response may update results — guards against out-of-order replies.
  const searchIdRef = useRef(0);
  // The running search's request; a new search aborts it.
  const searchAbortRef = useRef<AbortController | null>(null);

  // "Added" means "in the current catalogue". `justImported` covers the gap between a
  // successful import (or a 409 "already in catalogue") and refetch() landing; it is cleared
  // whenever the catalogue changes, so a movie deleted later offers Import again.
  const catalogueIds = useMemo(() => new Set(movies.map((m) => m['Movie ID'])), [movies]);
  const [justImported, setJustImported] = useState<ReadonlySet<number>>(new Set());
  const [prevMovies, setPrevMovies] = useState(movies);
  if (movies !== prevMovies) {
    setPrevMovies(movies);
    if (justImported.size > 0) setJustImported(new Set());
  }
  const isAdded = (id: number) => catalogueIds.has(String(id)) || justImported.has(id);
  const markImported = (id: number) => setJustImported((prev) => new Set(prev).add(id));

  const handleSearch = async () => {
    if (!query.trim() && !actor.trim()) {
      setError('Enter a movie name or actor name');
      return;
    }
    if (yearInvalid) {
      setError('Year must be 4 digits, e.g. 1999');
      return;
    }
    // A new search replaces one still running: abort its request and ignore its reply.
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const searchId = ++searchIdRef.current;
    setSearching(true);
    setError(null);
    try {
      const res = await axios.get<{ results: TmdbSearchResult[] }>('/api/tmdb/search', {
        params: { query: query.trim(), actor: actor.trim(), year: year.trim() },
        signal: controller.signal,
      });
      if (searchId !== searchIdRef.current) return;
      setResults(res.data.results);
    } catch (err) {
      if (searchId !== searchIdRef.current || axios.isCancel(err)) return;
      setError(requestError(err));
      setResults([]);
    } finally {
      if (searchId === searchIdRef.current) setSearching(false);
    }
  };

  const handleImport = async (movieId: number) => {
    // Doesn't clear `error`: an earlier failure stays visible until dismissed or a new search.
    setImportingIds((prev) => new Set(prev).add(movieId));
    try {
      await axios.post('/api/tmdb/import', { movieId }).catch((err: unknown) => {
        // 409 = already in the catalogue (e.g. added from another tab): same end state as an import.
        if (!hasStatus(err, 409)) throw err;
      });
      markImported(movieId);
      refetch();
    } catch (err) {
      setError(requestError(err));
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(movieId);
        return next;
      });
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
      destroyOnHidden={false}
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
        <Input
          placeholder="Year (optional)"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
          inputMode="numeric"
          status={yearInvalid ? 'error' : undefined}
          aria-label="Release year (optional, 4 digits)"
          aria-invalid={yearInvalid}
          style={{ maxWidth: 120 }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={searching}>
          Search
        </Button>
      </Space.Compact>

      {error && <Alert type="error" title={error} showIcon closable={{ onClose: () => setError(null) }} style={{ marginBottom: 12 }} />}

      <List
        loading={searching}
        dataSource={results}
        locale={{ emptyText: 'No results yet — search above' }}
        style={{ maxHeight: 440, overflowY: 'auto' }}
        renderItem={(item) => (
          <List.Item
            actions={[
              isAdded(item.id) ? (
                <Tag icon={<CheckOutlined />} color="success" key="added">Added</Tag>
              ) : (
                <Button
                  key="import"
                  size="small"
                  icon={<PlusOutlined />}
                  loading={importingIds.has(item.id)}
                  onClick={() => handleImport(item.id)}
                >
                  Import
                </Button>
              ),
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  shape="square"
                  size={48}
                  src={
                    <img
                      src={item.posterUrl || POSTER_FALLBACK}
                      alt=""
                      onError={(e) => { (e.target as HTMLImageElement).src = POSTER_FALLBACK; }}
                    />
                  }
                />
              }
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
