import React, { useMemo } from 'react';
import { Drawer, Select, Button, Typography, Grid } from 'antd';
import type { Movie, FilterState } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { formatRevenue } from '../utils/statsHelpers';
import { computeFilterSpans } from '../utils/filterSpans';
import RangeSlider from './RangeSlider';
import { useTheme } from '../contexts/ThemeContext';

const { Text } = Typography;

interface FiltersDrawerProps {
  movies: Movie[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  open: boolean;
  onClose: () => void;
}

const SectionLabel: React.FC<{ children: React.ReactNode; first?: boolean }> = ({ children, first }) => (
  <Text
    style={{
      display: 'block',
      color: 'var(--text-secondary)',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: first ? 0 : 28,
      marginBottom: 14,
    }}
  >
    {children}
  </Text>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>{children}</div>
);

const FiltersDrawer: React.FC<FiltersDrawerProps> = ({ movies, filters, onChange, open, onClose }) => {
  const { isDark } = useTheme();
  const screens = Grid.useBreakpoint();

  const { languageOptions, genreOptions, directorOptions } = useMemo(() => {
    const languages = new Set<string>();
    const genres = new Set<string>();
    const directors = new Set<string>();
    movies.forEach((m) => {
      if (m.Language) languages.add(m.Language);
      if (m.Director) directors.add(m.Director);
      if (m.Genres) {
        m.Genres.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) genres.add(trimmed);
        });
      }
    });
    return {
      languageOptions: [...languages].sort((a, b) => getLanguageName(a).localeCompare(getLanguageName(b))).map((l) => ({ label: getLanguageName(l), value: l })),
      genreOptions: [...genres].sort().map((g) => ({ label: g, value: g })),
      directorOptions: [...directors].sort().map((d) => ({ label: d, value: d })),
    };
  }, [movies]);

  // Shared with Movies.tsx's restored-range clamping, so both use the same bounds.
  const { yearMin, yearMax, runtimeMin, runtimeMax, revenueMin, revenueMax } = useMemo(() => computeFilterSpans(movies), [movies]);

  const headerBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)';
  const bodyBg = isDark ? 'rgba(13,13,26,0.85)' : 'rgba(245,247,255,0.92)';

  return (
    <Drawer
      title={<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Filters</span>}
      placement="right"
      width={screens.sm ? 400 : '100%'}
      open={open}
      onClose={onClose}
      styles={{
        header: {
          background: headerBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--glass-border)',
        },
        body: {
          background: bodyBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: 24,
        },
        mask: { backdropFilter: 'blur(4px)' },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <SectionLabel first>Categories</SectionLabel>
      <FieldLabel>Language</FieldLabel>
      <Select
        mode="multiple"
        placeholder="Any language"
        aria-label="Language"
        options={languageOptions}
        value={filters.languages}
        onChange={(val) => onChange({ ...filters, languages: val })}
        style={{ width: '100%', marginBottom: 16 }}
        maxTagCount="responsive"
        allowClear
      />
      <FieldLabel>Genre</FieldLabel>
      <Select
        mode="multiple"
        placeholder="Any genre"
        aria-label="Genre"
        options={genreOptions}
        value={filters.genres}
        onChange={(val) => onChange({ ...filters, genres: val })}
        style={{ width: '100%', marginBottom: 16 }}
        maxTagCount="responsive"
        allowClear
      />
      <FieldLabel>Director</FieldLabel>
      <Select
        mode="multiple"
        placeholder="Any director"
        aria-label="Director"
        options={directorOptions}
        value={filters.directors}
        onChange={(val) => onChange({ ...filters, directors: val })}
        style={{ width: '100%' }}
        maxTagCount="responsive"
        allowClear
      />

      <SectionLabel>Ranges</SectionLabel>
      <FieldLabel>Release Year</FieldLabel>
      <RangeSlider
        min={yearMin}
        max={yearMax}
        value={filters.yearRange ?? [yearMin, yearMax]}
        disabled={yearMin === yearMax}
        onCommit={([lo, hi]) => onChange({ ...filters, yearRange: lo <= yearMin && hi >= yearMax ? null : [lo, hi] })}
        tooltip={{ formatter: (v) => v }}
      />

      <FieldLabel>Vote Average</FieldLabel>
      <RangeSlider
        min={0}
        max={10}
        step={0.1}
        value={filters.voteRange ?? [0, 10]}
        onCommit={([lo, hi]) => onChange({ ...filters, voteRange: lo <= 0 && hi >= 10 ? null : [lo, hi] })}
        tooltip={{ formatter: (v) => v?.toFixed(1) }}
      />

      <FieldLabel>Runtime (min)</FieldLabel>
      <RangeSlider
        min={runtimeMin}
        max={runtimeMax}
        value={filters.runtimeRange ?? [runtimeMin, runtimeMax]}
        disabled={runtimeMin === runtimeMax}
        onCommit={([lo, hi]) => onChange({ ...filters, runtimeRange: lo <= runtimeMin && hi >= runtimeMax ? null : [lo, hi] })}
        tooltip={{ formatter: (v) => v }}
      />

      <FieldLabel>Box Office Revenue</FieldLabel>
      <RangeSlider
        min={revenueMin}
        max={revenueMax}
        value={filters.revenueRange ?? [revenueMin, revenueMax]}
        disabled={revenueMin === revenueMax}
        onCommit={([lo, hi]) => onChange({ ...filters, revenueRange: lo <= revenueMin && hi >= revenueMax ? null : [lo, hi] })}
        tooltip={{ formatter: (v) => formatRevenue(v ?? 0) }}
      />
    </Drawer>
  );
};

export default FiltersDrawer;
