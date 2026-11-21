import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLanguageName } from '../../src/utils/languages';

test('getLanguageName: known code', () => {
  assert.equal(getLanguageName('en'), 'English');
});

test('getLanguageName: uppercase code', () => {
  assert.equal(getLanguageName('EN'), 'English');
});

test('getLanguageName: unknown code is returned as-is', () => {
  assert.equal(getLanguageName('qq'), 'qq');
});

test('getLanguageName: inherited Object.prototype keys are not languages (B151)', () => {
  assert.equal(getLanguageName('constructor'), 'constructor');
  assert.equal(getLanguageName('toString'), 'toString');
});
