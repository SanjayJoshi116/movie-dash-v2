import axios from 'axios';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
export const TMDB_MAX_ATTEMPTS = 3;
export const TMDB_RETRY_BACKOFF_MS = 500; // doubles each attempt: 500ms, 1000ms — mirrors movie-search.py's Retry(backoff_factor=2)
const TMDB_ATTEMPT_TIMEOUT_MS = 10000;
export const TMDB_DEADLINE_MS = 15000;

/**
 * The only error type a TmdbClient throws. It deliberately carries no reference to the underlying
 * HTTP-client error: an AxiosError's config/request hold the api_key query param in plaintext, and
 * logging it (console.error → util.inspect) would print the key. Status/code/path are all that
 * callers and logs need.
 */
export class TmdbRequestError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly path: string;

  constructor(path: string, status?: number, code?: string, detail?: string) {
    const what = status !== undefined ? `HTTP ${status}` : (code ?? detail ?? 'request failed');
    super(`TMDB ${path} failed: ${what}`);
    this.name = 'TmdbRequestError';
    this.path = path;
    this.status = status;
    this.code = code;
  }
}

/** HTTP status of a TMDB failure, or undefined for network errors / non-TMDB errors. */
export function tmdbErrorStatus(err: unknown): number | undefined {
  return err instanceof TmdbRequestError ? err.status : undefined;
}

function redact(pathSegment: string, err: unknown): TmdbRequestError {
  if (axios.isAxiosError(err)) return new TmdbRequestError(pathSegment, err.response?.status, err.code, err.message);
  return new TmdbRequestError(pathSegment, undefined, undefined, err instanceof Error ? err.message : undefined);
}

export interface TmdbClient {
  get<T>(pathSegment: string, params?: Record<string, string>): Promise<T>;
}

export interface TmdbClientOptions {
  apiKey: string | undefined;
  /** Injectable so tests can exercise the retry/backoff path instantly. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable so tests can simulate TMDB responses without the network. */
  httpGet?: typeof axios.get;
  /** Total time budget for one get(), retries and waits included. */
  deadlineMs?: number;
  /** Injectable clock, so tests can advance time alongside the injected sleep. */
  now?: () => number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uses axios (Node's classic http/https core adapter), not the built-in fetch (undici) — on some
// Windows setups undici's TLS stack gets reset mid-handshake by AV/proxy HTTPS inspection even
// when the network is otherwise fine (curl and movie-search.py's requests/urllib3 are unaffected
// since neither goes through undici). Retries network errors and 429/5xx on top, mirroring
// movie-search.py's Retry(total=3, backoff_factor=2, status_forcelist=[429,500,502,503,504]).
//
// The whole call, retries and waits included, is bounded by `deadlineMs`: each attempt's timeout
// shrinks to the time left, and a wait that would reach the deadline fails the call instead.
export function createTmdbClient({
  apiKey, sleep = defaultSleep, httpGet = axios.get, deadlineMs = TMDB_DEADLINE_MS, now = Date.now,
}: TmdbClientOptions): TmdbClient {
  return {
    async get<T>(pathSegment: string, params: Record<string, string> = {}): Promise<T> {
      const deadline = now() + deadlineMs;
      for (let attempt = 1; ; attempt++) {
        try {
          const res = await httpGet<T>(`${TMDB_BASE}${pathSegment}`, {
            params: { ...params, api_key: apiKey },
            headers: { 'User-Agent': 'movie-dash' },
            // `timeout` is axios's socket-idle timer, so a trickling response could outlive it;
            // the abort signal is the wall-clock limit that actually ends the attempt.
            timeout: Math.max(1, Math.min(TMDB_ATTEMPT_TIMEOUT_MS, deadline - now())),
            signal: AbortSignal.timeout(Math.max(1, deadline - now())),
          });
          return res.data;
        } catch (err) {
          // Only failures that came from the network or TMDB can be transient; anything else
          // (a bug, a bad argument) fails at once.
          if (!axios.isAxiosError(err) || attempt === TMDB_MAX_ATTEMPTS) throw redact(pathSegment, err);
          const status = err.response?.status;
          if (status !== undefined && !RETRYABLE_STATUS.has(status)) throw redact(pathSegment, err);
          const backoff = TMDB_RETRY_BACKOFF_MS * 2 ** (attempt - 1);
          const wait = status === 429 ? Math.max(backoff, retryAfterMs(err.response?.headers) ?? 0) : backoff;
          if (now() + wait >= deadline) throw redact(pathSegment, err);
          await sleep(wait);
        }
      }
    },
  };
}

/** `Retry-After` in seconds, as ms; the HTTP-date form (or anything else) → undefined. */
function retryAfterMs(headers: unknown): number | undefined {
  const raw = (headers as Record<string, unknown> | undefined)?.['retry-after'];
  const value = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : '';
  return /^\d+$/.test(value) ? Number(value) * 1000 : undefined;
}
