import type { Movie } from '../types/movie';

export function exportMoviesToCsv(movies: Movie[], filename = 'movies.csv'): void {
  if (movies.length === 0) return;

  const headers = Object.keys(movies[0]) as (keyof Movie)[];

  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = movies.map(m =>
    headers.map(h => escape(m[h] ?? '')).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
