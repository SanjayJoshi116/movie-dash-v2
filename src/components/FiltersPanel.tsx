import React, { useMemo } from 'react';
import { Input, Select, Slider, Button, Collapse, Row, Col, Space } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import type { Movie, FilterState } from '../types/movie';
import { getLanguageName } from '../utils/languages';

interface FiltersPanelProps {
  movies: Movie[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({ movies, filters, onChange }) => {
  const { languageOptions, genreOptions, yearMin, yearMax } = useMemo(() => {
    const languages = new Set<string>();
    const genres = new Set<string>();
    let min = Infinity;
    let max = -Infinity;

    movies.forEach((m) => {
      if (m.Language) languages.add(m.Language);
      if (m.Genres) {
        m.Genres.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) genres.add(trimmed);
        });
      }
      const y = parseInt(m['Release Year'], 10);
      if (!isNaN(y)) {
        if (y < min) min = y;
        if (y > max) max = y;
      }
    });

    return {
      languageOptions: [...languages].sort((a, b) => getLanguageName(a).localeCompare(getLanguageName(b))).map((l) => ({ label: getLanguageName(l), value: l })),
      genreOptions: [...genres].sort().map((g) => ({ label: g, value: g })),
      yearMin: isFinite(min) ? min : 1900,
      yearMax: isFinite(max) ? max : new Date().getFullYear(),
    };
  }, [movies]);

  const isFiltered =
    filters.search !== '' ||
    filters.languages.length > 0 ||
    filters.genres.length > 0 ||
    filters.yearRange !== null ||
    filters.voteRange !== null;

  const handleReset = () => {
    onChange({ search: '', languages: [], genres: [], yearRange: null, voteRange: null });
  };

  const panelContent = (
    <Row gutter={[16, 16]} align="middle">
      <Col xs={24} sm={12} lg={6}>
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
          options={genreOptions}
          value={filters.genres}
          onChange={(val) => onChange({ ...filters, genres: val })}
          style={{ width: '100%' }}
          maxTagCount="responsive"
          allowClear
        />
      </Col>

      <Col xs={24} sm={12} lg={4}>
        <div style={{ paddingLeft: 8 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>
            Release Year
          </div>
          <Slider
            range
            min={yearMin}
            max={yearMax}
            value={filters.yearRange ?? [yearMin, yearMax]}
            onChange={(val) => onChange({ ...filters, yearRange: val as [number, number] })}
            tooltip={{ formatter: (v) => v }}
          />
        </div>
      </Col>

      <Col xs={24} sm={12} lg={3}>
        <div style={{ paddingLeft: 8 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>
            Vote Average
          </div>
          <Slider
            range
            min={0}
            max={10}
            step={0.1}
            value={filters.voteRange ?? [0, 10]}
            onChange={(val) => onChange({ ...filters, voteRange: val as [number, number] })}
            tooltip={{ formatter: (v) => v?.toFixed(1) }}
          />
        </div>
      </Col>

      <Col xs={24} sm={12} lg={1}>
        <Space>
          {isFiltered && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleReset}
              size="small"
              title="Clear all filters"
            />
          )}
        </Space>
      </Col>
    </Row>
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
