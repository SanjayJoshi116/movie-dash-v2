// Coverage for openspec/specs/catalog-persistence/spec.md — one describe per requirement.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  startServer, request, postJson, readCsvRows, deferred, stubTmdb, axiosError, tmdbDetails,
  csvRow, type TestServer,
} from './helpers';

type MovieJson = Record<string, string>;

const servers: TestServer[] = [];
async function start(...args: Parameters<typeof startServer>): Promise<TestServer> {
  const s = await startServer(...args);
  servers.push(s);
  return s;
}
after(async () => { await Promise.all(servers.map((s) => s.close())); });

const importOpts = (tmdb = stubTmdb()) => ({ tmdbApiKey: 'k', tmdb });
const ids = async (s: TestServer) => (await readCsvRows(s.csvPath)).map((r) => r['Movie ID']);

describe('Catalogue reads reflect the latest committed write', () => {
  it('refetch after import includes the movie; after delete omits it', async () => {
    const s = await start(importOpts());
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 })).status, 201);
    let list = await request<MovieJson[]>(s.baseUrl, '/api/movies');
    assert.ok(list.body.some((m) => m['Movie ID'] === '603'));
    assert.equal((await request(s.baseUrl, '/api/movies/603', { method: 'DELETE' })).status, 200);
    list = await request<MovieJson[]>(s.baseUrl, '/api/movies');
    assert.ok(!list.body.some((m) => m['Movie ID'] === '603'));
  });

  it('requires revalidation: no-cache + ETag, 304 when unchanged, new ETag after a write', async () => {
    const s = await start();
    const first = await request(s.baseUrl, '/api/movies');
    assert.equal(first.headers.get('cache-control'), 'no-cache');
    const etag = first.headers.get('etag');
    assert.ok(etag);
    const notModified = await fetch(s.baseUrl + '/api/movies', { headers: { 'If-None-Match': etag } });
    assert.equal(notModified.status, 304);
    await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' });
    const afterWrite = await fetch(s.baseUrl + '/api/movies', { headers: { 'If-None-Match': etag } });
    assert.equal(afterWrite.status, 200);
    assert.notEqual(afterWrite.headers.get('etag'), etag);
  });
});

describe('Mutations are serialized and atomic', () => {
  it('concurrent deletes both succeed and the file contains neither', async () => {
    const s = await start();
    const [a, b, c] = await Promise.all(['2', '3', '4'].map((id) => request(s.baseUrl, `/api/movies/${id}`, { method: 'DELETE' })));
    assert.deepEqual([a.status, b.status, c.status], [200, 200, 200]);
    assert.deepEqual(await ids(s), ['1', '5']);
    assert.deepEqual(fs.readdirSync(s.dir).filter((f) => f.endsWith('.tmp')), []);
  });

  it('import during delete: after restart the import is present and the delete absent', async () => {
    const s = await start(importOpts(stubTmdb({}, 20)));
    const [imp, del] = await Promise.all([
      postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 }),
      request(s.baseUrl, '/api/movies/2', { method: 'DELETE' }),
    ]);
    assert.equal(imp.status, 201);
    assert.equal(del.status, 200);
    const restarted = await start({ dir: s.dir });
    const list = await request<MovieJson[]>(restarted.baseUrl, '/api/movies');
    const listed = list.body.map((m) => m['Movie ID']);
    assert.ok(listed.includes('603'));
    assert.ok(!listed.includes('2'));
  });

  it('a failed write leaves the file and the served catalogue unchanged', async () => {
    const s = await start(importOpts());
    const before = fs.readFileSync(s.csvPath, 'utf8');
    const listBefore = (await request<MovieJson[]>(s.baseUrl, '/api/movies')).body;
    // Read-only file blocks append everywhere and blocks the rename on Windows; a read-only
    // directory blocks creating the temp file on POSIX. Together: every write fails.
    fs.chmodSync(s.csvPath, 0o444);
    if (process.platform !== 'win32') fs.chmodSync(s.dir, 0o555);
    try {
      const del = await request<{ error: string }>(s.baseUrl, '/api/movies/1', { method: 'DELETE' });
      assert.equal(del.status, 500);
      const imp = await postJson<{ error: string }>(s.baseUrl, '/api/tmdb/import', { movieId: 603 });
      assert.equal(imp.status, 500);
      assert.equal(imp.body.error, 'Failed to save movie');
      assert.equal(fs.readFileSync(s.csvPath, 'utf8'), before);
      assert.deepEqual((await request<MovieJson[]>(s.baseUrl, '/api/movies')).body, listBefore);
    } finally {
      if (process.platform !== 'win32') fs.chmodSync(s.dir, 0o755);
      fs.chmodSync(s.csvPath, 0o644);
    }
  });
});

