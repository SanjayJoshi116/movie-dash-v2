import React, { useState } from 'react';
import { Slider } from 'antd';
import type { SliderRangeProps } from 'antd/es/slider';

type Range = [number, number];

interface RangeSliderProps extends Omit<SliderRangeProps, 'range' | 'value' | 'defaultValue' | 'onChange' | 'onChangeComplete'> {
  /** The committed range (what the filter currently uses). */
  value: Range;
  /** Called once when the user releases the handle (or per keyboard step) — not on every drag tick. */
  onCommit: (value: Range) => void;
}

/**
 * Range slider that shows its value live while dragging but only commits on release, so a drag
 * across 20 years refilters (and re-persists) once instead of on every tick.
 */
const RangeSlider: React.FC<RangeSliderProps> = ({ value, onCommit, ...rest }) => {
  const [draft, setDraft] = useState<Range>(value);
  // Committed value changed from outside (chip removed, "Clear all", drill-down) — resync the
  // draft. Render-phase prev-value pattern, not an effect (see App.tsx / CLAUDE.md).
  const [prevValue, setPrevValue] = useState<Range>(value);
  if (value[0] !== prevValue[0] || value[1] !== prevValue[1]) {
    setPrevValue(value);
    setDraft(value);
  }

  return (
    <Slider
      {...rest}
      range
      value={draft}
      onChange={(v) => setDraft(v as Range)}
      onChangeComplete={(v) => onCommit(v as Range)}
    />
  );
};

export default RangeSlider;
