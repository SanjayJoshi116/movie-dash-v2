import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRevenue } from '../../src/utils/statsHelpers';

test('formatRevenue: zero is a real $0', () => {
  assert.equal(formatRevenue(0), '$0');
});

test('formatRevenue: negatives get a leading minus', () => {
  assert.equal(formatRevenue(-5), '-$5');
  assert.equal(formatRevenue(-2_500_000), '-$2.5M');
});

test('formatRevenue: only non-finite values are N/A', () => {
  assert.equal(formatRevenue(NaN), 'N/A');
  assert.equal(formatRevenue(Infinity), 'N/A');
  assert.equal(formatRevenue(-Infinity), 'N/A');
});

test('formatRevenue: plain amounts below 1000', () => {
  assert.equal(formatRevenue(999), '$999');
});

test('formatRevenue: rounding up to a unit boundary moves to the next unit (B143)', () => {
  assert.equal(formatRevenue(999.6), '$1K');
  assert.equal(formatRevenue(999_600), '$1.0M');
  assert.equal(formatRevenue(999_960_000), '$1.0B');
});

test('formatRevenue: regular unit amounts', () => {
  assert.equal(formatRevenue(1_000_000), '$1.0M');
  assert.equal(formatRevenue(1.5e9), '$1.5B');
  assert.equal(formatRevenue(42_400), '$42K');
});
