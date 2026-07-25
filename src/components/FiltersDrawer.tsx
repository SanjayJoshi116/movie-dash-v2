import React, { useMemo } from 'react';
import { Drawer, Select, Slider, Button, Typography, Space } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import type { Movie, FilterState } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { parseRevenue, formatRevenue } from '../utils/statsHelpers';
import { useTheme } from '../contexts/ThemeContext';

const { Text } = Typography;

const DEFAULT_FILTERS: FilterState = {
  search: '',
  languages: [],
  genres: [],
  directors: [],
  yearRange: null,
  voteRange: null,
  runtimeRange: null,
  revenueRange: null,
};

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

  const {
    languageOptions,
    genreOptions,
    directorOptions,
    yearMin,
    yearMax,
    runtimeMin,
    runtimeMax,
    revenueMin,
    revenueMax,
  } = useMemo(() => {
    const languages = new Set<string>();
    const genres = new Set<string>();
    const directors = new Set<string>();
    let yLo = Infinity, yHi = -Infinity;
    let rLo = Infinity, rHi = -Infinity;
    let revLo = Infinity, revHi = -Infinity;

    movies.forEach((m) => {
      if (m.Language) languages.add(m.Language);
      if (m.Director) directors.add(m.Director);
      if (m.Genres) {
        m.Genres.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) genres.add(trimmed);
        });
      }
      const y = parseInt(m['Release Year'], 10);
      if (!isNaN(y)) {
        if (y < yLo) yLo = y;
        if (y > yHi) yHi = y;
      }
      const r = parseInt(m.Runtime, 10);
      if (!isNaN(r)) {
        if (r < rLo) rLo = r;
        if (r > rHi) rHi = r;
      }
      const rev = parseRevenue(m['Box Office Revenue']);
      if (rev > 0) {
        if (rev < revLo) revLo = rev;
        if (rev > revHi) revHi = rev;
      }
    });

    return {
      languageOptions: [...languages].sort((a, b) => getLanguageName(a).localeCompare(getLanguageName(b))).map((l) => ({ label: getLanguageName(l), value: l })),
      genreOptions: [...genres].sort().map((g) => ({ label: g, value: g })),
      directorOptions: [...directors].sort().map((d) => ({ label: d, value: d })),
      yearMin: isFinite(yLo) ? yLo : 1900,
      yearMax: isFinite(yHi) ? yHi : new Date().getFullYear(),
      runtimeMin: isFinite(rLo) ? rLo : 0,
      runtimeMax: isFinite(rHi) ? rHi : 240,
      revenueMin: isFinite(revLo) ? revLo : 0,
      revenueMax: isFinite(revHi) ? revHi : 1_000_000_000,
    };
  }, [movies]);

  const headerBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)';
  const bodyBg = isDark ? 'rgba(13,13,26,0.85)' : 'rgba(245,247,255,0.92)';

  return (
    <Drawer
      title={<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Filters</span>}
      placement="right"
      width={400}
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
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button icon={<ClearOutlined />} onClick={() => onChange(DEFAULT_FILTERS)}>
            Clear all
          </Button>
          <Button type="primary" onClick={onClose}>
            Done
          </Button>
        </Space>
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
      <Slider
        range
        min={yearMin}
        max={yearMax}
        value={filters.yearRange ?? [yearMin, yearMax]}
        disabled={yearMin === yearMax}
        onChange={(val) => {
          const [lo, hi] = val as [number, number];
          onChange({ ...filters, yearRange: lo <= yearMin && hi >= yearMax ? null : [lo, hi] });
        }}
        tooltip={{ formatter: (v) => v }}
      />

      <FieldLabel>Vote Average</FieldLabel>
      <Slider
        range
        min={0}
        max={10}
        step={0.1}
        value={filters.voteRange ?? [0, 10]}
        onChange={(val) => {
          const [lo, hi] = val as [number, number];
          onChange({ ...filters, voteRange: lo <= 0 && hi >= 10 ? null : [lo, hi] });
        }}
        tooltip={{ formatter: (v) => v?.toFixed(1) }}
      />

      <FieldLabel>Runtime (min)</FieldLabel>
      <Slider
        range
        min={runtimeMin}
        max={runtimeMax}
        value={filters.runtimeRange ?? [runtimeMin, runtimeMax]}
        disabled={runtimeMin === runtimeMax}
        onChange={(val) => {
          const [lo, hi] = val as [number, number];
          onChange({ ...filters, runtimeRange: lo <= runtimeMin && hi >= runtimeMax ? null : [lo, hi] });
        }}
        tooltip={{ formatter: (v) => v }}
      />

      <FieldLabel>Box Office Revenue</FieldLabel>
      <Slider
        range
        min={revenueMin}
        max={revenueMax}
        value={filters.revenueRange ?? [revenueMin, revenueMax]}
        disabled={revenueMin === revenueMax}
        onChange={(val) => {
          const [lo, hi] = val as [number, number];
          onChange({ ...filters, revenueRange: lo <= revenueMin && hi >= revenueMax ? null : [lo, hi] });
        }}
        tooltip={{ formatter: (v) => formatRevenue(v ?? 0) }}
      />
    </Drawer>
  );
};

export default FiltersDrawer;
