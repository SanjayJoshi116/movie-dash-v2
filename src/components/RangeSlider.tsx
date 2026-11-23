import React, { useState } from 'react';
import { Slider } from 'antd';
import type { SliderRangeProps } from 'antd/es/slider';
import { alignToStep } from '../utils/filterSpans';

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
 *
 * A committed bound finer than `step` (e.g. a drill-down's 3.999 on a 0.1-step vote slider) is shown
 * step-aligned, and the slider reports that aligned value on every commit. An end the user didn't
 * move (its new value equals the aligned committed value) keeps its exact committed value instead.
 */
const RangeSlider: React.FC<RangeSliderProps> = ({ value, onCommit, ...rest }) => {
  const { min = 0, max = 100, step = 1 } = rest;
  // Handles can cross (rc-slider's allowCross defaults to true) and values come back sorted, so an
  // untouched bound may arrive at the other index. Match by index first, then the other bound,
  // using each committed bound at most once.
  const keepUntouched = (next: Range): Range => {
    const aligned = value.map((v) => alignToStep(v, min, max, step));
    const used = next.map((n, i) => n === aligned[i]);
    return next.map((n, i) => {
      if (used[i]) return value[i];
      const j = 1 - i;
      if (!used[j] && n === aligned[j]) { used[j] = true; return value[j]; }
      return n;
    }) as Range;
  };
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
      onChangeComplete={(v) => onCommit(keepUntouched(v as Range))}
    />
  );
};

export default RangeSlider;
