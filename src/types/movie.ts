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
  'Release Date': string;
}

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
