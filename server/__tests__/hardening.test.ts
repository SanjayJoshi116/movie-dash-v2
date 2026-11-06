// Coverage for the harden-catalogue-server change (archived 2026-11-04): server-resilience (secret-free logs, no
// crash on handler errors) and the catalog-persistence additions (duplicate headers, boot-scoped
// ETag, delete vs. external writes, transient rename locks, non-fatal post-write stat, fresh reads).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import util from 'node:util';
import type axios from 'axios';
import { createTmdbClient, TmdbRequestError, tmdbErrorStatus } from '../tmdb';
import type { FsHooks } from '../app';
import {
  serverPool, request, postJson, readCsvRows, deferred, stubTmdb, tmdbDetails, csvRow, HEADER,
  errnoError, sleep, type TestServer,
} from './helpers';

type MovieJson = Record<string, string>;

const start = serverPool();

const SECRET = 'SECRET-TMDB-KEY-123';
const ids = async (s: TestServer) => (await readCsvRows(s.csvPath)).map((r) => r['Movie ID']);

/**
 * An axios-shaped error carrying the key everywhere a real AxiosError does (config.params, the
 * request path/header, the response's request) — what util.inspect used to print into the logs.
 */
function leakyAxiosError(status?: number): Error {
  const url = `https://api.themoviedb.org/3/x?api_key=${SECRET}`;
  const request = { path: `/3/x?api_key=${SECRET}`, _header: `GET /3/x?api_key=${SECRET} HTTP/1.1` };
  return Object.assign(new Error(status ? `Request failed with status code ${status}` : 'socket hang up'), {
    isAxiosError: true,
    code: status ? 'ERR_BAD_RESPONSE' : 'ECONNRESET',
    config: { url, params: { api_key: SECRET } },
    request,
    ...(status ? { response: { status, request, config: { params: { api_key: SECRET } } } } : {}),
  });
}

/** The real TMDB client over a fake HTTP layer that always fails with a leaky error. */
function failingRealClient(status?: number) {
  const httpGet = (async () => { throw leakyAxiosError(status); }) as unknown as typeof axios.get;
  return createTmdbClient({ apiKey: SECRET, httpGet, sleep: async () => undefined });
}

const logged = (s: TestServer) => s.errors.map((args) => args.map((a) => util.inspect(a, { depth: 10 })).join(' ')).join('\n');

// ── server-resilience ──────────────────────────────────────────────────────

describe('TMDB credentials never appear in server logs', () => {
  it('the client throws a redacted error that keeps the status', async () => {
    for (const status of [undefined, 404, 500]) {
      const err = await failingRealClient(status).get('/movie/1').then(() => null, (e: unknown) => e);
      assert.ok(err instanceof TmdbRequestError);
      assert.equal(tmdbErrorStatus(err), status);
      assert.ok(!util.inspect(err, { depth: 10, showHidden: true }).includes(SECRET));
    }
  });

  it('TMDB outage during search: 502, key not logged', async () => {
    const s = await start({ tmdbApiKey: SECRET, tmdb: failingRealClient() });
    assert.equal((await request(s.baseUrl, '/api/tmdb/search?query=x')).status, 502);
    assert.ok(s.errors.length > 0);
    assert.ok(!logged(s).includes(SECRET));
  });

  it('TMDB 500 during import: 502, key not logged', async () => {
    const s = await start({ tmdbApiKey: SECRET, tmdb: failingRealClient(500) });
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 77 })).status, 502);
    assert.ok(s.errors.length > 0);
    assert.ok(!logged(s).includes(SECRET));
  });

  it('TMDB 404 during import is still 404', async () => {
    const s = await start({ tmdbApiKey: SECRET, tmdb: failingRealClient(404) });
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 77 })).status, 404);
  });
});

