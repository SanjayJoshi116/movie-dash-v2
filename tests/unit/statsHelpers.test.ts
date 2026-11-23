import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Movie } from '../../src/types/movie';
import {
  averagesBy,
  splitNames,
  topBy,
  topN,
  bucketToRange,
  continuousYears,
  countIntoBuckets,
  drillableLabelAt,
  groupByField,
  makeDoughnut,
  makePolar,
  parseVote,
  topNWithOther,
  VOTE_MAX,
  VOTE_STEP,
} from '../../src/utils/statsHelpers';
import { RATING_BUCKETS } from '../../src/utils/chartBuckets';

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

test('parseVote: unrated (missing, NaN, ≤ 0) is null; a real vote is its number', () => {
  for (const raw of [undefined, '', 'abc', '0', '0.0', '-1', 'Infinity']) assert.equal(parseVote(raw), null, String(raw));
  assert.equal(parseVote('7.25'), 7.25);
  assert.equal(parseVote('0.001'), 0.001);
});

test('drillableLabelAt: the label at an index unless it is missing, "Other" or "Unknown"', () => {
  const labels = ['Drama', 'Other', 'Unknown', 42];
  assert.equal(drillableLabelAt(labels, 0), 'Drama');
  assert.equal(drillableLabelAt(labels, 1), null);
  assert.equal(drillableLabelAt(labels, 2), null);
  assert.equal(drillableLabelAt(labels, 3), null);
  assert.equal(drillableLabelAt(labels, 9), null);
  assert.equal(drillableLabelAt(undefined, 0), null);
});

test('continuousYears: every year inclusive, empty when either end is null', () => {
  assert.deepEqual(continuousYears(1999, 2002), [1999, 2000, 2001, 2002]);
  assert.deepEqual(continuousYears(2001, 2001), [2001]);
  assert.deepEqual(continuousYears(null, 2001), []);
  assert.deepEqual(continuousYears(2001, null), []);
});

test('splitNames: trims and drops blanks', () => {
  assert.deepEqual(splitNames(' Drama, ,Crime ,'), ['Drama', 'Crime']);
  assert.deepEqual(splitNames(''), []);
  assert.deepEqual(splitNames(undefined), []);
});

test('topN / topBy: largest first, ties keep insertion order', () => {
  assert.deepEqual(topN({ a: 1, b: 3, c: 3, d: 2 }, 3), [['b', 3], ['c', 3], ['d', 2]]);
  assert.deepEqual(topBy({ x: { avg: 1 }, y: { avg: 5 } }, 1, (v) => v.avg), [['y', { avg: 5 }]]);
});

test('averagesBy: a movie counts toward every key; null values are skipped', () => {
  const movies = [
    movie({ Genres: 'Drama, Crime', 'Vote Average': '8' }),
    movie({ Genres: 'Drama', 'Vote Average': '6' }),
    movie({ Genres: 'Drama', 'Vote Average': '0' }), // unrated
  ];
  const avgs = averagesBy(movies, (m) => splitNames(m.Genres), (m) => (Number(m['Vote Average']) > 0 ? Number(m['Vote Average']) : null));
  assert.deepEqual(avgs, { Drama: { avg: 7, count: 2 }, Crime: { avg: 8, count: 1 } });
});

test('7 named categories plus Other get 8 distinct colours (doughnut and polar)', () => {
  const data = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`c${i}`, 20 - i]));
  const grouped = topNWithOther(data);
  const n = Object.keys(grouped).length;
  assert.equal(n, 8);
  const doughnut = makeDoughnut(grouped, 'x').datasets[0].backgroundColor as string[];
  assert.equal(new Set(doughnut.slice(0, n)).size, n);
  const polar = makePolar(grouped, 'x').datasets[0].backgroundColor as string[];
  assert.equal(new Set(polar.slice(0, n)).size, n);
});
