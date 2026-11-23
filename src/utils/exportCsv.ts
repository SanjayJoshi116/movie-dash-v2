import { CATALOGUE_COLUMNS, type Movie } from '../types/movie';
import { escapeCsvField, sanitizeCsvValue } from './csvEscape';

/**
 * `movies` as CSV text (no BOM), in the order given. Columns are the full catalogue set plus any
 * extra keys found on any row — not just the first row's keys, which would drop e.g. a Poster URL
 * the first movie happens to lack.
 */
export function moviesToCsv(movies: Movie[]): string {
  const extraKeys = new Set<string>();
  movies.forEach((m) => Object.keys(m).forEach((k) => {
    if (!(CATALOGUE_COLUMNS as readonly string[]).includes(k)) extraKeys.add(k);
  }));
  const headers: string[] = [...CATALOGUE_COLUMNS, ...extraKeys];

  const rows = movies.map((m) =>
    headers.map((h) => escapeCsvField(sanitizeCsvValue((m as unknown as Record<string, string | undefined>)[h] ?? ''))).join(',')
  );

  // Header names get the same formula guard as data cells (an extra column could be named "=X").
  return [headers.map((h) => escapeCsvField(sanitizeCsvValue(h))).join(','), ...rows].join('\n');
}

/** Downloads `movies` as CSV (see `moviesToCsv`), in the order the active view shows them. */
export function exportMoviesToCsv(movies: Movie[], filename = 'movies.csv'): void {
  if (movies.length === 0) return;
  const csv = moviesToCsv(movies);
  // UTF-8 BOM so Excel reads accented text correctly. Built from the code point, never a
  // literal or escape (editing tools mangle those — see CLAUDE.md "Known gotchas").
  const bom = String.fromCharCode(0xfeff);
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking synchronously after click() can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
