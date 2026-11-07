import { CATALOGUE_COLUMNS, type Movie } from '../types/movie';
import { escapeCsvField, sanitizeCsvValue } from './csvEscape';

/**
 * Downloads `movies` as CSV, in the order given (callers pass the rows as the active view
 * shows them). Columns are the full catalogue set plus any extra keys found on any row — not
 * just the first row's keys, which would drop e.g. a Poster URL the first movie happens to lack.
 */
export function exportMoviesToCsv(movies: Movie[], filename = 'movies.csv'): void {
  if (movies.length === 0) return;

  const extraKeys = new Set<string>();
  movies.forEach((m) => Object.keys(m).forEach((k) => {
    if (!(CATALOGUE_COLUMNS as readonly string[]).includes(k)) extraKeys.add(k);
  }));
  const headers: string[] = [...CATALOGUE_COLUMNS, ...extraKeys];

  const rows = movies.map((m) =>
    headers.map((h) => escapeCsvField(sanitizeCsvValue((m as unknown as Record<string, string | undefined>)[h] ?? ''))).join(',')
  );

  const csv = [headers.map(escapeCsvField).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
