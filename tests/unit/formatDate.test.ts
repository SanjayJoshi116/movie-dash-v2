import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDateDDMMYYYY } from '../../src/utils/formatDate';

test('formatDateDDMMYYYY: YYYY-MM-DD → DD-MM-YYYY', () => {
  assert.equal(formatDateDDMMYYYY('2020-05-12'), '12-05-2020');
});

test('formatDateDDMMYYYY: other shapes are returned unchanged (B148)', () => {
  assert.equal(formatDateDDMMYYYY('2020-05-12T00:00:00Z'), '2020-05-12T00:00:00Z');
  assert.equal(formatDateDDMMYYYY('2020-5-1'), '2020-5-1');
});

test('formatDateDDMMYYYY: empty and missing values', () => {
  assert.equal(formatDateDDMMYYYY(''), '');
  assert.equal(formatDateDDMMYYYY(undefined), '');
  assert.equal(formatDateDDMMYYYY('   '), '');
  assert.equal(formatDateDDMMYYYY(' 2020-05-12 '), '12-05-2020');
});
