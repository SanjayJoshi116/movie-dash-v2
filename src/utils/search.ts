import type { Movie } from '../types/movie';
import { getLanguageName } from './languages';

/** Raw `Movie` text fields the Movies page search matches. Add new searchable text fields here. */
export const SEARCHABLE_FIELDS = [
  'Name',
  'Language',
  'Director',
  'Genres',
  'Actors/Actresses',
  'Production Company',
  'Production Country',
  'Release Year',
] as const satisfies readonly (keyof Movie)[];

type Searchable = Partial<Pick<Movie, (typeof SEARCHABLE_FIELDS)[number]>>;

/**
 * Whether `movie` matches the Movies page search `term` (case-insensitive substring). Also matches
 * the language's display name, since `Language` is stored as an ISO code. Shared with the e2e
 * helpers so their expected counts can't drift from the page.
 */
export function matchesSearch(movie: Searchable, term: string): boolean {
  const lower = term.toLowerCase();
  return SEARCHABLE_FIELDS.some((key) => movie[key]?.toLowerCase().includes(lower))
    || getLanguageName(movie.Language ?? '').toLowerCase().includes(lower);
}
