import React, { useState, useMemo, useEffect } from 'react';
import { Button, Segmented, Input, Badge, Typography, Grid, Tooltip } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import { DownloadOutlined, SearchOutlined, FilterOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useMovies } from '../hooks/useMovies';
import { useDebounce } from '../hooks/useDebounce';
import { usePersistedFilters } from '../hooks/usePersistedFilters';
import FiltersDrawer from '../components/FiltersDrawer';
import ActiveFilters from '../components/ActiveFilters';
import MovieTable from '../components/MovieTable';
import MovieCardGrid from '../components/MovieCardGrid';
import MovieDrawer from '../components/MovieDrawer';
import AddMovieModal from '../components/AddMovieModal';
import LoadingError from '../components/LoadingError';
import { parseRevenue } from '../utils/statsHelpers';
import { isFiltersActive } from '../utils/filterChips';
import { exportMoviesToCsv } from '../utils/exportCsv';
import type { Movie, FilterState } from '../types/movie';

const { Title, Text } = Typography;

const SEARCHABLE_FIELDS: (keyof Movie)[] = [
  'Name',
  'Language',
  'Director',
  'Genres',
  'Actors/Actresses',
  'Production Company',
];

const DEFAULT_FILTERS: FilterState = {
  search: '',
  languages: [],
  genres: [],
  directors: [],
  yearRange: null,
  voteRange: null,
  runtimeRange: null,
  revenueRange: null,
};

const Movies: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const screens = Grid.useBreakpoint();
  const [filters, setFilters] = usePersistedFilters(DEFAULT_FILTERS);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [viewDefaulted, setViewDefaulted] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addMovieOpen, setAddMovieOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!viewDefaulted && screens.sm !== undefined) {
    setViewDefaulted(true);
    if (!screens.sm) setView('grid');
  }

  useEffect(() => {
    const presetFilters = (location.state as { presetFilters?: Partial<FilterState> } | null)?.presetFilters;
    if (presetFilters) {
      setFilters({ ...DEFAULT_FILTERS, ...presetFilters });
      navigate(location.pathname, { replace: true, state: null });
    }
    // Consume drill-down filters passed via navigate() state (e.g. from Dashboard chart clicks) exactly once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debouncedSearch = useDebounce(filters.search, 300);
  const filtersActive = isFiltersActive(filters);

  const filteredMovies = useMemo<Movie[]>(() => {
    return movies.filter((movie) => {
      // Text search
      if (debouncedSearch) {
        const lower = debouncedSearch.toLowerCase();
        const matchesText = SEARCHABLE_FIELDS.some((key) =>
          movie[key]?.toLowerCase().includes(lower)
        );
        if (!matchesText) return false;
      }

      // Language filter
      if (filters.languages.length > 0 && !filters.languages.includes(movie.Language)) {
        return false;
      }

      // Genre filter
      if (filters.genres.length > 0) {
        const movieGenres = movie.Genres.split(',').map(g => g.trim());
        const hasMatch = filters.genres.some(selected => movieGenres.includes(selected));
        if (!hasMatch) return false;
      }

      // Director filter
      if (filters.directors.length > 0 && !filters.directors.includes(movie.Director)) {
        return false;
      }

      // Year range filter
      if (filters.yearRange !== null) {
        const year = parseInt(movie['Release Year'], 10);
        if (isNaN(year) || year < filters.yearRange[0] || year > filters.yearRange[1]) {
          return false;
        }
      }

      // Vote range filter
      if (filters.voteRange !== null) {
        const vote = parseFloat(movie['Vote Average']);
        if (isNaN(vote) || vote < filters.voteRange[0] || vote > filters.voteRange[1]) {
          return false;
        }
      }

      // Runtime range filter
      if (filters.runtimeRange !== null) {
        const runtime = parseInt(movie.Runtime, 10);
        if (isNaN(runtime) || runtime < filters.runtimeRange[0] || runtime > filters.runtimeRange[1]) {
          return false;
        }
      }

      // Revenue range filter
      if (filters.revenueRange !== null) {
        const revenue = parseRevenue(movie['Box Office Revenue']);
        if (revenue < filters.revenueRange[0] || revenue > filters.revenueRange[1]) {
          return false;
        }
      }

      return true;
    });
  }, [
    debouncedSearch,
    filters.languages,
    filters.genres,
    filters.directors,
    filters.yearRange,
    filters.voteRange,
    filters.runtimeRange,
    filters.revenueRange,
    movies,
  ]);

  return (
    <LoadingError loading={loading} error={error} onRetry={refetch}>
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 4 }}>🎬 Movies</Title>
      <Text style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 24 }}>
        Browse, search, and filter your full movie catalogue in table or grid view.
      </Text>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: 16,
          padding: '16px 24px',
          background: 'var(--filters-bg)',
          borderRadius: 12,
          border: '1px solid var(--filters-border)',
          boxShadow: 'var(--glass-shadow)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Input
          placeholder="Search by name, director, actor…"
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          allowClear
          onClear={() => setFilters({ ...filters, search: '' })}
          style={{ maxWidth: 360, flex: '1 1 240px' }}
        />
        <Badge dot={filtersActive} offset={[-6, 6]} color="#38bdf8">
          <Button icon={<FilterOutlined />} onClick={() => setFiltersOpen(true)}>
            Filters
          </Button>
        </Badge>
        <Segmented
          value={view}
          onChange={(val) => setView(val as 'table' | 'grid')}
          options={[
            { label: 'Table', value: 'table' },
            { label: 'Grid', value: 'grid' },
          ]}
        />
        <Button
          icon={<DownloadOutlined />}
          disabled={filteredMovies.length === 0}
          onClick={() => exportMoviesToCsv(filteredMovies, `movies-filtered-${filteredMovies.length}.csv`)}
        >
          Export CSV
        </Button>
        <Tooltip title="Downloads the movies currently shown (after search/filters/sort) as a CSV file — not the full dataset.">
          <InfoCircleOutlined style={{ color: 'var(--text-muted)', cursor: 'help' }} />
        </Tooltip>
        <Button icon={<PlusOutlined />} onClick={() => setAddMovieOpen(true)}>
          Add Movie
        </Button>
      </div>

      <ActiveFilters filters={filters} onChange={setFilters} onClearAll={() => setFilters(DEFAULT_FILTERS)} />

      <FiltersDrawer
        movies={movies}
        filters={filters}
        onChange={setFilters}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />

      {view === 'table' ? (
        <MovieTable movies={filteredMovies} onRowClick={setSelectedMovie} />
      ) : (
        <MovieCardGrid movies={filteredMovies} onRowClick={setSelectedMovie} />
      )}

      <MovieDrawer movie={selectedMovie} onClose={() => setSelectedMovie(null)} />

      <AddMovieModal open={addMovieOpen} onClose={() => setAddMovieOpen(false)} />
    </div>
    </LoadingError>
  );
};

export default Movies;
