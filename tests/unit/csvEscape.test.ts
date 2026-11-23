import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvField, sanitizeCsvValue, unsanitizeCsvValue } from '../../src/utils/csvEscape';

// [raw value, stored (sanitized) form]. tests/python/test_catalogue_io.py checks the Python
// writer's prefix list against this file's source, so both writers apply one rule.
const CASES: [string, string][] = [
  ['=SUM(A1)', "'=SUM(A1)"],
  ['+1', "'+1"],
  ['-ism', "'-ism"],
  ['@user', "'@user"],
  ['\t=HYPERLINK("x")', "'\t=HYPERLINK(\"x\")"],
  ['\r=1', "'\r=1"],
  ["'-ism", "''-ism"],
  ["it's", "it's"],
  ["'plain", "'plain"],
  ['Alien', 'Alien'],
  ['', ''],
];

test('sanitizeCsvValue: formula prefixes (tab and CR included) get one leading apostrophe', () => {
  for (const [raw, stored] of CASES) assert.equal(sanitizeCsvValue(raw), stored, JSON.stringify(raw));
});

test('unsanitizeCsvValue: drops exactly the guard apostrophe', () => {
  for (const [raw, stored] of CASES) assert.equal(unsanitizeCsvValue(stored), raw, JSON.stringify(stored));
});

test('round trip: unsanitize(sanitize(x)) === x, and sanitizing twice after a read adds nothing', () => {
  for (const [raw] of CASES) {
    const stored = sanitizeCsvValue(raw);
    assert.equal(unsanitizeCsvValue(stored), raw, JSON.stringify(raw));
    assert.equal(sanitizeCsvValue(unsanitizeCsvValue(stored)), stored, JSON.stringify(raw));
  }
});

test('escapeCsvField: quotes on comma, quote, CR or LF and doubles quotes; leaves plain text alone', () => {
  assert.equal(escapeCsvField('Alien'), 'Alien');
  assert.equal(escapeCsvField('a,b'), '"a,b"');
  assert.equal(escapeCsvField('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvField('line\nbreak'), '"line\nbreak"');
  assert.equal(escapeCsvField("'\r=1"), "\"'\r=1\"");
});
