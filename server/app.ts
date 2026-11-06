import express, { Express, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import type { Movie } from '../src/types/movie';
import { createTmdbClient, tmdbErrorStatus, type TmdbClient } from './tmdb';
import { describeError } from './bootstrap';

export interface CreateAppOptions {
  /** Absolute path of the catalogue CSV. The entry point resolves it from process.cwd(). */
  csvPath: string;
  tmdbApiKey?: string;
  /** Defaults to the axios-based client with retries; tests pass a stub. */
  tmdb?: TmdbClient;
  clientOrigin?: string;
  rateLimitPerMinute?: number;
  /** Test seam: awaited before the initial CSV load, so requests can be made while not ready. */
  onBeforeLoad?: () => Promise<void>;
  logger?: Pick<Console, 'log' | 'error'>;
  /** Test seam: replace the file-system calls that tests need to fail or intercept. */
  fsHooks?: Partial<FsHooks>;
  /**
   * Built SPA directory (Vite's dist/) to serve alongside /api, with an index.html fallback for
   * client routes. Unset (dev, tests): API only — Vite serves the app. The caller checks it exists.
   */
  staticDir?: string;
  /** Express 'trust proxy' value (hop count, true, or an address list). Unset: not trusted. */
  trustProxy?: boolean | number | string;
}

export interface FsHooks {
  rename: (from: string, to: string) => Promise<void>;
  stat: (p: string) => Promise<{ mtimeMs: number; size: number }>;
  /** The rename-retry backoff wait; tests pass a no-op so lock-retry cases don't sleep ~750ms. */
  sleep: (ms: number) => Promise<void>;
}

export interface CreatedApp {
  app: Express;
  /** Resolves once the initial CSV load has finished (successfully or not). */
  ready: Promise<void>;
  /** Resolves once every catalogue operation queued before the call has settled (graceful shutdown). */
  drain: () => Promise<void>;
}

const TMDB_IMAGE_ORIGIN = 'https://image.tmdb.org';
const TMDB_IMAGE_BASE = `${TMDB_IMAGE_ORIGIN}/t/p/w500`;

// Everything the built SPA loads: its own bundle, TMDB posters, POSTER_FALLBACK (a data: URI), and
// Ant Design's CSS-in-JS, which injects <style> tags at runtime ('unsafe-inline' in style-src).
// upgrade-insecure-requests is dropped: every URL is relative or already https, and on a plain-HTTP
// LAN/host deployment it would rewrite the app's own same-origin requests to https and break them.
const CSP_DIRECTIVES = {
  'img-src': ["'self'", 'data:', TMDB_IMAGE_ORIGIN],
  'style-src': ["'self'", "'unsafe-inline'"],
  'script-src': ["'self'"],
  'connect-src': ["'self'"],
  'upgrade-insecure-requests': null,
};

// Vite emits content-hashed file names under assets/, so those can be cached for a year; anything
// else (index.html, favicon, manifest) must revalidate so a redeploy takes effect on the next load.
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const REVALIDATE_CACHE = 'no-cache';

interface TmdbMovieSummary {
  id: number;
  title: string;
  release_date?: string;
  original_language?: string;
  poster_path?: string | null;
  popularity?: number;
}
interface TmdbSearchMovieResponse { results: TmdbMovieSummary[] }
interface TmdbPerson { id: number }
interface TmdbSearchPersonResponse { results: TmdbPerson[] }
interface TmdbPersonCreditsResponse { cast: TmdbMovieSummary[] }
interface TmdbNamedItem { name: string }
interface TmdbCrewMember extends TmdbNamedItem { job: string }
interface TmdbMovieDetails {
  title?: string;
  original_language?: string;
  runtime?: number | null;
  release_date?: string;
  genres?: TmdbNamedItem[];
  production_companies?: TmdbNamedItem[];
  production_countries?: TmdbNamedItem[];
  revenue?: number;
  budget?: number;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  poster_path?: string | null;
}
interface TmdbCreditsResponse { cast?: TmdbNamedItem[]; crew?: TmdbCrewMember[] }

interface FileFingerprint { mtimeMs: number; size: number }

function sameFingerprint(a: FileFingerprint | null, b: FileFingerprint | null): boolean {
  if (a === null || b === null) return a === b;
  return a.mtimeMs === b.mtimeMs && a.size === b.size;
}

// Values written with sanitizeCsvValue() (here or by movie-search.py) carry a leading `'`
// so spreadsheets don't evaluate them; strip it on read so the UI shows the original value
// and the next rewrite escapes it exactly once.
const ESCAPED_FORMULA = /^'[=+\-@]/;

// Older movie-search.py versions wrote the literal placeholder "N/A" for missing values; read it
// as empty so it never shows up as a director/year/etc. in charts, filters, or drill-downs.
const LEGACY_MISSING = 'N/A';

function normalizeStoredValue(value: string): string {
  if (value === LEGACY_MISSING) return '';
  return ESCAPED_FORMULA.test(value) ? value.slice(1) : value;
}

const FORMULA_PREFIXES = ['=', '+', '-', '@'];

// Prevent CSV/formula injection: Excel/Sheets can execute a cell starting with =, +, -, or @
// when the file is opened later. Mirrors sanitize_csv_value() in movie-search.py.
function sanitizeCsvValue(value: string): string {
  return FORMULA_PREFIXES.some((p) => value.startsWith(p)) ? `'${value}` : value;
}

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A header that names a column twice can't be read or rewritten without losing one column's data. */
class DuplicateHeaderError extends Error {
  constructor(column: string) {
    super(`CSV header repeats column "${column}"; refusing to read or rewrite the catalogue until it is fixed`);
    this.name = 'DuplicateHeaderError';
  }
}

function findDuplicateHeader(headers: string[]): string | undefined {
  const seen = new Set<string>();
  for (const h of headers) {
    if (seen.has(h)) return h;
    seen.add(h);
  }
  return undefined;
}

/** The file changed on disk while a rewrite was being prepared; the caller reloads and retries. */
class CatalogueChangedError extends Error {
  constructor() {
    super('Catalogue file changed during rewrite');
    this.name = 'CatalogueChangedError';
  }
}

const RENAME_RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RENAME_BACKOFF_MS = [50, 100, 200, 400];
const DELETE_MAX_ATTEMPTS = 3;

// Windows reports a file briefly held by antivirus/indexer/Excel as EPERM/EBUSY/EACCES on rename;
// retry those for a bounded ~750ms (graceful-fs does the same) and rethrow anything else at once.
async function renameWithRetry({ rename, sleep }: FsHooks, from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (!code || !RENAME_RETRY_CODES.has(code) || attempt >= RENAME_BACKOFF_MS.length) throw err;
      await sleep(RENAME_BACKOFF_MS[attempt]);
    }
  }
}

