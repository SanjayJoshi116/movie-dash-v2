// Coverage for the app-hosting spec (prod-deploy change, archived 2026-11-04): the built SPA served next to /api,
// caching headers, client-route fallback, JSON 404 for unknown API paths, CSP, and trust proxy.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../app';
import { isProductionMode, parseTrustProxy } from '../bootstrap';
import { serverPool, request } from './helpers';

const INDEX_HTML = '<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/assets/x.js"></script></body></html>';

const tempDirs: string[] = [];
function makeDist(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'movie-dash-dist-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), INDEX_HTML, 'utf8');
  fs.writeFileSync(path.join(dir, 'assets', 'x.js'), 'console.log("x");\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'favicon.ico'), 'icon', 'utf8');
  return dir;
}

const start = serverPool();
after(() => {
  for (const d of tempDirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('production static serving', () => {
  it('serves hashed assets with immutable long-term caching', async () => {
    const s = await start({ staticDir: makeDist() });
    const res = await request(s.baseUrl, '/assets/x.js');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.match(res.headers.get('content-type') ?? '', /javascript/);
  });

  it('serves index.html and other root files with no-cache', async () => {
    const s = await start({ staticDir: makeDist() });
    for (const p of ['/', '/index.html', '/favicon.ico']) {
      const res = await request(s.baseUrl, p);
      assert.equal(res.status, 200, p);
      assert.equal(res.headers.get('cache-control'), 'no-cache', p);
    }
    const root = await request<string>(s.baseUrl, '/');
    assert.equal(root.body, INDEX_HTML);
  });

  it('falls back to index.html for client routes, including deep links with a query', async () => {
    const s = await start({ staticDir: makeDist() });
    for (const p of ['/movies', '/stats?tab=people', '/movies/']) {
      const res = await request<string>(s.baseUrl, p);
      assert.equal(res.status, 200, p);
      assert.match(res.headers.get('content-type') ?? '', /text\/html/, p);
      assert.equal(res.headers.get('cache-control'), 'no-cache', p);
      assert.equal(res.body, INDEX_HTML, p);
    }
  });

  it('404s a missing file instead of serving index.html as it', async () => {
    const s = await start({ staticDir: makeDist() });
    const res = await request<string>(s.baseUrl, '/assets/old-chunk.js');
    assert.equal(res.status, 404);
    assert.notEqual(res.body, INDEX_HTML);
  });

  it('still serves the API with static serving enabled', async () => {
    const s = await start({ staticDir: makeDist() });
    const res = await request<unknown[]>(s.baseUrl, '/api/movies');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 5);
  });

  it('serves no app routes without staticDir (dev: Vite owns the frontend)', async () => {
    const s = await start();
    assert.equal((await request(s.baseUrl, '/movies')).status, 404);
    assert.equal((await request(s.baseUrl, '/')).status, 404);
  });
});

describe('unknown /api paths', () => {
  for (const staticDir of [undefined, 'dist'] as const) {
    it(`return a JSON 404, not the app's HTML (${staticDir ? 'with' : 'without'} static serving)`, async () => {
      const s = await start(staticDir ? { staticDir: makeDist() } : {});
      for (const p of ['/api/nope', '/api', '/api/movies/1/extra']) {
        const res = await request<{ error: string }>(s.baseUrl, p);
        assert.equal(res.status, 404, p);
        assert.match(res.headers.get('content-type') ?? '', /application\/json/, p);
        assert.deepEqual(res.body, { error: 'Not found' }, p);
      }
      const del = await request(s.baseUrl, '/api/nope', { method: 'DELETE' });
      assert.equal(del.status, 404);
    });
  }
});

describe('Content-Security-Policy', () => {
  it('allows TMDB posters, data: images and inline styles, and keeps scripts to self', async () => {
    const s = await start({ staticDir: makeDist() });
    for (const p of ['/', '/api/health']) {
      const csp = (await request(s.baseUrl, p)).headers.get('content-security-policy') ?? '';
      const directives = new Map(csp.split(';').map((d) => {
        const [name, ...values] = d.trim().split(/\s+/);
        return [name, values] as const;
      }));
      assert.deepEqual(directives.get('img-src'), ["'self'", 'data:', 'https://image.tmdb.org'], p);
      assert.deepEqual(directives.get('style-src'), ["'self'", "'unsafe-inline'"], p);
      assert.deepEqual(directives.get('script-src'), ["'self'"], p);
      assert.deepEqual(directives.get('connect-src'), ["'self'"], p);
      assert.deepEqual(directives.get('default-src'), ["'self'"], p);
      assert.ok(!directives.has('upgrade-insecure-requests'), p);
    }
  });
});

describe('trust proxy', () => {
  it('is off unless configured', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'movie-dash-test-'));
    tempDirs.push(dir);
    const quiet = { log: () => undefined, error: () => undefined };
    const plain = createApp({ csvPath: path.join(dir, 'missing.csv'), logger: quiet });
    const proxied = createApp({ csvPath: path.join(dir, 'missing.csv'), logger: quiet, trustProxy: 1 });
    await Promise.all([plain.ready, proxied.ready]);
    assert.equal(plain.app.get('trust proxy'), false);
    assert.equal(proxied.app.get('trust proxy'), 1);
  });

  it('rate-limits each client behind a trusted proxy separately', async () => {
    const s = await start({ trustProxy: 1, rateLimitPerMinute: 2 });
    const as = (ip: string) => request(s.baseUrl, '/api/health', { headers: { 'x-forwarded-for': ip } });
    assert.equal((await as('203.0.113.1')).status, 200);
    assert.equal((await as('203.0.113.1')).status, 200);
    assert.equal((await as('203.0.113.1')).status, 429);
    assert.equal((await as('203.0.113.2')).status, 200);
  });

  it('parses TRUST_PROXY', () => {
    assert.equal(parseTrustProxy(undefined), undefined);
    assert.equal(parseTrustProxy(''), undefined);
    assert.equal(parseTrustProxy(' false '), undefined);
    assert.equal(parseTrustProxy('TRUE'), true);
    assert.equal(parseTrustProxy('1'), 1);
    assert.equal(parseTrustProxy(' 2 '), 2);
    assert.equal(parseTrustProxy('loopback, 10.0.0.0/8'), 'loopback, 10.0.0.0/8');
  });
});

describe('production mode', () => {
  it('is enabled by --production or NODE_ENV=production', () => {
    assert.equal(isProductionMode(['node', 'server.js', '--production'], {}), true);
    assert.equal(isProductionMode(['node', 'server.js'], { NODE_ENV: 'production' }), true);
    assert.equal(isProductionMode(['node', 'server.js'], { NODE_ENV: 'development' }), false);
    assert.equal(isProductionMode(['node', 'server.js'], {}), false);
  });
});
