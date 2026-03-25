import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import type { Movie } from '../types/movie';

interface MoviesState {
  movies: Movie[];
  loading: boolean;
  error: string | null;
}

const MoviesContext = createContext<MoviesState>({
  movies: [],
  loading: true,
  error: null,
});

export const MoviesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<Movie[]>('/movies', { signal: controller.signal })
      .then((response) => {
        setMovies(response.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <MoviesContext.Provider value={{ movies, loading, error }}>
      {children}
    </MoviesContext.Provider>
  );
};

export function useMoviesContext(): MoviesState {
  return useContext(MoviesContext);
}