describe('Duplicate imports are rejected', () => {
  it('double-click import of one id stores exactly one row; the other gets 409', async () => {
    const s = await start(importOpts(stubTmdb({}, 30)));
    const results = await Promise.all([
      postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 }),
      postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await ids(s)).filter((id) => id === '603').length, 1);
  });

  it('importing an id already in the catalogue is a 409 with no TMDB calls', async () => {
    const tmdb = stubTmdb();
    const s = await start(importOpts(tmdb));
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 1 })).status, 409);
    assert.equal(tmdb.calls.length, 0);
  });

  it('a duplicate written externally while TMDB is being fetched is caught inside the queue', async () => {
    const gate = deferred();
    const tmdb = stubTmdb({ '/movie/777': async () => { await gate.promise; return tmdbDetails(777); } });
    const s = await start(importOpts(tmdb));
    const pending = postJson(s.baseUrl, '/api/tmdb/import', { movieId: 777 });
    await new Promise((r) => setTimeout(r, 30));
    fs.appendFileSync(s.csvPath, csvRow('777', 'Added Externally') + '\n');
    gate.resolve();
    assert.equal((await pending).status, 409);
    assert.equal((await ids(s)).filter((id) => id === '777').length, 1);
  });
});

describe('External edits to the catalogue file are preserved', () => {
  it('row added by an external tool survives an in-app delete', async () => {
    const s = await start();
    fs.appendFileSync(s.csvPath, csvRow('99', 'External') + '\n');
    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 200);
    assert.ok((await ids(s)).includes('99'));
  });

  it('column added by an external tool: an in-app import aligns to the new header', async () => {
    const s = await start(importOpts());
    const content = fs.readFileSync(s.csvPath, 'utf8').trimEnd().split('\n');
    fs.writeFileSync(s.csvPath, [content[0] + ',Extra Col', ...content.slice(1).map((l) => l + ',x')].join('\n') + '\n');
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 })).status, 201);
    const rows = await readCsvRows(s.csvPath);
    const imported = rows.find((r) => r['Movie ID'] === '603');
    assert.ok(imported);
    assert.equal(imported['Name'], 'Movie 603');
    assert.equal(imported['Release Date'], '2021-05-01');
    assert.equal(imported['Extra Col'], '');
    assert.ok(rows.filter((r) => r['Movie ID'] !== '603').every((r) => r['Extra Col'] === 'x'));
  });
});

describe('Mutations wait for the catalogue to load', () => {
  it('import before the initial load completes gets 503 and writes nothing', async () => {
    const gate = deferred();
    const s = await start({ ...importOpts(), onBeforeLoad: () => gate.promise, waitForReady: false });
    const before = fs.readFileSync(s.csvPath, 'utf8');
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 })).status, 503);
    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 503);
    assert.equal(fs.readFileSync(s.csvPath, 'utf8'), before);
    gate.resolve();
    await s.ready;
  });

  it('refuses to append to a non-empty file whose header could not be read', async () => {
    const s = await start(importOpts());
    // Non-empty but no header line (e.g. a file left with only blank lines): the import must not
    // guess a column order and append into it.
    fs.writeFileSync(s.csvPath, '\n\n');
    const res = await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 });
    assert.equal(res.status, 500);
    assert.equal(fs.readFileSync(s.csvPath, 'utf8'), '\n\n');
  });
});

