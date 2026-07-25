import React, { useMemo } from 'react';
import { Input, Select, Slider, Button, Collapse, Row, Col, Space, Tag } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import type { Movie, FilterState } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { parseRevenue, formatRevenue } from '../utils/statsHelpers';

interface FiltersPanelProps {
  movies: Movie[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

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

const FiltersPanel: React.FC<FiltersPanelProps> = ({ movies, filters, onChange }) => {
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

  const isFiltered =
    filters.search !== '' ||
    filters.languages.length > 0 ||
    filters.genres.length > 0 ||
    filters.directors.length > 0 ||
    filters.yearRange !== null ||
    filters.voteRange !== null ||
    filters.runtimeRange !== null ||
    filters.revenueRange !== null;

  const handleReset = () => onChange(DEFAULT_FILTERS);

  const chips: { key: string; label: string; onClose: () => void }[] = [];
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

  const panelContent = (
    <>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={12} lg={8}>
          <Input
            placeholder="Search by name, director, actor…"
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            allowClear
            onClear={() => onChange({ ...filters, search: '' })}
          />
        </Col>

        <Col xs={24} sm={12} lg={5}>
          <Select
            mode="multiple"
            placeholder="Language"
            aria-label="Language"
            options={languageOptions}
            value={filters.languages}
            onChange={(val) => onChange({ ...filters, languages: val })}
            style={{ width: '100%' }}
            maxTagCount="responsive"
            allowClear
          />
        </Col>

        <Col xs={24} sm={12} lg={5}>
          <Select
            mode="multiple"
            placeholder="Genre"
            aria-label="Genre"
            options={genreOptions}
            value={filters.genres}
            onChange={(val) => onChange({ ...filters, genres: val })}
            style={{ width: '100%' }}
            maxTagCount="responsive"
            allowClear
          />
        </Col>

        <Col xs={24} sm={12} lg={5}>
          <Select
            mode="multiple"
            placeholder="Director"
            aria-label="Director"
            options={directorOptions}
            value={filters.directors}
            onChange={(val) => onChange({ ...filters, directors: val })}
            style={{ width: '100%' }}
            maxTagCount="responsive"
            allowClear
          />
        </Col>

        <Col xs={24} lg={1}>
          {isFiltered && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleReset}
              size="small"
              title="Clear all filters"
            />
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]} align="middle" style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>
            Release Year
          </div>
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
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>
            Vote Average
          </div>
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
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>
            Runtime (min)
          </div>
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
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>
            Box Office Revenue
          </div>
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
        </Col>
      </Row>

      {chips.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {chips.map((chip) => (
            <Tag key={chip.key} closable onClose={chip.onClose} color="blue">
              {chip.label}
            </Tag>
          ))}
        </div>
      )}
    </>
  );

  return (
    <Collapse
      defaultActiveKey={['filters']}
      style={{
        background: 'var(--filters-bg)',
        border: '1px solid var(--filters-border)',
        borderRadius: 12,
        marginBottom: 16,
      }}
      items={[
        {
          key: 'filters',
          label: (
            <Space>
              <FilterOutlined />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                Filters {isFiltered && <span style={{ color: '#38bdf8' }}>●</span>}
              </span>
            </Space>
          ),
          children: panelContent,
          style: { border: 'none' },
        },
      ]}
    />
  );
};

export default FiltersPanel;
