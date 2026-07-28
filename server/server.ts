import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import type { Movie } from '../src/types/movie';

try {
  process.loadEnvFile(path.join(process.cwd(), '.env'));
} catch {
  // .env is optional locally; TMDB routes below degrade gracefully if the key is absent
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000' }));
app.use(compression());
app.use(express.json({ limit: '10kb' }));

const apiLimiter = rateLimit({ windowMs: 60000, limit: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

const movies: Movie[] = [];
let ready = false;
let csvHeaders: string[] = [];

const csvPath = path.join(process.cwd(), 'src', 'movies.csv');

fs.createReadStream(csvPath)
  .on('error', (err) => {
    console.error('Failed to read CSV:', err.message);
    ready = true;
  })
  .pipe(csv())
  .on('headers', (headers: string[]) => { csvHeaders = headers; })
  .on('data', (data: Movie) => movies.push(data))
  .on('error', (err) => {
    console.error('Failed to parse CSV:', err.message);
    ready = true;
  })
  .on('end', () => {
    ready = true;
    console.log(`CSV loaded — ${movies.length} movies`);
  });

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: ready ? 'ok' : 'loading', movies: movies.length });
});

app.use('/api/movies', (_req: Request, res: Response, next) => {
  if (!ready) {
    res.status(503).json({ error: 'Data still loading' });
    return;
  }
  next();
});