describe('Common hand-edited file shapes are tolerated', () => {
  it('BOM-prefixed file: ids resolve for get and delete', async () => {
    const s = await start({ fixture: 'bom' });
    const list = await request<MovieJson[]>(s.baseUrl, '/api/movies');
    assert.deepEqual(list.body.map((m) => m['Movie ID']), ['1', '2']);
    assert.equal((await request(s.baseUrl, '/api/movies/2')).status, 200);
    assert.equal((await request(s.baseUrl, '/api/movies/2', { method: 'DELETE' })).status, 200);
    assert.ok(!fs.readFileSync(s.csvPath, 'utf8').startsWith('\uFEFF'));
  });

  it('no trailing newline: the previous last row is intact and the import is its own row', async () => {
    const s = await start({ fixture: 'noTrailingNewline', ...importOpts() });
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 })).status, 201);
    const rows = await readCsvRows(s.csvPath);
    assert.deepEqual(rows.map((r) => r['Movie ID']), ['1', '2', '603']);
    assert.equal(rows[1]['Release Date'], '2020-01-01');
  });

  it('empty file: an import writes the header first', async () => {
    const s = await start({ fixture: 'empty', ...importOpts() });
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 })).status, 201);
    const rows = await readCsvRows(s.csvPath);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]['Movie ID'], '603');
  });
});

describe('Stored values round-trip faithfully and safely', () => {
  it('escaped values are served unescaped and are not double-escaped by a rewrite', async () => {
    const s = await start({ fixture: 'formulaValues' });
    const names = (await request<MovieJson[]>(s.baseUrl, '/api/movies')).body.map((m) => m.Name);
    assert.deepEqual(names, ['+1', '-Ism', 'Plain']);
    assert.equal((await request(s.baseUrl, '/api/movies/3', { method: 'DELETE' })).status, 200);
    const stored = (await readCsvRows(s.csvPath)).map((r) => r.Name);
    assert.deepEqual(stored, ["'+1", "'-Ism"]);
  });

  it('an imported formula-like title is stored escaped and served as entered', async () => {
    const s = await start(importOpts(stubTmdb({ '/movie/42': tmdbDetails(42, { title: '=HYPERLINK("x")' }) })));
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 42 })).status, 201);
    const stored = (await readCsvRows(s.csvPath)).find((r) => r['Movie ID'] === '42');
    assert.equal(stored?.Name, `'=HYPERLINK("x")`);
    const served = (await request<MovieJson>(s.baseUrl, '/api/movies/42')).body;
    assert.equal(served.Name, '=HYPERLINK("x")');
  });
});

describe('Errors are reported accurately', () => {
  it('unknown TMDB id → 404', async () => {
    const s = await start(importOpts(stubTmdb({ '/movie/999': axiosError(404) })));
    const res = await postJson<{ error: string }>(s.baseUrl, '/api/tmdb/import', { movieId: 999 });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Movie not found on TMDB');
  });

  it('other TMDB failure → 502', async () => {
    const s = await start(importOpts(stubTmdb({ '/movie/5000': axiosError(500) })));
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 5000 })).status, 502);
  });

  it('oversized body → 413, malformed JSON → 400', async () => {
    const s = await start(importOpts());
    const big = await postJson(s.baseUrl, '/api/tmdb/import', { pad: 'a'.repeat(20000) });
    assert.equal(big.status, 413);
    const bad = await request(s.baseUrl, '/api/tmdb/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
    assert.equal(bad.status, 400);
  });

  it('invalid movieId → 400', async () => {
    const s = await start(importOpts());
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 'abc' })).status, 400);
  });
});
