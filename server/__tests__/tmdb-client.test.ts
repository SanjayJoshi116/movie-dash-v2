// Retry/backoff behaviour of the default axios-based TMDB client, with the network and the sleep
// both injected so the test is instant and offline.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type axios from 'axios';
import { createTmdbClient, tmdbErrorStatus, TMDB_DEADLINE_MS, TMDB_MAX_ATTEMPTS } from '../tmdb';
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
    await assert.rejects(client.get('/movie/1'), (err) => tmdbErrorStatus(err) === 404);
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

describe('TMDB failures are reported within a bounded time', () => {
  /** A fake clock that the injected sleep advances, plus an httpGet that also takes time. */
  function clockedClient(outcome: (attempt: number) => { error?: Error; data?: unknown; takesMs?: number }) {
    let t = 0;
    const timeouts: number[] = [];
    const waits: number[] = [];
    let attempt = 0;
    const httpGet = (async (_url: string, config?: { timeout?: number }) => {
      timeouts.push(config?.timeout ?? -1);
      const o = outcome(++attempt);
      t += Math.min(o.takesMs ?? 0, config?.timeout ?? Infinity);
      if (o.error) throw o.error;
      return { data: o.data };
    }) as unknown as typeof axios.get;
    const client = createTmdbClient({
      apiKey: 'k', httpGet, now: () => t, sleep: async (ms) => { waits.push(ms); t += ms; },
    });
    return { client, timeouts, waits, elapsed: () => t, attempts: () => attempt };
  }
  const timeoutError = () => Object.assign(new Error('timeout of 10000ms exceeded'), { isAxiosError: true, code: 'ECONNABORTED' });
  const rateLimited = (retryAfter: string) => Object.assign(axiosError(429), { response: { status: 429, headers: { 'retry-after': retryAfter } } });

  it('every attempt carries a wall-clock abort signal bounded by the deadline', async () => {
    const signals: unknown[] = [];
    const httpGet = (async (_url: string, config?: { signal?: unknown }) => {
      signals.push(config?.signal);
      return { data: { ok: true } };
    }) as unknown as typeof axios.get;
    const client = createTmdbClient({ apiKey: 'k', httpGet, sleep: async () => undefined });
    await client.get('/x');
    assert.ok(signals[0] instanceof AbortSignal);
  });

  it('a non-network error is not retried', async () => {
    const c = clockedClient(() => ({ error: new TypeError('bad argument') }));
    await assert.rejects(c.client.get('/x'), /bad argument/);
    assert.equal(c.attempts(), 1);
    assert.deepEqual(c.waits, []);
  });

  it('a hanging TMDB gives up by the 15 s deadline, shrinking each attempt timeout', async () => {
    const c = clockedClient(() => ({ error: timeoutError(), takesMs: 10000 }));
    await assert.rejects(c.client.get('/x'));
    assert.ok(c.elapsed() <= TMDB_DEADLINE_MS, `took ${c.elapsed()}ms`);
    assert.equal(c.timeouts[0], 10000);
    assert.ok(c.timeouts.slice(1).every((ms) => ms < 10000), `timeouts ${c.timeouts}`);
  });

  it('429 with Retry-After: 60 fails at once instead of waiting', async () => {
    const c = clockedClient(() => ({ error: rateLimited('60') }));
    await assert.rejects(c.client.get('/x'), (err) => tmdbErrorStatus(err) === 429);
    assert.equal(c.attempts(), 1);
    assert.deepEqual(c.waits, []);
  });

  it('429 with Retry-After: 2 waits at least 2 s, then succeeds', async () => {
    const c = clockedClient((n) => (n === 1 ? { error: rateLimited('2') } : { data: { ok: true } }));
    assert.deepEqual(await c.client.get('/x'), { ok: true });
    assert.deepEqual(c.waits, [2000]);
  });
});