function toCsvLine(row: Movie, headers: string[]): string {
  const values = headers.map((h) => (row as unknown as Record<string, string>)[h] ?? '');
  return values.map((v) => escapeCsvField(sanitizeCsvValue(v))).join(',');
}

export function createApp(options: CreateAppOptions): CreatedApp {
  const {
    csvPath,
    tmdbApiKey,
    tmdb = createTmdbClient({ apiKey: tmdbApiKey }),
    clientOrigin = 'http://localhost:3000',
    rateLimitPerMinute = 300,
    onBeforeLoad,
    logger = console,
    fsHooks = {},
    staticDir,
    trustProxy,
  } = options;
  const fsOps: FsHooks = {
    rename: fsHooks.rename ?? ((from, to) => fs.promises.rename(from, to)),
    stat: fsHooks.stat ?? ((p) => fs.promises.stat(p)),
    sleep: fsHooks.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
  };

  const app = express();
  // Only behind a reverse proxy: trusting X-Forwarded-For without one lets clients pick their own
  // rate-limit key by spoofing the header.
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  app.use(helmet({ contentSecurityPolicy: { directives: CSP_DIRECTIVES } }));
  app.use(cors({ origin: clientOrigin }));
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));

  const apiLimiter = rateLimit({ windowMs: 60000, limit: rateLimitPerMinute, standardHeaders: true, legacyHeaders: false });
  app.use('/api', apiLimiter);

  let movies: Movie[] = [];
  let isReady = false;
  // Set when the boot load fails for any reason but a missing file (which loads as empty), and
  // cleared by the next successful load: while set, the catalogue routes return 500 instead of
  // serving an empty list that looks like the user's data is gone.
  let loadError: Error | null = null;
  let csvHeaders: string[] = [];
  // Bumped on every load/mutation; drives the /api/movies ETag so clients revalidate cheaply.
  let catalogueVersion = 0;
  // Per-process prefix for the ETag: catalogueVersion restarts at 0 in every process, so without it
  // a validator cached from an earlier process could match different data after a restart.
  const bootId = crypto.randomUUID().slice(0, 8);

  // The CSV is also written by movie-search.py / backfill_posters.py while the server may be
  // running, so the in-memory copy is only trusted while the file's stat fingerprint is unchanged.
  let fingerprint: FileFingerprint | null = null;

  async function statFingerprint(): Promise<FileFingerprint | null> {
    try {
      const st = await fsOps.stat(csvPath);
      return { mtimeMs: st.mtimeMs, size: st.size };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  function loadCatalogue(): Promise<{ movies: Movie[]; headers: string[] }> {
    return new Promise((resolve, reject) => {
      const rows: Movie[] = [];
      let headers: string[] = [];
      const stream = fs.createReadStream(csvPath);
      stream
        .on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'ENOENT') resolve({ movies: [], headers: [] });
          else reject(err);
        })
        .pipe(csv({
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim(),
          mapValues: ({ value }) => normalizeStoredValue(value),
        }))
        .on('headers', (h: string[]) => {
          const dup = findDuplicateHeader(h);
          if (dup !== undefined) {
            stream.destroy();
            reject(new DuplicateHeaderError(dup));
            return;
          }
          headers = h;
        })
        .on('data', (row: Movie) => rows.push(row))
        .on('error', reject)
        .on('end', () => resolve({ movies: rows, headers }));
    });
  }

  // Stat first, then read: if the file changes mid-read, the next check sees a newer
  // fingerprint and reloads again rather than trusting a half-old snapshot.
  async function reloadCatalogue(): Promise<void> {
    const fp = await statFingerprint();
    const loaded = await loadCatalogue();
    movies = loaded.movies;
    csvHeaders = loaded.headers;
    fingerprint = fp;
    catalogueVersion++;
    if (loadError) {
      loadError = null;
      logger.log(`CSV loaded after an earlier failure — ${movies.length} movies`);
    }
  }

  async function reloadIfChanged(): Promise<void> {
    if (!sameFingerprint(await statFingerprint(), fingerprint)) await reloadCatalogue();
  }

  // Serializes every catalogue operation that reads-then-writes the file or swaps in-memory
  // state (imports, deletes, and the reload check on GET), so they can't interleave. A failed
  // op rejects only its own caller; the chain itself always continues.
  let opChain: Promise<unknown> = Promise.resolve();
  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = opChain.then(fn);
    opChain = run.catch(() => undefined);
    return run;
  }

  // Runs after a write and memory swap have both succeeded, so it must not fail the request. If
  // the stat fails, a null fingerprint makes the next reloadIfChanged() re-read the file.
  async function markWritten(): Promise<void> {
    catalogueVersion++;
    try {
      fingerprint = await statFingerprint();
    } catch (err) {
      fingerprint = null;
      logger.error('Could not stat CSV after write; will reload on next operation:', describeError(err));
    }
  }

  // Caller must hold the op queue and have just run reloadIfChanged(), so csvHeaders matches
  // the header currently on disk (including columns another tool may have added). Row fields
  // with no matching header column are dropped, header columns the row lacks are left empty.
  async function appendMovieToCsv(row: Movie): Promise<void> {
    const size = (await statFingerprint())?.size ?? 0;
    if (size > 0 && csvHeaders.length === 0) {
      throw new Error('CSV file exists but its header could not be read; refusing to append');
    }
    const headers = size > 0 ? csvHeaders : Object.keys(row);
    let prefix = '';
    if (size > 0) {
      // Hand-edited / Excel-saved files may lack a trailing newline; without this the new row
      // would be glued onto the last existing row.
      const fh = await fs.promises.open(csvPath, 'r');
      try {
        const buf = Buffer.alloc(1);
        await fh.read(buf, 0, 1, size - 1);
        if (buf[0] !== 0x0a) prefix = '\n';
      } finally {
        await fh.close();
      }
    }
    const lines: string[] = [];
    if (size === 0) lines.push(headers.map(escapeCsvField).join(','));
    lines.push(toCsvLine(row, headers));
    await fs.promises.appendFile(csvPath, prefix + lines.join('\n') + '\n', 'utf-8');
    if (size === 0) csvHeaders = headers;
  }

  // Delete has no append-only equivalent — the whole file is regenerated from `rows`, written
  // to a uniquely named temp file first and renamed into place so a crash mid-write can't leave
  // the CSV truncated or half-written. Caller must hold the op queue. Throws CatalogueChangedError
  // (temp file removed, target untouched) if another tool changed the file since it was last read.
  async function rewriteCsvFile(rows: Movie[]): Promise<void> {
    const headers = csvHeaders.length ? csvHeaders : (rows[0] ? Object.keys(rows[0]) : []);
    // No duplicate-header check here: loadCatalogue already rejects one, and Object.keys can't repeat.
    const lines = [headers.map(escapeCsvField).join(',')];
    for (const movie of rows) lines.push(toCsvLine(movie, headers));
    const tmpPath = `${csvPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.promises.writeFile(tmpPath, lines.join('\n') + '\n', 'utf-8');
      if (!sameFingerprint(await statFingerprint(), fingerprint)) throw new CatalogueChangedError();
      await renameWithRetry(fsOps, tmpPath, csvPath);
    } catch (err) {
      await fs.promises.unlink(tmpPath).catch(() => undefined);
      throw err;
    }
  }

  const ready = enqueue(async () => {
    if (onBeforeLoad) await onBeforeLoad();
    await reloadCatalogue();
  })
    .then(() => logger.log(`CSV loaded — ${movies.length} movies`))
    .catch((err: Error) => {
      loadError = err;
      logger.error('Failed to load CSV:', err.message);
    })
    .finally(() => { isReady = true; });

  // Async handlers need no wrapper: Express 5 forwards their rejections to the error middleware.
  // Routes still map their own storage/TMDB failures; only unexpected throws reach the generic 500.

  // Read-only routes reconcile with the file too, but a failed reload just serves the last copy.
  async function reloadForRead(): Promise<void> {
    try {
      await enqueue(reloadIfChanged);
    } catch (err) {
      logger.error('Failed to reload CSV, serving last loaded copy:', describeError(err));
    }
  }

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: loadError ? 'error' : isReady ? 'ok' : 'loading', movies: movies.length });
  });

  app.use(['/api/movies', '/api/tmdb/import', '/api/tmdb/search'], async (_req, res, next) => {
    if (!isReady) {
      res.status(503).json({ error: 'Data still loading' });
      return;
    }
    // Retry the failed boot load on every request, so a file fixed by hand recovers on "Try Again".
    if (loadError) await reloadForRead();
    if (loadError) {
      res.status(500).json({ error: 'Catalogue file could not be loaded; see server log' });
      return;
    }
    next();
  });

  app.get('/api/movies', async (req, res) => {
    await reloadForRead();
    const etag = `W/"${bootId}-v${catalogueVersion}"`;
    res.set('Cache-Control', 'no-cache');
    res.set('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.json(movies);
  });

  app.get('/api/movies/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    if (!id || id.length > 32) {
      res.status(400).json({ error: 'Invalid movie id' });
      return;
    }
    await reloadForRead();
    const movie = movies.find((m) => m['Movie ID'] === id);
    if (movie) {
      res.json(movie);
    } else {
      res.status(404).json({ error: 'Movie not found' });
    }
  });

  app.delete('/api/movies/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    if (!id || id.length > 32) {
      res.status(400).json({ error: 'Invalid movie id' });
      return;
    }
    try {
      const removed = await enqueue(async () => {
        await reloadIfChanged();
        for (let attempt = 1; ; attempt++) {
          const target = movies.find((m) => m['Movie ID'] === id);
          if (!target) return null;
          const remaining = movies.filter((m) => m !== target);
          try {
            // Write first, swap memory only on success — a failed write leaves both untouched.
            await rewriteCsvFile(remaining);
          } catch (err) {
            // Another tool wrote the file while the rewrite was prepared: redo it on the new contents.
            if (!(err instanceof CatalogueChangedError) || attempt >= DELETE_MAX_ATTEMPTS) throw err;
            await reloadCatalogue();
            continue;
          }
          movies = remaining;
          await markWritten();
          return target;
        }
      });
      if (!removed) {
        res.status(404).json({ error: 'Movie not found' });
        return;
      }
      res.json(removed);
    } catch (err) {
      logger.error('Failed to rewrite CSV after delete:', describeError(err));
      res.status(500).json({ error: 'Failed to delete movie' });
    }
  });

  // TMDB import — lets the Movies page pull new rows into the CSV without leaving the browser
  // (replaces the standalone movie-search.py Tkinter tool for the common case; the script stays for
  // bulk/offline use). Same TMDB_API_KEY env var as the script; the key never reaches the client since
  // all TMDB calls happen server-side.

  app.get('/api/tmdb/search', async (req, res) => {
    if (!tmdbApiKey) {
      res.status(503).json({ error: 'TMDB_API_KEY not configured on server' });
      return;
    }
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const actor = typeof req.query.actor === 'string' ? req.query.actor.trim() : '';
    const yearParam = typeof req.query.year === 'string' ? req.query.year.trim() : '';
    const year = /^\d{4}$/.test(yearParam) ? yearParam : '';
    if (!query && !actor) {
      res.status(400).json({ error: 'query or actor is required' });
      return;
    }

    let results: TmdbMovieSummary[];
    try {
      if (actor) {
        const personRes = await tmdb.get<TmdbSearchPersonResponse | null>('/search/person', { query: actor });
        const person = personRes?.results?.[0];
        if (!person) {
          res.json({ results: [] });
          return;
        }
        const creditsRes = await tmdb.get<TmdbPersonCreditsResponse | null>(`/person/${person.id}/movie_credits`);
        // An actor credited for several roles in one film appears once per role: keep the first,
        // then rank by popularity so the 20-result cut keeps the films people look for.
        const seen = new Set<number>();
        results = (creditsRes?.cast ?? [])
          .filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          })
          .filter((m) => !query || (m.title ?? '').toLowerCase().includes(query.toLowerCase()))
          .filter((m) => !year || m.release_date?.slice(0, 4) === year)
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      } else {
        const searchRes = await tmdb.get<TmdbSearchMovieResponse | null>('/search/movie', {
          query,
          ...(year ? { primary_release_year: year } : {}),
        });
        results = searchRes?.results ?? [];
      }
    } catch (err) {
      logger.error('TMDB search failed:', describeError(err));
      res.status(502).json({ error: 'TMDB request failed' });
      return;
    }

    // After the TMDB calls, so the op queue is never held across network I/O.
    await reloadForRead();
    res.json({
      results: results.slice(0, 20).map((m) => ({
        id: m.id,
        title: m.title,
        year: m.release_date ? m.release_date.slice(0, 4) : '',
        language: m.original_language ?? '',
        posterUrl: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : '',
        alreadyImported: movies.some((mv) => mv['Movie ID'] === String(m.id)),
      })),
    });
  });

  const inFlightImports = new Set<number>();

  app.post('/api/tmdb/import', async (req, res) => {
    if (!tmdbApiKey) {
      res.status(503).json({ error: 'TMDB_API_KEY not configured on server' });
      return;
    }
    const movieId = Number((req.body as { movieId?: unknown } | undefined)?.movieId);
    if (!Number.isInteger(movieId) || movieId <= 0) {
      res.status(400).json({ error: 'Invalid movieId' });
      return;
    }
    // Fast-path rejection (no TMDB calls spent); the authoritative duplicate check runs again
    // inside the op queue below, against freshly reloaded state.
    if (inFlightImports.has(movieId) || movies.some((m) => m['Movie ID'] === String(movieId))) {
      res.status(409).json({ error: 'Movie already in catalogue' });
      return;
    }

    inFlightImports.add(movieId);
    try {
      let details: TmdbMovieDetails;
      let credits: TmdbCreditsResponse;
      try {
        // Network I/O happens outside the op queue so a slow/retrying TMDB call never blocks
        // other imports, deletes, or list requests.
        const [rawDetails, rawCredits] = await Promise.all([
          tmdb.get<TmdbMovieDetails | null>(`/movie/${movieId}`),
          tmdb.get<TmdbCreditsResponse | null>(`/movie/${movieId}/credits`),
        ]);
        // A 200 with a null body (proxy, TMDB hiccup) imports as a row of empty values.
        details = rawDetails ?? {};
        credits = rawCredits ?? {};
      } catch (err) {
        if (tmdbErrorStatus(err) === 404) {
          res.status(404).json({ error: 'Movie not found on TMDB' });
          return;
        }
        logger.error('TMDB import fetch failed:', describeError(err));
        res.status(502).json({ error: 'TMDB request failed' });
        return;
      }

      const director = (credits.crew ?? []).find((c) => c.job === 'Director')?.name ?? '';
      const cast = (credits.cast ?? []).slice(0, 5).map((c) => c.name).join(', ');
      const genres = (details.genres ?? []).map((g) => g.name).join(', ');
      const prodCompanies = (details.production_companies ?? []).map((c) => c.name).join(', ');
      const prodCountries = (details.production_countries ?? []).map((c) => c.name).join(', ');
      // 'Keywords/Tags' is a CSV column but not part of the Movie type — left blank on import, matching the rest of the app

      const row: Movie = {
        'Movie ID': String(movieId),
        'Name': details.title ?? '',
        'Language': details.original_language ?? '',
        'Runtime': details.runtime != null ? String(details.runtime) : '',
        'Release Year': details.release_date ? details.release_date.slice(0, 4) : '',
        'Genres': genres,
        'Director': director,
        'Actors/Actresses': cast,
        'Production Company': prodCompanies,
        'Production Country': prodCountries,
        'Box Office Revenue': details.revenue != null ? String(details.revenue) : '',
        'Budget': details.budget != null ? String(details.budget) : '',
        'Popularity Score': details.popularity != null ? String(details.popularity) : '',
        'Vote Average': details.vote_average != null ? String(details.vote_average) : '',
        'Vote Count': details.vote_count != null ? String(details.vote_count) : '',
        'Poster URL': details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : '',
        'Release Date': details.release_date ?? '',
      };

      let saved: boolean;
      try {
        saved = await enqueue(async () => {
          await reloadIfChanged();
          if (movies.some((m) => m['Movie ID'] === row['Movie ID'])) return false;
          await appendMovieToCsv(row);
          movies = [...movies, row];
          await markWritten();
          return true;
        });
      } catch (err) {
        logger.error('Failed to save imported movie to CSV:', describeError(err));
        res.status(500).json({ error: 'Failed to save movie' });
        return;
      }
      if (!saved) {
        res.status(409).json({ error: 'Movie already in catalogue' });
        return;
      }
      res.status(201).json(row);
    } finally {
      inFlightImports.delete(movieId);
    }
  });

  // Unknown API paths get JSON, never the SPA's HTML (a typo'd fetch would otherwise "succeed").
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (staticDir) {
    const indexHtml = path.join(staticDir, 'index.html');
    app.use(express.static(staticDir, {
      index: false,
      setHeaders: (res, filePath) => {
        const top = path.relative(staticDir, filePath).split(path.sep)[0];
        res.setHeader('Cache-Control', top === 'assets' ? IMMUTABLE_CACHE : REVALIDATE_CACHE);
      },
    }));
    // Client routes (/movies, /stats?tab=…) get index.html so deep links and reloads work. Paths
    // with an extension are missing files: a 404 beats HTML served as a stale JS chunk.
    app.get(/^(?!\/api(?:\/|$))/, (req: Request, res: Response, next: NextFunction) => {
      if (path.extname(req.path) !== '') {
        next();
        return;
      }
      res.sendFile(indexHtml, { headers: { 'Cache-Control': REVALIDATE_CACHE } }, (err) => {
        if (err) next(err);
      });
    });
  }

  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, next: NextFunction) => {
    // Response already started: let Express close the connection.
    if (res.headersSent) {
      next(err);
      return;
    }
    // body-parser and friends tag client errors (malformed JSON → 400, oversized body → 413);
    // pass those through with a generic message rather than reporting them as server faults.
    const status = err.status ?? err.statusCode;
    if (status !== undefined && status >= 400 && status < 500) {
      res.status(status).json({ error: status === 413 ? 'Request body too large' : 'Bad request' });
      return;
    }
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const drain = (): Promise<void> => enqueue(async () => undefined);

  return { app, ready, drain };
}
