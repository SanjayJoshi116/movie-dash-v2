import React from 'react';
import { Tag, Button } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import type { FilterState } from '../types/movie';
import { buildFilterChips } from '../utils/filterChips';

interface ActiveFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClearAll: () => void;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({ filters, onChange, onClearAll }) => {
  const chips = buildFilterChips(filters, onChange);
  if (chips.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {chips.map((chip) => (
        <Tag key={chip.key} closable onClose={chip.onClose} color="blue">
          {chip.label}
        </Tag>
      ))}
      <Button
        icon={<ClearOutlined />}
        onClick={onClearAll}
        size="small"
        type="text"
        title="Clear all filters"
      >
        Clear all
      </Button>
    </div>
  );
};

export default ActiveFilters;
