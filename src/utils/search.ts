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
 * Lower-cases and strips accents/diacritics (NFD, then drop combining marks), so "amelie" finds
 * "Amélie" and "Amélie" finds "Amelie". Letters with no decomposition (ø, ß, ł) are kept as-is.
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Joins the folded fields so one `includes` checks them all; a search term can't contain it, so a
// match never spans two fields.
const FIELD_SEPARATOR = String.fromCharCode(0);

// Folded searchable text per movie object, built on first search. Movie objects are replaced (not
// mutated) when the catalogue reloads, so a cached entry never goes stale and old ones are collected.
const haystacks = new WeakMap<Searchable, string>();

function haystackOf(movie: Searchable): string {
  let haystack = haystacks.get(movie);
  if (haystack === undefined) {
    const parts = SEARCHABLE_FIELDS.map((key) => movie[key] ?? '');
    parts.push(getLanguageName(movie.Language ?? ''));
    haystack = foldForSearch(parts.join(FIELD_SEPARATOR));
    haystacks.set(movie, haystack);
  }
  return haystack;
}

// The page calls matchesSearch once per movie with the same term: fold it once.
let lastTerm: string | undefined;
let lastFolded = '';

/**
 * Whether `movie` matches the Movies page search `term` (case- and accent-insensitive substring,
 * surrounding whitespace ignored; a blank term matches everything). Also matches
 * the language's display name, since `Language` is stored as an ISO code. Shared with the e2e
 * helpers so their expected counts can't drift from the page.
 */
export function matchesSearch(movie: Searchable, term: string): boolean {
  if (term !== lastTerm) {
    lastTerm = term;
    lastFolded = foldForSearch(term.trim());
  }
  return haystackOf(movie).includes(lastFolded);
}
