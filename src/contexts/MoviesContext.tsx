import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import type { Movie } from '../types/movie';

interface MoviesState {
  movies: Movie[];
  /** True only until the first load finishes — drives the full-page skeleton. */
  loading: boolean;
  /** True while a refetch() after the first load is in flight; the page stays mounted. */
  refreshing: boolean;
  /** First-load failure (full-page error). */
  error: string | null;
  /** A refetch() failed; the last loaded `movies` are still shown. Cleared by the next refetch. */
  refreshError: string | null;
  refetch: () => void;
}

const MoviesContext = createContext<MoviesState>({
  movies: [],
  loading: true,
  refreshing: false,
  error: null,
  refreshError: null,
  refetch: () => {},
});

export const MoviesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  // Once data has loaded, refetches (after add/delete) must not flip `loading` — LoadingError
  // would swap the whole page for a skeleton and unmount open dialogs, sort, and pagination.
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(() => {
    if (hasLoadedRef.current) {
      setRefreshError(null);
      setRefreshing(true);
    } else {
      setError(null);
      setLoading(true);
    }
    setFetchKey(k => k + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<Movie[]>('/api/movies', { signal: controller.signal })
      .then((response) => {
        hasLoadedRef.current = true;
        setMovies(response.data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (hasLoadedRef.current) {
          setRefreshError(message);
          setRefreshing(false);
        } else {
          setError(message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [fetchKey]);

  const value = useMemo<MoviesState>(
    () => ({ movies, loading, refreshing, error, refreshError, refetch }),
    [movies, loading, refreshing, error, refreshError, refetch]
  );

  return (
    <MoviesContext.Provider value={value}>
      {children}
    </MoviesContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider, same as ThemeContext
export function useMoviesContext(): MoviesState {
  return useContext(MoviesContext);
}
