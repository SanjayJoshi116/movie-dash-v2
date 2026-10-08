// Coverage for openspec catalog-data-format: legacy "N/A" placeholders read as missing.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer, request, readCsvRows, HEADER, type TestServer } from './helpers';

const servers: TestServer[] = [];
after(async () => { await Promise.all(servers.map((s) => s.close())); });

describe('Legacy placeholder values read as missing', () => {
  it('serves N/A fields as empty, and a later rewrite stores them empty', async () => {
    const s = await startServer({ fixture: 'empty' });
    servers.push(s);
    fs.writeFileSync(s.csvPath, [
      HEADER,
      '1,Has NA,en,N/A,N/A,Drama,N/A,"A, B",Co,India,N/A,N/A,1,7,10,,,N/A',
      '2,Normal,en,100,2020,Drama,Dir,"A, B",Co,India,0,0,1,7,10,,,2020-01-01',
    ].join('\n') + '\n');

    // The list route reloads on file change (get-by-id doesn't), so hit it first.
    const list = (await request<Record<string, string>[]>(s.baseUrl, '/api/movies')).body;
    assert.equal(list.length, 2);
    const movie = (await request<Record<string, string>>(s.baseUrl, '/api/movies/1')).body;
    for (const key of ['Runtime', 'Release Year', 'Director', 'Box Office Revenue', 'Budget', 'Release Date']) {
      assert.equal(movie[key], '', `${key} should read as empty`);
    }
    // "N/A" only matches as a whole value — partial matches are untouched.
    assert.equal(movie['Name'], 'Has NA');

    assert.equal((await request(s.baseUrl, '/api/movies/2', { method: 'DELETE' })).status, 200);
    const [row] = await readCsvRows(s.csvPath);
    assert.equal(row['Director'], '');
    assert.ok(!fs.readFileSync(s.csvPath, 'utf8').includes('N/A'));
  });
});
