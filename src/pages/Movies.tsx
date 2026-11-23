import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Button, Segmented, Input, Badge, Typography, Grid, Tooltip } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import { DownloadOutlined, SearchOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
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
import { parseRevenue, splitNames } from '../utils/statsHelpers';
import { isFiltersActive } from '../utils/filterChips';
import { exportMoviesToCsv } from '../utils/exportCsv';
import { matchesSearch } from '../utils/search';
import { computeFilterSpans, clampFiltersToSpans } from '../utils/filterSpans';
import { DEFAULT_FILTERS, type Movie, type FilterState } from '../types/movie';
import PageTitle from '../components/PageTitle';

const { Text } = Typography;

// Blank (or whitespace-only) search = no search, applied at once.
const isEmptySearch = (v: string) => v.trim() === '';
const EXPORT_HINT = 'Downloads the movies currently shown (after search/filters/sort) as a CSV file — not the full dataset.';

const Movies: React.FC = () => {
  const { movies, loading, error, refetch } = useMovies();
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  // A drill-down's filters (Dashboard/Stats chart clicks) are the page's initial filters, so the
  // filters saved earlier in the session never render first; the clamp below then applies to them too.
  const presetFilters = (location.state as { presetFilters?: Partial<FilterState> } | null)?.presetFilters ?? null;
  const [filters, setFilters] = usePersistedFilters(DEFAULT_FILTERS, presetFilters);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [viewDefaulted, setViewDefaulted] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addMovieOpen, setAddMovieOpen] = useState(false);
  // Rows in the order the active view shows them (it reports them) — what Export CSV writes.
  const displayedRef = useRef<Movie[]>([]);
  const handleDisplayedChange = useCallback((rows: Movie[]) => { displayedRef.current = rows; }, []);

  // Once the catalogue has loaded, clamp ranges restored from sessionStorage (or a drill-down preset) to the current data
  // span (it may have changed since they were saved). Render-phase, once per mount — not an effect.
  const [rangesClamped, setRangesClamped] = useState(false);
  if (!rangesClamped && !loading && movies.length > 0) {
    setRangesClamped(true);
    const clamped = clampFiltersToSpans(filters, computeFilterSpans(movies));
    if (clamped !== filters) setFilters(clamped);
  }

  if (!viewDefaulted && screens.sm !== undefined) {
    setViewDefaulted(true);
    if (!screens.sm) setView('grid');
  }

  // The preset was consumed as initial state; clear the router state once so a later re-render
  // or back/forward doesn't re-apply it (syncing the URL is external-system work, hence an effect).
  useEffect(() => {
    if (presetFilters) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on arrival
  }, []);

  // Typing is debounced; clearing applies at once, so the old search never filters an empty box.
  const debouncedSearch = useDebounce(filters.search, 300, isEmptySearch);
  // Surrounding whitespace never affects matching; the input keeps what the user typed.
  const searchTerm = debouncedSearch.trim();
  // Changes whenever the effective filters do (debounced search) — the views reset to page 1 on it.
  const filtersKey = useMemo(() => JSON.stringify({ ...filters, search: searchTerm }), [filters, searchTerm]);
  const filtersActive = isFiltersActive(filters);

  const filteredMovies = useMemo<Movie[]>(() => {
    return movies.filter((movie) => {
      // Text search
      if (searchTerm && !matchesSearch(movie, searchTerm)) return false;

      // Language filter
      if (filters.languages.length > 0 && !filters.languages.includes(movie.Language)) {
        return false;
      }

      // Genre filter
      if (filters.genres.length > 0) {
        const movieGenres = splitNames(movie.Genres);
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

      // Vote range filter — 0 means unrated (charts skip it too), so it never matches a range
      if (filters.voteRange !== null) {
        const vote = parseFloat(movie['Vote Average']);
        if (isNaN(vote) || vote <= 0 || vote < filters.voteRange[0] || vote > filters.voteRange[1]) {
          return false;
        }
      }

      // Runtime range filter — 0/blank means unknown (TMDB stores a missing runtime as 0), so like
      // an unrated vote it never matches a range
      if (filters.runtimeRange !== null) {
        const runtime = parseInt(movie.Runtime, 10);
        if (isNaN(runtime) || runtime <= 0 || runtime < filters.runtimeRange[0] || runtime > filters.runtimeRange[1]) {
          return false;
        }
      }

      // Revenue range filter — 0/blank means unknown (most of the dataset), so like a missing
      // runtime it's excluded while the filter is active rather than passing a range from $0
      if (filters.revenueRange !== null) {
        const revenue = parseRevenue(movie['Box Office Revenue']);
        if (revenue <= 0 || revenue < filters.revenueRange[0] || revenue > filters.revenueRange[1]) {
          return false;
        }
      }

      return true;
    });
  }, [
    searchTerm,
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
      <PageTitle emoji="🎬" title="Movies" />
      <Text style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 24 }}>
        Browse, search, and filter your full movie catalogue in table or grid view.
      </Text>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
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
          placeholder="Search by name, director, actor, year, language, country…"
          aria-label="Search movies"
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          allowClear
          onClear={() => setFilters({ ...filters, search: '' })}
          style={{ maxWidth: 360, flex: '1 1 240px' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Badge dot={filtersActive} offset={[-6, 6]} color="#38bdf8">
            {/* The badge dot is colour-only — say it in the accessible name too. */}
            <Button icon={<FilterOutlined />} onClick={() => setFiltersOpen(true)} aria-label={filtersActive ? 'Filters, active' : 'Filters'}>
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
          {/* The hint is on the button itself (tooltip on hover/focus) and in its accessible
              description, so keyboard and screen-reader users get it too. */}
          <Tooltip title={EXPORT_HINT}>
            <Button
              icon={<DownloadOutlined />}
              disabled={filteredMovies.length === 0}
              aria-describedby="export-csv-hint"
              onClick={() => {
                const rows = displayedRef.current;
                // Sorting alone isn't filtering: without a search/filter the rows are the full set.
                // Use the debounced search, like the rows, so the name can't run ahead of them.
                const filtered = isFiltersActive({ ...filters, search: searchTerm });
                exportMoviesToCsv(rows, `${filtered ? 'movies-filtered' : 'movies'}-${rows.length}.csv`);
              }}
            >
              Export CSV
            </Button>
          </Tooltip>
          <span id="export-csv-hint" className="visually-hidden">{EXPORT_HINT}</span>
          <Button icon={<PlusOutlined />} onClick={() => setAddMovieOpen(true)}>
            Add Movie
          </Button>
        </div>
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
        <MovieTable movies={filteredMovies} onRowClick={setSelectedMovie} filtersKey={filtersKey} onDisplayedChange={handleDisplayedChange} />
      ) : (
        <MovieCardGrid movies={filteredMovies} onRowClick={setSelectedMovie} filtersKey={filtersKey} onDisplayedChange={handleDisplayedChange} />
      )}

      <MovieDrawer movie={selectedMovie} onClose={() => setSelectedMovie(null)} />

      <AddMovieModal open={addMovieOpen} onClose={() => setAddMovieOpen(false)} />
    </div>
    </LoadingError>
  );
};

export default Movies;
