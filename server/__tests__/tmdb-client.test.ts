// Retry/backoff behaviour of the default axios-based TMDB client, with the network and the sleep
// both injected so the test is instant and offline.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type axios from 'axios';
import { createTmdbClient, TMDB_MAX_ATTEMPTS } from '../tmdb';
import { axiosError } from './helpers';

function fakeGet(outcomes: (Error | unknown)[]) {
  let i = 0;
  const calls: { url: string; params: Record<string, unknown> }[] = [];
  const get = (async (url: string, config?: { params?: Record<string, unknown> }) => {
    calls.push({ url, params: config?.params ?? {} });
    const outcome = outcomes[Math.min(i++, outcomes.length - 1)];
    if (outcome instanceof Error) throw outcome;
    return { data: outcome };
  }) as unknown as typeof axios.get;
  return { get, calls };
}

function recordingSleep() {
  const waits: number[] = [];
  return { waits, sleep: async (ms: number) => { waits.push(ms); } };
}

describe('TMDB client retries', () => {
  for (const status of [429, 500, 503]) {
    it(`retries on ${status} then succeeds`, async () => {
      const { get, calls } = fakeGet([axiosError(status), { ok: true }]);
      const { sleep, waits } = recordingSleep();
      const client = createTmdbClient({ apiKey: 'k', httpGet: get, sleep });
      assert.deepEqual(await client.get('/x'), { ok: true });
      assert.equal(calls.length, 2);
      assert.deepEqual(waits, [500]);
    });
  }

  it('retries network errors (no response) with doubling backoff, then gives up', async () => {
    const netErr = Object.assign(new Error('ECONNRESET'), { isAxiosError: true });
    const { get, calls } = fakeGet([netErr]);
    const { sleep, waits } = recordingSleep();
    const client = createTmdbClient({ apiKey: 'k', httpGet: get, sleep });
    await assert.rejects(client.get('/x'), /ECONNRESET/);
    assert.equal(calls.length, TMDB_MAX_ATTEMPTS);
    assert.deepEqual(waits, [500, 1000]);
  });

  it('does not retry a 404', async () => {
    const { get, calls } = fakeGet([axiosError(404)]);
    const { sleep, waits } = recordingSleep();
    const client = createTmdbClient({ apiKey: 'k', httpGet: get, sleep });
    await assert.rejects(client.get('/movie/1'), (err: { response?: { status: number } }) => err.response?.status === 404);
    assert.equal(calls.length, 1);
    assert.deepEqual(waits, []);
  });

  it('sends the API key as a query param, never in the URL', async () => {
    const { get, calls } = fakeGet([{ ok: true }]);
    const client = createTmdbClient({ apiKey: 'secret', httpGet: get, sleep: async () => undefined });
    await client.get('/search/movie', { query: 'alien' });
    assert.equal(calls[0].params.api_key, 'secret');
    assert.equal(calls[0].params.query, 'alien');
    assert.ok(!calls[0].url.includes('secret'));
  });
});
