import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldForSearch, matchesSearch } from '../../src/utils/search';

test('foldForSearch: strips accents and case', () => {
  assert.equal(foldForSearch('Amélie'), 'amelie');
  assert.equal(foldForSearch('Ñandú São Paulo'), 'nandu sao paulo');
});

test('foldForSearch: letters without a decomposition are kept', () => {
  assert.equal(foldForSearch('Søren Straße'), 'søren straße');
});

test('matchesSearch: accent-insensitive both ways', () => {
  assert.equal(matchesSearch({ Name: 'Amélie' }, 'amelie'), true);
  assert.equal(matchesSearch({ Name: 'Amelie' }, 'Amélie'), true);
  assert.equal(matchesSearch({ Director: 'Jean-Pierre Jeunet' }, 'jeunét'), true);
});

test('matchesSearch: trims, blank matches everything, misses stay misses', () => {
  assert.equal(matchesSearch({ Name: 'Heat' }, '  heat '), true);
  assert.equal(matchesSearch({ Name: 'Heat' }, '   '), true);
  assert.equal(matchesSearch({ Name: 'Heat' }, 'cold'), false);
});

test('matchesSearch: language display name, accent-folded', () => {
  assert.equal(matchesSearch({ Language: 'fr' }, 'french'), true);
});
