import React from 'react';
import { Tag, Button } from 'antd';
import { ClearOutlined, CloseOutlined } from '@ant-design/icons';
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
      {/* A named list of chips, each with a real remove button: Ant's own Tag close icon is
          tabIndex=-1 and every one is named "Close" (B28). */}
      <div role="list" aria-label="Active filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {chips.map((chip) => (
          <Tag key={chip.key} role="listitem" color="blue">
            {chip.label}
            <button
              type="button"
              className="chip-remove-button"
              aria-label={`Remove ${chip.label}`}
              title={`Remove ${chip.label}`}
              onClick={chip.onClose}
            >
              <CloseOutlined aria-hidden="true" />
            </button>
          </Tag>
        ))}
      </div>
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
