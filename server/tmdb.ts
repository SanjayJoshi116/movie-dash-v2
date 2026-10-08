import axios from 'axios';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
export const TMDB_MAX_ATTEMPTS = 3;
export const TMDB_RETRY_BACKOFF_MS = 500; // doubles each attempt: 500ms, 1000ms — mirrors movie-search.py's Retry(backoff_factor=2)

export interface TmdbClient {
  get<T>(pathSegment: string, params?: Record<string, string>): Promise<T>;
}

export interface TmdbClientOptions {
  apiKey: string | undefined;
  /** Injectable so tests can exercise the retry/backoff path instantly. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable so tests can simulate TMDB responses without the network. */
  httpGet?: typeof axios.get;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uses axios (Node's classic http/https core adapter), not the built-in fetch (undici) — on some
// Windows setups undici's TLS stack gets reset mid-handshake by AV/proxy HTTPS inspection even
// when the network is otherwise fine (curl and movie-search.py's requests/urllib3 are unaffected
// since neither goes through undici). Retries network errors and 429/5xx on top, mirroring
// movie-search.py's Retry(total=3, backoff_factor=2, status_forcelist=[429,500,502,503,504]).
export function createTmdbClient({ apiKey, sleep = defaultSleep, httpGet = axios.get }: TmdbClientOptions): TmdbClient {
  return {
    async get<T>(pathSegment: string, params: Record<string, string> = {}): Promise<T> {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= TMDB_MAX_ATTEMPTS; attempt++) {
        try {
          const res = await httpGet<T>(`${TMDB_BASE}${pathSegment}`, {
            params: { ...params, api_key: apiKey },
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
    },
  };
}
