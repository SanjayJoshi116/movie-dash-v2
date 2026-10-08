// Existing route behaviour: health, list/get, delete validation, TMDB search params, security.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, request, readCsvRows, deferred, stubTmdb, type TestServer } from './helpers';

const servers: TestServer[] = [];
async function start(...args: Parameters<typeof startServer>): Promise<TestServer> {
  const s = await startServer(...args);
  servers.push(s);
  return s;
}
after(async () => { await Promise.all(servers.map((s) => s.close())); });

describe('health', () => {
  it('reports loading before the initial load finishes, ok after', async () => {
    const gate = deferred();
    const s = await start({ onBeforeLoad: () => gate.promise, waitForReady: false });
    const before = await request<{ status: string }>(s.baseUrl, '/api/health');
    assert.equal(before.body.status, 'loading');
    gate.resolve();
    await s.ready;
    const afterLoad = await request<{ status: string; movies: number }>(s.baseUrl, '/api/health');
    assert.equal(afterLoad.body.status, 'ok');
    assert.equal(afterLoad.body.movies, 5);
  });
});

describe('list and get by id', () => {
  it('lists all movies', async () => {
    const s = await start();
    const res = await request<unknown[]>(s.baseUrl, '/api/movies');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 5);
  });

  it('gets a movie by id', async () => {
    const s = await start();
    const res = await request<Record<string, string>>(s.baseUrl, '/api/movies/2');
    assert.equal(res.status, 200);
    assert.equal(res.body['Movie ID'], '2');
  });

  it('404s for an unknown id', async () => {
    const s = await start();
    assert.equal((await request(s.baseUrl, '/api/movies/999')).status, 404);
  });

  it('400s for an over-long id', async () => {
    const s = await start();
    assert.equal((await request(s.baseUrl, `/api/movies/${'9'.repeat(33)}`)).status, 400);
  });
});

describe('delete', () => {
  it('removes the row from memory and file', async () => {
    const s = await start();
    const res = await request<Record<string, string>>(s.baseUrl, '/api/movies/3', { method: 'DELETE' });
    assert.equal(res.status, 200);
    assert.equal(res.body['Movie ID'], '3');
    const list = await request<Record<string, string>[]>(s.baseUrl, '/api/movies');
    assert.ok(!list.body.some((m) => m['Movie ID'] === '3'));
    const rows = await readCsvRows(s.csvPath);
    assert.deepEqual(rows.map((r) => r['Movie ID']), ['1', '2', '4', '5']);
  });

  it('404s for an unknown id and leaves the file untouched', async () => {
    const s = await start();
    const before = await readCsvRows(s.csvPath);
    assert.equal((await request(s.baseUrl, '/api/movies/999', { method: 'DELETE' })).status, 404);
    assert.deepEqual(await readCsvRows(s.csvPath), before);
  });

  it('400s for an over-long id', async () => {
    const s = await start();
    assert.equal((await request(s.baseUrl, `/api/movies/${'9'.repeat(33)}`, { method: 'DELETE' })).status, 400);
  });
});

describe('TMDB search', () => {
  const searchResult = { results: [{ id: 10, title: 'Alien', release_date: '1979-05-25', original_language: 'en', poster_path: null }] };

  it('400s without query or actor', async () => {
    const s = await start({ tmdbApiKey: 'k', tmdb: stubTmdb() });
    assert.equal((await request(s.baseUrl, '/api/tmdb/search')).status, 400);
  });

  it('503s without an API key', async () => {
    const s = await start({ tmdb: stubTmdb() });
    assert.equal((await request(s.baseUrl, '/api/tmdb/search?query=alien')).status, 503);
  });

  it('passes year to TMDB only when it is 4 digits', async () => {
    const tmdb = stubTmdb({ '/search/movie': searchResult });
    const s = await start({ tmdbApiKey: 'k', tmdb });
    await request(s.baseUrl, '/api/tmdb/search?query=alien&year=1979');
    await request(s.baseUrl, '/api/tmdb/search?query=alien&year=199');
    assert.equal(tmdb.calls[0].params.primary_release_year, '1979');
    assert.equal(tmdb.calls[1].params.primary_release_year, undefined);
  });

  it('maps results and flags movies already in the catalogue', async () => {
    const tmdb = stubTmdb({ '/search/movie': { results: [{ id: 1, title: 'Example Action Film', release_date: '2022-07-15' }, ...searchResult.results] } });
    const s = await start({ tmdbApiKey: 'k', tmdb });
    const res = await request<{ results: { id: number; year: string; alreadyImported: boolean }[] }>(s.baseUrl, '/api/tmdb/search?query=x');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.results.map((r) => [r.id, r.year, r.alreadyImported]), [[1, '2022', true], [10, '1979', false]]);
  });

  it('actor path filters credits by year', async () => {
    const tmdb = stubTmdb({
      '/search/person': { results: [{ id: 7 }] },
      '/person/7/movie_credits': { cast: [
        { id: 1, title: 'Old', release_date: '1990-01-01' },
        { id: 2, title: 'New', release_date: '2010-01-01' },
      ] },
    });
    const s = await start({ tmdbApiKey: 'k', tmdb });
    const res = await request<{ results: { title: string }[] }>(s.baseUrl, '/api/tmdb/search?actor=someone&year=2010');
    assert.deepEqual(res.body.results.map((r) => r.title), ['New']);
  });

  it('502s when TMDB fails', async () => {
    const s = await start({ tmdbApiKey: 'k', tmdb: stubTmdb({ '/search/movie': new Error('boom') }) });
    assert.equal((await request(s.baseUrl, '/api/tmdb/search?query=x')).status, 502);
  });
});

describe('security', () => {
  it('sends helmet headers', async () => {
    const s = await start();
    const res = await request(s.baseUrl, '/api/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(res.headers.get('content-security-policy'));
  });

  it('rate-limits /api once the limit is exceeded', async () => {
    const s = await start({ rateLimitPerMinute: 3 });
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await request(s.baseUrl, '/api/health')).status);
    assert.deepEqual(statuses, [200, 200, 200, 429]);
  });
});