describe('Request handler failures do not crash the server', () => {
  it('a null TMDB body imports a row of empty values', async () => {
    const s = await start({ tmdbApiKey: 'k', tmdb: stubTmdb({ '/movie/77': null, '/movie/77/credits': null }) });
    const res = await postJson<MovieJson>(s.baseUrl, '/api/tmdb/import', { movieId: 77 });
    assert.equal(res.status, 201);
    assert.equal(res.body.Name, '');
    assert.equal((await request(s.baseUrl, '/api/health')).status, 200);
  });

  it('an unexpected throw in a handler is a generic 500 and the server keeps serving', async () => {
    // A non-array `genres` throws while building the row, outside every route-level catch.
    const s = await start({ tmdbApiKey: 'k', tmdb: stubTmdb({ '/movie/78': tmdbDetails(78, { genres: 'oops' }) }) });
    const res = await postJson<{ error: string }>(s.baseUrl, '/api/tmdb/import', { movieId: 78 });
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: 'Internal server error' });
    assert.equal((await request(s.baseUrl, '/api/health')).status, 200);
    // inFlightImports was released: a retry is a fresh attempt, not a 409.
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 78 })).status, 500);
  });
});

// ── catalog-persistence additions ──────────────────────────────────────────

const DUP_HEADER = HEADER.replace('Release Date', 'Movie ID');

describe('Ambiguous file headers never cause data loss', () => {
  it('refuses delete and import while the header repeats a column, then recovers once repaired', async () => {
    const s = await start({ tmdbApiKey: 'k', tmdb: stubTmdb() });
    const bad = [DUP_HEADER, csvRow('1', 'One'), csvRow('2', 'Two')].join('\n') + '\n';
    fs.writeFileSync(s.csvPath, bad, 'utf8');

    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 500);
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 })).status, 500);
    assert.equal(fs.readFileSync(s.csvPath, 'utf8'), bad);
    assert.ok(s.errors.some((args) => String(args[1]).includes('"Movie ID"')));

    fs.writeFileSync(s.csvPath, [HEADER, csvRow('1', 'One'), csvRow('2', 'Two')].join('\n') + '\n', 'utf8');
    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 200);
    assert.deepEqual(await ids(s), ['2']);
  });

  it('a duplicate header at boot never gets rewritten', async () => {
    const first = await start();
    const bad = [DUP_HEADER, csvRow('1', 'One')].join('\n') + '\n';
    fs.writeFileSync(first.csvPath, bad, 'utf8');
    const s = await start({ dir: first.dir });
    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 500);
    assert.equal(fs.readFileSync(s.csvPath, 'utf8'), bad);
  });
});

// ── harden-server-entry: startup load failures are visible ─────────────────

describe('Startup load failures are visible', () => {
  it('a failed boot load reports an error instead of an empty catalogue, and recovers once fixed', async () => {
    const first = await start();
    fs.writeFileSync(first.csvPath, [DUP_HEADER, csvRow('1', 'One')].join('\n') + '\n', 'utf8');
    const s = await start({ dir: first.dir, tmdbApiKey: 'k', tmdb: stubTmdb() });

    const health = await request<{ status: string }>(s.baseUrl, '/api/health');
    assert.equal(health.body.status, 'error');
    const list = await request<{ error: string }>(s.baseUrl, '/api/movies');
    assert.equal(list.status, 500);
    assert.deepEqual(list.body, { error: 'Catalogue file could not be loaded; see server log' });
    assert.equal((await request(s.baseUrl, '/api/movies/1')).status, 500);
    assert.equal((await request(s.baseUrl, '/api/tmdb/search?query=x')).status, 500);

    fs.writeFileSync(s.csvPath, [HEADER, csvRow('1', 'One'), csvRow('2', 'Two')].join('\n') + '\n', 'utf8');
    const fixed = await request<MovieJson[]>(s.baseUrl, '/api/movies');
    assert.equal(fixed.status, 200);
    assert.deepEqual(fixed.body.map((m) => m['Movie ID']), ['1', '2']);
    assert.equal((await request<{ status: string }>(s.baseUrl, '/api/health')).body.status, 'ok');
  });

  it('a missing file is still an empty catalogue, not an error', async () => {
    const first = await start();
    fs.rmSync(first.csvPath);
    const s = await start({ dir: first.dir });
    assert.equal((await request<{ status: string }>(s.baseUrl, '/api/health')).body.status, 'ok');
    const list = await request<MovieJson[]>(s.baseUrl, '/api/movies');
    assert.equal(list.status, 200);
    assert.deepEqual(list.body, []);
  });
});

