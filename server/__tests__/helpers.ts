// Shared test harness for the Express server. Every test runs createApp() against a CSV in its
// own temp directory — never src/movies.csv. Fixtures are built in code (not checked-in .csv
// files) because git's autocrlf would silently rewrite their line endings / trailing newlines.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import csv from 'csv-parser';
import { createApp, type CreateAppOptions } from '../app';
import type { TmdbClient } from '../tmdb';

export const HEADER = 'Movie ID,Name,Language,Runtime,Release Year,Genres,Director,Actors/Actresses,Production Company,Production Country,Box Office Revenue,Budget,Popularity Score,Vote Average,Vote Count,Poster URL,Keywords/Tags,Release Date';

export function csvRow(id: string, name: string): string {
  return `${id},${name},en,100,2020,Drama,Dir,"A, B",Co,United States of America,0,0,1,7,10,,,2020-01-01`;
}

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'public', 'movies.template.csv');

export const FIXTURES = {
  /** The committed template (5 rows, ids 1–5), normalized to LF. */
  basic: () => fs.readFileSync(TEMPLATE_PATH, 'utf8').replace(/\r\n/g, '\n'),
  bom: () => '\uFEFF' + [HEADER, csvRow('1', 'One'), csvRow('2', 'Two')].join('\n') + '\n',
  noTrailingNewline: () => [HEADER, csvRow('1', 'One'), csvRow('2', 'Two')].join('\n'),
  /** Stored in escaped form, the way sanitizeCsvValue()/movie-search.py write it. */
  formulaValues: () => [HEADER, csvRow('1', "'+1"), csvRow('2', "'-Ism"), csvRow('3', 'Plain')].join('\n') + '\n',
  empty: () => '',
} as const;

export type FixtureName = keyof typeof FIXTURES;

export interface TestServer {
  baseUrl: string;
  csvPath: string;
  dir: string;
  ready: Promise<void>;
  errors: unknown[][];
  close: () => Promise<void>;
}

export interface StartOptions extends Partial<Omit<CreateAppOptions, 'csvPath'>> {
  fixture?: FixtureName;
  /** Use an existing temp dir (e.g. to "restart" against the same file). */
  dir?: string;
  waitForReady?: boolean;
}

export async function startServer(opts: StartOptions = {}): Promise<TestServer> {
  const { fixture = 'basic', dir: existingDir, waitForReady = true, ...appOpts } = opts;
  const dir = existingDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'movie-dash-test-'));
  const csvPath = path.join(dir, 'movies.csv');
  if (!existingDir) fs.writeFileSync(csvPath, FIXTURES[fixture](), 'utf8');

  const errors: unknown[][] = [];
  const { app, ready } = createApp({
    csvPath,
    logger: { log: () => undefined, error: (...args: unknown[]) => { errors.push(args); } },
    ...appOpts,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const { port } = server.address() as AddressInfo;
  if (waitForReady) await ready;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    csvPath,
    dir,
    ready,
    errors,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (!existingDir) fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export interface JsonResponse<T = unknown> {
  status: number;
  body: T;
  headers: Headers;
}

export async function request<T = unknown>(baseUrl: string, p: string, init?: RequestInit): Promise<JsonResponse<T>> {
  const res = await fetch(baseUrl + p, init);
  const text = await res.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body: body as T, headers: res.headers };
}

export function postJson<T = unknown>(baseUrl: string, p: string, payload: unknown): Promise<JsonResponse<T>> {
  return request<T>(baseUrl, p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

/** Raw rows as stored on disk (BOM stripped from the header, values NOT un-escaped). */
export function readCsvRows(csvPath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    fs.createReadStream(csvPath)
      .pipe(csv({ mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '') }))
      .on('data', (r: Record<string, string>) => rows.push(r))
      .on('error', reject)
      .on('end', () => resolve(rows));
  });
}

export function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

// ── TMDB stub ──────────────────────────────────────────────────────────────

/** Shaped like an axios error so the server's axios.isAxiosError() checks recognize it. */
export function axiosError(status: number): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });
}

export function tmdbDetails(id: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: `Movie ${id}`,
    original_language: 'en',
    runtime: 120,
    release_date: '2021-05-01',
    genres: [{ name: 'Action' }, { name: 'Drama' }],
    production_companies: [{ name: 'Studio A' }],
    production_countries: [{ name: 'United Kingdom' }, { name: 'United States of America' }],
    revenue: 1000,
    budget: 500,
    popularity: 9.5,
    vote_average: 7.5,
    vote_count: 100,
    poster_path: '/p.jpg',
    ...overrides,
  };
}

export const TMDB_CREDITS = {
  cast: [{ name: 'Actor One' }, { name: 'Actor Two' }],
  crew: [{ name: 'Some Director', job: 'Director' }],
};

export type StubRoute = unknown | Error | ((params: Record<string, string>) => unknown);

export interface StubTmdb extends TmdbClient {
  calls: { path: string; params: Record<string, string> }[];
}

/**
 * TMDB client stub. Unknown `/movie/:id` and `/movie/:id/credits` paths fall back to canned
 * details/credits, so imports work for any id unless a route overrides them. An Error value is
 * thrown; a function is called with the params. `delayMs` keeps requests in flight (for races).
 */
export function stubTmdb(routes: Record<string, StubRoute> = {}, delayMs = 0): StubTmdb {
  const calls: StubTmdb['calls'] = [];
  return {
    calls,
    async get<T>(p: string, params: Record<string, string> = {}): Promise<T> {
      calls.push({ path: p, params });
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      let route: StubRoute | undefined = routes[p];
      if (route === undefined) {
        const credits = p.match(/^\/movie\/(\d+)\/credits$/);
        const details = p.match(/^\/movie\/(\d+)$/);
        if (credits) route = TMDB_CREDITS;
        else if (details) route = tmdbDetails(Number(details[1]));
        else throw new Error(`stubTmdb: no route for ${p}`);
      }
      if (route instanceof Error) throw route;
      return (typeof route === 'function' ? (route as (prm: Record<string, string>) => unknown)(params) : route) as T;
    },
  };
}
