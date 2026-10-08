export interface Movie {
  'Movie ID': string;
  'Name': string;
  'Language': string;
  'Runtime': string;
  'Release Year': string;
  'Genres': string;
  'Director': string;
  'Actors/Actresses': string;
  'Production Company': string;
  'Production Country': string;
  'Box Office Revenue': string;
  'Budget': string;
  'Popularity Score': string;
  'Vote Average': string;
  'Vote Count': string;
  'Poster URL'?: string;
  'Release Date': string;
}

/** Every Movie field, in the CSV's column order — the fixed column set for CSV export. */
export const CATALOGUE_COLUMNS: readonly (keyof Movie)[] = [
  'Movie ID', 'Name', 'Language', 'Runtime', 'Release Year', 'Genres', 'Director',
  'Actors/Actresses', 'Production Company', 'Production Country', 'Box Office Revenue',
  'Budget', 'Popularity Score', 'Vote Average', 'Vote Count', 'Poster URL', 'Release Date',
];

export interface FilterState {
  search: string;
  languages: string[];
  genres: string[];
  directors: string[];
  yearRange: [number, number] | null;
  voteRange: [number, number] | null;
  runtimeRange: [number, number] | null;
  revenueRange: [number, number] | null;
}

export interface StatsCounters {
  totalMovies: number;
  avgRuntime: number;
  longestRuntime: number;
  shortestRuntime: number;
  totalTimeSpent: number;
}