describe('drain() waits for in-progress catalogue operations', () => {
  it('resolves only after an in-flight delete has finished writing', async () => {
    const gate = deferred();
    let renamed = false;
    const s = await start({
      fsHooks: { rename: async (a, b) => { await gate.promise; await fs.promises.rename(a, b); renamed = true; } },
    });
    const del = request(s.baseUrl, '/api/movies/1', { method: 'DELETE' });
    // Let the delete reach the gated rename before draining.
    await sleep(50);
    let drained = false;
    const drainDone = s.drain().then(() => { drained = true; });
    await sleep(50);
    assert.equal(drained, false, 'drain must wait for the queued delete');
    gate.resolve();
    await drainDone;
    assert.equal(renamed, true);
    assert.equal((await del).status, 200);
    assert.ok(!(await ids(s)).includes('1'));
  });
});

describe('Catalogue validators are unique across server restarts', () => {
  it('an ETag from an earlier process does not produce a 304', async () => {
    const a = await start();
    const etagA = (await request(a.baseUrl, '/api/movies')).headers.get('etag');
    assert.ok(etagA);
    assert.equal((await request(a.baseUrl, '/api/movies', { headers: { 'if-none-match': etagA } })).status, 304);

    const b = await start({ dir: a.dir });
    const res = await request<MovieJson[]>(b.baseUrl, '/api/movies', { headers: { 'if-none-match': etagA } });
    assert.equal(res.status, 200);
    assert.notEqual(res.headers.get('etag'), etagA);
  });
});

/** fsHooks.stat that runs `onCall(n)` before the n-th stat after `arm()`. */
function armedStat(onCall: (n: number, p: string) => void | Promise<void>) {
  let armed = false;
  let n = 0;
  const stat: FsHooks['stat'] = async (p) => {
    if (armed) await onCall(++n, p);
    return fs.promises.stat(p);
  };
  return { stat, arm: () => { armed = true; n = 0; } };
}

describe('Deletes do not overwrite concurrent external writes', () => {
  it('an append that lands during the rewrite survives the delete', async () => {
    // Delete stats: #1 reloadIfChanged, #2 the pre-rename check. Appending just before #2 is
    // exactly an external write landing after the delete read the file.
    let renames = 0;
    const hooks = armedStat((n, p) => {
      if (n === 2) fs.appendFileSync(p, csvRow('9001', 'External') + '\n');
    });
    const s = await start({
      fsHooks: { stat: hooks.stat, rename: async (a, b) => { renames++; await fs.promises.rename(a, b); } },
    });
    hooks.arm();
    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 200);
    const stored = await ids(s);
    assert.ok(stored.includes('9001'), 'externally appended row kept');
    assert.ok(!stored.includes('1'), 'deleted movie gone');
    assert.equal(renames, 1, 'the stale rewrite was never renamed into place');
  });
});

