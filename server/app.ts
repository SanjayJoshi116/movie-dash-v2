import express, { Express, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import csv from 'csv-parser';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import type { Movie } from '../src/types/movie';
import { createTmdbClient, type TmdbClient } from './tmdb';

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
}

export interface CreatedApp {
  app: Express;
  /** Resolves once the initial CSV load has finished (successfully or not). */
  ready: Promise<void>;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TmdbMovieSummary {
  id: number;
  title: string;
  release_date?: string;
  original_language?: string;
  poster_path?: string | null;
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
  } = options;

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: clientOrigin }));
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));

  const apiLimiter = rateLimit({ windowMs: 60000, limit: rateLimitPerMinute, standardHeaders: true, legacyHeaders: false });
  app.use('/api', apiLimiter);

  let movies: Movie[] = [];
  let isReady = false;
  let csvHeaders: string[] = [];
  // Bumped on every load/mutation; drives the /api/movies ETag so clients revalidate cheaply.
  let catalogueVersion = 0;

  // The CSV is also written by movie-search.py / backfill_posters.py while the server may be
  // running, so the in-memory copy is only trusted while the file's stat fingerprint is unchanged.
  let fingerprint: FileFingerprint | null = null;

  async function statFingerprint(): Promise<FileFingerprint | null> {
    try {
      const st = await fs.promises.stat(csvPath);
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
      fs.createReadStream(csvPath)
        .on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'ENOENT') resolve({ movies: [], headers: [] });
          else reject(err);
        })
        .pipe(csv({
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim(),
          mapValues: ({ value }) => normalizeStoredValue(value),
        }))
        .on('headers', (h: string[]) => { headers = h; })
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

  async function markWritten(): Promise<void> {
    fingerprint = await statFingerprint();
    catalogueVersion++;
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
  // the CSV truncated or half-written. Caller must hold the op queue.
  async function rewriteCsvFile(rows: Movie[]): Promise<void> {
    const headers = csvHeaders.length ? csvHeaders : (rows[0] ? Object.keys(rows[0]) : []);
    const lines = [headers.map(escapeCsvField).join(',')];
    for (const movie of rows) lines.push(toCsvLine(movie, headers));
    const tmpPath = `${csvPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.promises.writeFile(tmpPath, lines.join('\n') + '\n', 'utf-8');
      await fs.promises.rename(tmpPath, csvPath);
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
    .catch((err: Error) => logger.error('Failed to load CSV:', err.message))
    .finally(() => { isReady = true; });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: isReady ? 'ok' : 'loading', movies: movies.length });
  });

  app.use(['/api/movies', '/api/tmdb/import'], (_req: Request, res: Response, next) => {
    if (!isReady) {
      res.status(503).json({ error: 'Data still loading' });
      return;
    }
    next();
  });

  app.get('/api/movies', async (req: Request, res: Response<Movie[]>) => {
    try {
      await enqueue(reloadIfChanged);
    } catch (err) {
      logger.error('Failed to reload CSV, serving last loaded copy:', err);
    }
    const etag = `W/"v${catalogueVersion}"`;
    res.set('Cache-Control', 'no-cache');
    res.set('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.json(movies);
  });

  app.get('/api/movies/:id', (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    if (!id || id.length > 32) {
      res.status(400).json({ error: 'Invalid movie id' });
      return;
    }
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
        const target = movies.find((m) => m['Movie ID'] === id);
        if (!target) return null;
        const remaining = movies.filter((m) => m !== target);
        // Write first, swap memory only on success — a failed write leaves both untouched.
        await rewriteCsvFile(remaining);
        movies = remaining;
        await markWritten();
        return target;
      });
      if (!removed) {
        res.status(404).json({ error: 'Movie not found' });
        return;
      }
      res.json(removed);
    } catch (err) {
      logger.error('Failed to rewrite CSV after delete:', err);
      res.status(500).json({ error: 'Failed to delete movie' });
    }
  });

  // TMDB import — lets the Movies page pull new rows into the CSV without leaving the browser
  // (replaces the standalone movie-search.py Tkinter tool for the common case; the script stays for
  // bulk/offline use). Same TMDB_API_KEY env var as the script; the key never reaches the client since
  // all TMDB calls happen server-side.

  app.get('/api/tmdb/search', async (req: Request, res: Response) => {
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

    try {
      let results: TmdbMovieSummary[];
      if (actor) {
        const personRes = await tmdb.get<TmdbSearchPersonResponse>('/search/person', { query: actor });
        const person = personRes.results[0];
        if (!person) {
          res.json({ results: [] });
          return;
        }
        const creditsRes = await tmdb.get<TmdbPersonCreditsResponse>(`/person/${person.id}/movie_credits`);
        results = creditsRes.cast
          .filter((m) => !query || m.title.toLowerCase().includes(query.toLowerCase()))
          .filter((m) => !year || m.release_date?.slice(0, 4) === year);
      } else {
        const searchRes = await tmdb.get<TmdbSearchMovieResponse>('/search/movie', {
          query,
          ...(year ? { primary_release_year: year } : {}),
        });
        results = searchRes.results;
      }

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
    } catch (err) {
      logger.error('TMDB search failed:', err);
      res.status(502).json({ error: 'TMDB request failed' });
    }
  });

  const inFlightImports = new Set<number>();

  app.post('/api/tmdb/import', async (req: Request, res: Response) => {
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
        [details, credits] = await Promise.all([
          tmdb.get<TmdbMovieDetails>(`/movie/${movieId}`),
          tmdb.get<TmdbCreditsResponse>(`/movie/${movieId}/credits`),
        ]);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          res.status(404).json({ error: 'Movie not found on TMDB' });
          return;
        }
        logger.error('TMDB import fetch failed:', err);
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
        logger.error('Failed to save imported movie to CSV:', err);
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

  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
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

  return { app, ready };
}
