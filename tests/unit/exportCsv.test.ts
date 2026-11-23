import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moviesToCsv } from '../../src/utils/exportCsv';
import { CATALOGUE_COLUMNS, type Movie } from '../../src/types/movie';

/** Splits one CSV line, honouring double-quoted fields (with "" escapes). */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cells.push(cell); cell = ''; }
    else cell += ch;
  }
  cells.push(cell);
  return cells;
}

const rows = (csv: string) => {
  const [header, ...body] = csv.split('\n').map(splitCsvLine);
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i]])));
};

test('moviesToCsv: columns come from every row, not only the first', () => {
  // Raw rows (no normalizeMovie): the first lacks Poster URL, only the second has an extra column.
  const first = { 'Movie ID': '1', Name: 'Plain, with a comma' } as unknown as Movie;
  const second = { 'Movie ID': '2', Name: 'Has poster', 'Poster URL': 'https://img/p.jpg', Collection: 'Saga' } as unknown as Movie;
  const csv = moviesToCsv([first, second]);
  const header = splitCsvLine(csv.split('\n')[0]);
  assert.deepEqual(header, [...CATALOGUE_COLUMNS, 'Collection']);
  const [r1, r2] = rows(csv);
  assert.equal(r1.Name, 'Plain, with a comma');
  assert.equal(r1['Poster URL'], '');
  assert.equal(r1.Collection, '');
  assert.equal(r2['Poster URL'], 'https://img/p.jpg');
  assert.equal(r2.Collection, 'Saga');
});

test('moviesToCsv: header names get the formula guard too', () => {
  const csv = moviesToCsv([{ 'Movie ID': '1', '=HYPERLINK': 'x' } as unknown as Movie]);
  assert.ok(splitCsvLine(csv.split('\n')[0]).includes("'=HYPERLINK"));
});
