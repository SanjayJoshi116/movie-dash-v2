import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Movie } from '../../src/types/movie';
import {
  bucketToRange,
  countIntoBuckets,
  groupByField,
  topNWithOther,
  VOTE_MAX,
  VOTE_STEP,
  type Bucket,
} from '../../src/utils/statsHelpers';

const movie = (fields: Partial<Movie>): Movie => ({
  'Movie ID': '1', 'Name': 'M', 'Language': 'en', 'Runtime': '', 'Release Year': '', 'Genres': '',
  'Director': '', 'Actors/Actresses': '', 'Production Company': '', 'Production Country': '',
  'Box Office Revenue': '', 'Budget': '', 'Popularity Score': '', 'Vote Average': '', 'Vote Count': '',
  'Release Date': '', ...fields,
});

test('groupByField: multi-valued fields count once per listed value, blanks skipped', () => {
  const movies = [
    movie({ 'Production Country': 'United Kingdom, United States of America' }),
    movie({ 'Production Country': 'United States of America' }),
    movie({ 'Production Country': '' }),
    movie({ 'Production Country': 'France, ' }),
  ];
  assert.deepEqual(groupByField(movies, 'Production Country'), {
    'United Kingdom': 1,
    'United States of America': 2,
    France: 1,
  });
});

test('groupByField: single-valued blank becomes "Unknown"', () => {
  const movies = [movie({ Director: 'A' }), movie({ Director: 'A' }), movie({ Director: '' })];
  assert.deepEqual(groupByField(movies, 'Director'), { A: 2, Unknown: 1 });
});

test('topNWithOther: keeps 7 named categories and folds the rest into Other', () => {
  const data = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`c${i}`, 100 - i]));
  const result = topNWithOther(data);
  assert.deepEqual(Object.keys(result), ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'Other']);
  assert.equal(result.Other, 93 + 92 + 91);
});

test('topNWithOther: no Other when everything fits', () => {
  assert.deepEqual(topNWithOther({ a: 2, b: 1 }), { a: 2, b: 1 });
});

const RATING_BUCKETS: Bucket[] = [
  { label: '0–2', min: 0, maxExclusive: 2 },
  { label: '2–4', min: 2, maxExclusive: 4 },
  { label: '4–6', min: 4, maxExclusive: 6 },
  { label: '6–8', min: 6, maxExclusive: 8 },
  { label: '8–10', min: 8, maxExclusive: Infinity },
];

test('countIntoBuckets: half-open buckets, 4.0 counts in "4–6", last bucket is open', () => {
  assert.deepEqual(countIntoBuckets([0, 1.999, 2, 3.999, 4, 5.5, 8, 10], RATING_BUCKETS), [2, 2, 2, 0, 2]);
});

test('bucketToRange: half-open bucket → inclusive filter range', () => {
  assert.deepEqual(bucketToRange(RATING_BUCKETS[1], VOTE_STEP, VOTE_MAX), [2, 3.999]);
  assert.deepEqual(bucketToRange({ label: '60–90', min: 60, maxExclusive: 90 }, 1, 240), [60, 89]);
});

test('bucketToRange: open-ended bucket runs to the domain max', () => {
  assert.deepEqual(bucketToRange(RATING_BUCKETS[4], VOTE_STEP, VOTE_MAX), [8, 10]);
});
