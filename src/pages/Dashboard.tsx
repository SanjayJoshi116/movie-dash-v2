import React, { useState, useMemo } from 'react';
import { Spin, Alert } from 'antd';
import { useMovies } from '../hooks/useMovies';
import { useDebounce } from '../hooks/useDebounce';
import { usePersistedFilters } from '../hooks/usePersistedFilters';
import FiltersPanel from '../components/FiltersPanel';
import MovieTable from '../components/MovieTable';
import MovieDrawer from '../components/MovieDrawer';
import type { Movie, FilterState } from '../types/movie';

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
  yearRange: null,
  voteRange: null,
};

const Dashboard: React.FC = () => {
  const { movies, loading, error } = useMovies();
  const [filters, setFilters] = usePersistedFilters(DEFAULT_FILTERS);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const debouncedSearch = useDebounce(filters.search, 300);

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

      return true;
    });
  }, [debouncedSearch, filters.languages, filters.genres, filters.yearRange, filters.voteRange, movies]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message="Failed to load movies" description={error} showIcon style={{ margin: 24 }} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <FiltersPanel movies={movies} filters={filters} onChange={setFilters} />
      <MovieTable movies={filteredMovies} onRowClick={setSelectedMovie} />
      <MovieDrawer movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </div>
  );
};

export default Dashboard;
