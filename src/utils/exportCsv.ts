import { CATALOGUE_COLUMNS, type Movie } from '../types/movie';

const FORMULA_PREFIXES = ['=', '+', '-', '@'];

// Excel/Sheets can execute a cell starting with =, +, -, or @ as a formula. Same guard the
// server applies when writing src/movies.csv (sanitizeCsvValue in server/app.ts).
function sanitizeCsvValue(value: string): string {
  return FORMULA_PREFIXES.some((p) => value.startsWith(p)) ? `'${value}` : value;
}

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

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
