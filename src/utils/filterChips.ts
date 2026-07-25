import type { FilterState } from '../types/movie';
import { getLanguageName } from './languages';
import { formatRevenue } from './statsHelpers';

export interface FilterChip {
  key: string;
  label: string;
  onClose: () => void;
}

export function isFiltersActive(filters: FilterState): boolean {
  return (
    filters.search !== '' ||
    filters.languages.length > 0 ||
    filters.genres.length > 0 ||
    filters.directors.length > 0 ||
    filters.yearRange !== null ||
    filters.voteRange !== null ||
    filters.runtimeRange !== null ||
    filters.revenueRange !== null
  );
}

export function buildFilterChips(filters: FilterState, onChange: (filters: FilterState) => void): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.search) {
    chips.push({ key: 'search', label: `Search: ${filters.search}`, onClose: () => onChange({ ...filters, search: '' }) });
  }
  filters.languages.forEach((lang) => {
    chips.push({
      key: `lang-${lang}`,
      label: `Language: ${getLanguageName(lang)}`,
      onClose: () => onChange({ ...filters, languages: filters.languages.filter((l) => l !== lang) }),
    });
  });
  filters.genres.forEach((genre) => {
    chips.push({
      key: `genre-${genre}`,
      label: `Genre: ${genre}`,
      onClose: () => onChange({ ...filters, genres: filters.genres.filter((g) => g !== genre) }),
    });
  });
  filters.directors.forEach((director) => {
    chips.push({
      key: `director-${director}`,
      label: `Director: ${director}`,
      onClose: () => onChange({ ...filters, directors: filters.directors.filter((d) => d !== director) }),
    });
  });
  if (filters.yearRange) {
    chips.push({ key: 'year', label: `Year: ${filters.yearRange[0]}–${filters.yearRange[1]}`, onClose: () => onChange({ ...filters, yearRange: null }) });
  }
  if (filters.voteRange) {
    chips.push({ key: 'vote', label: `Vote: ${filters.voteRange[0].toFixed(1)}–${filters.voteRange[1].toFixed(1)}`, onClose: () => onChange({ ...filters, voteRange: null }) });
  }
  if (filters.runtimeRange) {
    chips.push({ key: 'runtime', label: `Runtime: ${filters.runtimeRange[0]}–${filters.runtimeRange[1]}m`, onClose: () => onChange({ ...filters, runtimeRange: null }) });
  }
  if (filters.revenueRange) {
    chips.push({ key: 'revenue', label: `Revenue: ${formatRevenue(filters.revenueRange[0])}–${formatRevenue(filters.revenueRange[1])}`, onClose: () => onChange({ ...filters, revenueRange: null }) });
  }

  return chips;
}
