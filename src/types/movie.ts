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
  'Vote Average': string;
  'Release Date': string;
}

export interface FilterState {
  search: string;
  languages: string[];
  genres: string[];
  yearRange: [number, number] | null;
  voteRange: [number, number] | null;
}

export interface StatsCounters {
  totalMovies: number;
  avgRuntime: number;
  longestRuntime: number;
  shortestRuntime: number;
  totalTimeSpent: number;
}
