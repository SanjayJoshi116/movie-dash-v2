import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CATALOGUE_COLUMNS, type Movie } from '../types/movie';
import { hasStatus, serverErrorMessage } from '../utils/httpError';

/** The server's `{ error }` text when it sent one (e.g. "Data still loading"), else axios's message. */
function errorMessage(err: unknown): string {
  return serverErrorMessage(err) ?? (err instanceof Error ? err.message : 'Unknown error');
}

/**
 * Every catalogue column becomes a string (`''` when missing or not a string) — a short row
 * or a catalogue without a column must not crash a `.split`/`localeCompare` in any view.
 * Extra (non-catalogue) keys are kept, so the export still writes them.
 */
function normalizeMovie(row: unknown): Movie {
  const source = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : {};
  const normalized: Record<string, unknown> = { ...source };
  for (const column of CATALOGUE_COLUMNS) {
    const value = source[column];
    normalized[column] = typeof value === 'string' ? value : '';
  }
  return normalized as unknown as Movie;
}

/** A first-load 503 ("still loading", e.g. the dev race where Vite is up before Express) is retried once after this delay. */
const FIRST_LOAD_RETRY_MS = 1000;

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
  /** Starts a reload; the promise settles (never rejects) once that reload has finished, success or failure. */
  refetch: () => Promise<void>;
}

const MoviesContext = createContext<MoviesState>({
  movies: [],
  loading: true,
  refreshing: false,
  error: null,
  refreshError: null,
  refetch: () => Promise.resolve(),
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
  // Whether the one automatic first-load 503 retry has been used; reset when a load succeeds.
  const retriedRef = useRef(false);
  // refetch() callers waiting for the next load to settle (ErrorBoundary's "Try Again" waits on it).
  const settleRef = useRef<Array<() => void>>([]);
  const settle = () => {
    const waiting = settleRef.current;
    settleRef.current = [];
    waiting.forEach((resolve) => resolve());
  };

  const refetch = useCallback(() => {
    if (hasLoadedRef.current) {
      setRefreshError(null);
      setRefreshing(true);
    } else {
      setError(null);
      setLoading(true);
    }
    setFetchKey(k => k + 1);
    return new Promise<void>((resolve) => { settleRef.current.push(resolve); });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    axios
      .get<Movie[]>('/api/movies', { signal: controller.signal })
      .then((response) => {
        // A 200 that isn't a list (e.g. a proxy's HTML page) is a failed load, not data: every
        // page would otherwise crash on `.filter`. Thrown so the .catch below handles it.
        if (!Array.isArray(response.data)) throw new Error('Unexpected response from the server');
        hasLoadedRef.current = true;
        retriedRef.current = false;
        setMovies(response.data.map(normalizeMovie));
        setLoading(false);
        setRefreshing(false);
        settle();
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return;
        const message = errorMessage(err);
        if (hasLoadedRef.current) {
          setRefreshError(message);
          setRefreshing(false);
          settle();
        } else if (hasStatus(err, 503) && !retriedRef.current) {
          // Keep the skeleton up and try once more (the setFetchKey bump re-runs this effect).
          retriedRef.current = true;
          retryTimer = setTimeout(() => setFetchKey((k) => k + 1), FIRST_LOAD_RETRY_MS);
        } else {
          setError(message);
          setLoading(false);
          settle();
        }
      });

    return () => {
      controller.abort();
      clearTimeout(retryTimer);
    };
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
