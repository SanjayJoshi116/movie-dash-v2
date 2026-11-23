import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActiveElement, ChartEvent } from 'chart.js';
import { clickHandlers, formatNumber, NOT_CLICKABLE } from '../../src/components/Charts/chartHelpers';

test('formatNumber: integers print without decimals (B26)', () => {
  assert.equal(formatNumber(23), (23).toLocaleString());
  assert.equal(formatNumber(1234), (1234).toLocaleString());
});

test('formatNumber: other numbers keep at most 2 decimals', () => {
  assert.equal(formatNumber(7.5), (7.5).toLocaleString());
  assert.equal(formatNumber(8.519), (8.52).toLocaleString());
});

test('formatNumber: missing or non-numeric values show a dash instead of throwing', () => {
  assert.equal(formatNumber(null), '—');
  assert.equal(formatNumber(undefined), '—');
  assert.equal(formatNumber(NaN), '—');
  assert.equal(formatNumber('12'), '—');
});

// A stand-in canvas: only style.setProperty('cursor', …) is used.
const fakeHover = () => {
  const style = { cursor: 'pointer', setProperty(_: string, v: string) { style.cursor = v; } };
  return { style, evt: { native: { target: { style } } } as unknown as ChartEvent };
};

test('NOT_CLICKABLE.onHover clears a pointer cursor left by an earlier clickable state (B183)', () => {
  const { style, evt } = fakeHover();
  NOT_CLICKABLE.onHover(evt);
  assert.equal(style.cursor, '');
});

test('clickHandlers.onHover: pointer over a clickable element, default elsewhere', () => {
  const handlers = clickHandlers({ current: { onElementClick: () => {}, isClickable: (i) => i !== 1 } });
  const { style, evt } = fakeHover();
  handlers.onHover(evt, [{ index: 0 }] as unknown as ActiveElement[]);
  assert.equal(style.cursor, 'pointer');
  handlers.onHover(evt, [{ index: 1 }] as unknown as ActiveElement[]);
  assert.equal(style.cursor, 'default');
});
