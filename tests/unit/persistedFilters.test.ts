import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilters } from '../../src/hooks/usePersistedFilters';
import { clampFiltersToSpans, type FilterSpans } from '../../src/utils/filterSpans';
import { DEFAULT_FILTERS, type FilterState } from '../../src/types/movie';

const DEFAULTS = DEFAULT_FILTERS;

const SPANS: FilterSpans = { yearMin: 1990, yearMax: 2020, runtimeMin: 60, runtimeMax: 200, revenueMin: 1000, revenueMax: 5000 };

test('sanitizeFilters: non-objects fall back to the defaults', () => {
  for (const raw of [null, undefined, 'x', 42, true]) {
    assert.equal(sanitizeFilters(raw, DEFAULTS), DEFAULTS);
  }
});

test('sanitizeFilters: valid fields are kept', () => {
  const saved: FilterState = {
    search: 'nolan',
    languages: ['en'],
    genres: ['Drama'],
    directors: ['Christopher Nolan'],
    yearRange: [2000, 2010],
    voteRange: [7, 10],
    runtimeRange: null,
    revenueRange: [1, 2],
  };
  assert.deepEqual(sanitizeFilters(saved, DEFAULTS), saved);
});

test('sanitizeFilters: each bad field falls back on its own', () => {
  const result = sanitizeFilters({
    search: 5,
    languages: ['en', 3],
    genres: null,
    directors: 'Nolan',
    yearRange: [2010, 2000], // reversed
    voteRange: [1, Number.NaN],
    runtimeRange: [90],
    revenueRange: [1, 2],
  }, DEFAULTS);
  assert.deepEqual(result, { ...DEFAULTS, revenueRange: [1, 2] });
});

test('sanitizeFilters: missing fields take the defaults', () => {
  assert.deepEqual(sanitizeFilters({ search: 'x' }, DEFAULTS), { ...DEFAULTS, search: 'x' });
});

test('clampFiltersToSpans: nothing to clamp returns the same object', () => {
  const filters = { ...DEFAULTS, yearRange: [2000, 2010] as [number, number] };
  assert.equal(clampFiltersToSpans(filters, SPANS), filters);
  assert.equal(clampFiltersToSpans(DEFAULTS, SPANS), DEFAULTS);
});

test('clampFiltersToSpans: partly outside ranges are clamped, full-span ones dropped', () => {
  const result = clampFiltersToSpans({
    ...DEFAULTS,
    yearRange: [1980, 2000],
    runtimeRange: [0, 999],
    revenueRange: [2000, 9000],
  }, SPANS);
  assert.deepEqual(result.yearRange, [1990, 2000]);
  assert.equal(result.runtimeRange, null);
  assert.deepEqual(result.revenueRange, [2000, 5000]);
});

test('clampFiltersToSpans: a range with no overlap stays (its chip stays visible)', () => {
  const result = clampFiltersToSpans({ ...DEFAULTS, yearRange: [1950, 1960] }, SPANS);
  assert.deepEqual(result.yearRange, [1950, 1960]);
});

test('clampFiltersToSpans: vote ranges are never clamped', () => {
  const filters = { ...DEFAULTS, voteRange: [2, 3.999] as [number, number] };
  assert.equal(clampFiltersToSpans(filters, SPANS), filters);
});