describe('Transient file locks do not fail mutations', () => {
  const noWait = async () => undefined;
  const tmpFiles = (s: TestServer) => fs.readdirSync(s.dir).filter((f) => f.endsWith('.tmp'));

  it('one EBUSY on rename is retried and the delete succeeds', async () => {
    let calls = 0;
    const s = await start({
      fsHooks: { sleep: noWait, rename: async (a, b) => { if (calls++ === 0) throw errnoError('EBUSY'); await fs.promises.rename(a, b); } },
    });
    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 200);
    assert.equal(calls, 2);
    assert.ok(!(await ids(s)).includes('1'));
  });

  it('a persistent EPERM fails with a storage error and leaves no temp file', async () => {
    let calls = 0;
    const s = await start({ fsHooks: { sleep: noWait, rename: async () => { calls++; throw errnoError('EPERM'); } } });
    const before = fs.readFileSync(s.csvPath, 'utf8');
    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 500);
    assert.equal(calls, 5);
    assert.equal(fs.readFileSync(s.csvPath, 'utf8'), before);
    assert.deepEqual(tmpFiles(s), []);
  });

  it('a non-lock error is not retried', async () => {
    let calls = 0;
    const s = await start({ fsHooks: { rename: async () => { calls++; throw errnoError('ENOENT'); } } });
    assert.equal((await request(s.baseUrl, '/api/movies/1', { method: 'DELETE' })).status, 500);
    assert.equal(calls, 1);
  });
});

describe('Committed writes are reported as successful', () => {
  it('a failing stat after the append still returns 201, and the next list re-reads the file', async () => {
    // Import stats: #1 reloadIfChanged, #2 appendMovieToCsv's size check, #3 markWritten.
    const hooks = armedStat((n) => { if (n === 3) throw errnoError('EBUSY'); });
    const s = await start({ tmdbApiKey: 'k', tmdb: stubTmdb(), fsHooks: { stat: hooks.stat } });
    hooks.arm();
    assert.equal((await postJson(s.baseUrl, '/api/tmdb/import', { movieId: 603 })).status, 201);
    const list = await request<MovieJson[]>(s.baseUrl, '/api/movies');
    assert.equal(list.body.filter((m) => m['Movie ID'] === '603').length, 1);
    assert.ok((await ids(s)).includes('603'));
  });
});

describe('Read-only routes reflect the current catalogue file', () => {
  it('get by id sees a row an external tool appended', async () => {
    const s = await start();
    fs.appendFileSync(s.csvPath, csvRow('9002', 'Ext') + '\n');
    const res = await request<MovieJson>(s.baseUrl, '/api/movies/9002');
    assert.equal(res.status, 200);
    assert.equal(res.body.Name, 'Ext');
  });

  it('search marks an externally appended movie as already imported', async () => {
    const tmdb = stubTmdb({ '/search/movie': { results: [{ id: 9003, title: 'Ext' }] } });
    const s = await start({ tmdbApiKey: 'k', tmdb });
    fs.appendFileSync(s.csvPath, csvRow('9003', 'Ext') + '\n');
    const res = await request<{ results: { alreadyImported: boolean }[] }>(s.baseUrl, '/api/tmdb/search?query=ext');
    assert.equal(res.body.results[0].alreadyImported, true);
  });

  it('search during startup is 503', async () => {
    const gate = deferred();
    const s = await start({ tmdbApiKey: 'k', tmdb: stubTmdb(), onBeforeLoad: () => gate.promise, waitForReady: false });
    assert.equal((await request(s.baseUrl, '/api/tmdb/search?query=x')).status, 503);
    gate.resolve();
    await s.ready;
  });

  it('actor results list each movie once, most popular first', async () => {
    const tmdb = stubTmdb({
      '/search/person': { results: [{ id: 7 }] },
      '/person/7/movie_credits': { cast: [
        { id: 1, title: 'Low', popularity: 1 },
        { id: 2, title: 'High', popularity: 50 },
        { id: 1, title: 'Low', popularity: 1 },
        { id: 3, title: 'Unknown' },
      ] },
    });
    const s = await start({ tmdbApiKey: 'k', tmdb });
    const res = await request<{ results: { id: number }[] }>(s.baseUrl, '/api/tmdb/search?actor=someone');
    assert.deepEqual(res.body.results.map((r) => r.id), [2, 1, 3]);
  });
});