app.get('/api/movies', (_req: Request, res: Response<Movie[]>) => {
  res.set('Cache-Control', 'public, max-age=60');
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
  const index = movies.findIndex((m) => m['Movie ID'] === id);
  if (index === -1) {
    res.status(404).json({ error: 'Movie not found' });
    return;
  }

  const [removed] = movies.splice(index, 1);
  try {
    await rewriteCsvFile();
    res.json(removed);
  } catch (err) {
    movies.splice(index, 0, removed); // undo the in-memory removal since the file write failed
    console.error('Failed to rewrite CSV after delete:', err);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

// TMDB import — lets the Movies page pull new rows into src/movies.csv without leaving the browser
// (replaces the standalone movie-search.py Tkinter tool for the common case; the script stays for
// bulk/offline use). Same TMDB_API_KEY env var as the script; the key never reaches the client since
// all TMDB calls happen server-side.

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
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

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const TMDB_MAX_ATTEMPTS = 3;
const TMDB_RETRY_BACKOFF_MS = 500; // doubles each attempt: 500ms, 1000ms — mirrors movie-search.py's Retry(backoff_factor=2)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uses axios (Node's classic http/https core adapter), not the built-in fetch (undici) — on some
// Windows setups undici's TLS stack gets reset mid-handshake by AV/proxy HTTPS inspection even
// when the network is otherwise fine (curl and movie-search.py's requests/urllib3 are unaffected
// since neither goes through undici). Retries network errors and 429/5xx on top, mirroring
// movie-search.py's Retry(total=3, backoff_factor=2, status_forcelist=[429,500,502,503,504]).
async function tmdbGet<T>(pathSegment: string, params: Record<string, string> = {}): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= TMDB_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await axios.get<T>(`${TMDB_BASE}${pathSegment}`, {
        params: { ...params, api_key: TMDB_API_KEY },
        headers: { 'User-Agent': 'movie-dash' },
        timeout: 10000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const retryable = status === undefined || RETRYABLE_STATUS.has(status);
      if (!retryable || attempt === TMDB_MAX_ATTEMPTS) throw err;
    }
    await sleep(TMDB_RETRY_BACKOFF_MS * 2 ** (attempt - 1));
  }
  throw lastErr;
}

const FORMULA_PREFIXES = ['=', '+', '-', '@'];

// Prevent CSV/formula injection: Excel/Sheets can execute a cell starting with =, +, -, or @
// when the file is opened later. Mirrors sanitize_csv_value() in movie-search.py.
function sanitizeCsvValue(value: string): string {
  return FORMULA_PREFIXES.some((p) => value.startsWith(p)) ? `'${value}` : value;
}

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function appendMovieToCsv(row: Movie): Promise<void> {
  const headers = csvHeaders.length ? csvHeaders : Object.keys(row);
  const needsHeader = !fs.existsSync(csvPath) || fs.statSync(csvPath).size === 0;
  const rowValues = headers.map((h) => (row as unknown as Record<string, string>)[h] ?? '');
  const lines: string[] = [];
  if (needsHeader) lines.push(headers.map(escapeCsvField).join(','));
  lines.push(rowValues.map((v) => escapeCsvField(sanitizeCsvValue(v))).join(','));
  await fs.promises.appendFile(csvPath, lines.join('\n') + '\n', 'utf-8');
  if (needsHeader) csvHeaders = headers;
}

// Delete has no append-only equivalent — the whole file is regenerated from the in-memory
// `movies` array (source of truth once loaded), written to a temp file first and renamed into
// place so a crash mid-write can't leave src/movies.csv truncated or half-written.
async function rewriteCsvFile(): Promise<void> {
  const headers = csvHeaders.length ? csvHeaders : (movies[0] ? Object.keys(movies[0]) : []);
  const lines = [headers.map(escapeCsvField).join(',')];
  for (const movie of movies) {
    const rowValues = headers.map((h) => (movie as unknown as Record<string, string>)[h] ?? '');
    lines.push(rowValues.map((v) => escapeCsvField(sanitizeCsvValue(v))).join(','));
  }
  const tmpPath = `${csvPath}.tmp`;
  await fs.promises.writeFile(tmpPath, lines.join('\n') + '\n', 'utf-8');
  await fs.promises.rename(tmpPath, csvPath);
}

app.get('/api/tmdb/search', async (req: Request, res: Response) => {
  if (!TMDB_API_KEY) {
    res.status(503).json({ error: 'TMDB_API_KEY not configured on server' });
    return;
  }
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const actor = typeof req.query.actor === 'string' ? req.query.actor.trim() : '';
  if (!query && !actor) {
    res.status(400).json({ error: 'query or actor is required' });
    return;
  }

  try {
    let results: TmdbMovieSummary[];
    if (actor) {
      const personRes = await tmdbGet<TmdbSearchPersonResponse>('/search/person', { query: actor });
      const person = personRes.results[0];
      if (!person) {
        res.json({ results: [] });
        return;
      }
      const creditsRes = await tmdbGet<TmdbPersonCreditsResponse>(`/person/${person.id}/movie_credits`);
      results = query
        ? creditsRes.cast.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
        : creditsRes.cast;
    } else {
      const searchRes = await tmdbGet<TmdbSearchMovieResponse>('/search/movie', { query });
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
    console.error('TMDB search failed:', err);
    res.status(502).json({ error: 'TMDB request failed' });
  }
});

app.post('/api/tmdb/import', async (req: Request, res: Response) => {
  if (!TMDB_API_KEY) {
    res.status(503).json({ error: 'TMDB_API_KEY not configured on server' });
    return;
  }
  const movieId = Number((req.body as { movieId?: unknown } | undefined)?.movieId);
  if (!Number.isInteger(movieId) || movieId <= 0) {
    res.status(400).json({ error: 'Invalid movieId' });
    return;
  }
  if (movies.some((m) => m['Movie ID'] === String(movieId))) {
    res.status(409).json({ error: 'Movie already in catalogue' });
    return;
  }

  try {
    const [details, credits] = await Promise.all([
      tmdbGet<TmdbMovieDetails>(`/movie/${movieId}`),
      tmdbGet<TmdbCreditsResponse>(`/movie/${movieId}/credits`),
    ]);

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

    await appendMovieToCsv(row);
    movies.push(row);
    res.status(201).json(row);
  } catch (err) {
    console.error('TMDB import failed:', err);
    res.status(502).json({ error: 'Failed to import movie from TMDB' });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
