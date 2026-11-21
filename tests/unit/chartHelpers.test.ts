import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber } from '../../src/components/Charts/chartHelpers';

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
