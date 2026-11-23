import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignToStep, clampRange, computeFilterSpans, niceStep } from '../../src/utils/filterSpans';
import type { Movie } from '../../src/types/movie';

test('alignToStep: matches rc-slider alignment (B117)', () => {
  assert.equal(alignToStep(3.999, 0, 10, 0.1), 4);
  assert.equal(alignToStep(2, 0, 10, 0.1), 2);
  assert.equal(alignToStep(2.04, 0, 10, 0.1), 2);
  assert.equal(alignToStep(0.30000000000000004, 0, 10, 0.1), 0.3);
  // min and max are always allowed, even off the step grid
  assert.equal(alignToStep(99, 3, 100, 10), 100);
  assert.equal(alignToStep(-5, 0, 10, 1), 0);
  assert.equal(alignToStep(7, 0, 10, null), 7);
});

test('niceStep: 1/2/5 × 10^k, at least 1 (B118)', () => {
  assert.equal(niceStep(27_990_000), 20_000_000);
  assert.equal(niceStep(55), 50);
  assert.equal(niceStep(10), 10);
  assert.equal(niceStep(0.4), 1);
  assert.equal(niceStep(NaN), 1);
});

test('computeFilterSpans: runtime ≤ 0 is unknown (B119)', () => {
  const movies = [{ Runtime: '0' }, { Runtime: '85' }, { Runtime: '130' }] as Movie[];
  const spans = computeFilterSpans(movies);
  assert.equal(spans.runtimeMin, 85);
  assert.equal(spans.runtimeMax, 130);
});

test('clampRange: clamps into the span, full span → null, no overlap kept (Movies) or reset (Stats)', () => {
  const r: [number, number] = [1990, 2000];
  assert.equal(clampRange(r, 1980, 2020), r); // unchanged → same object
  assert.deepEqual(clampRange([1970, 2000], 1980, 2020), [1980, 2000]);
  assert.equal(clampRange([1970, 2030], 1980, 2020), null);
  const apart: [number, number] = [1900, 1910];
  assert.equal(clampRange(apart, 1980, 2020), apart);
  assert.equal(clampRange(apart, 1980, 2020, true), null);
  assert.equal(clampRange(null, 1980, 2020), null);
});
