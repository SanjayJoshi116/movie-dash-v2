import axios from 'axios';

/**
 * The server's `{ error }` text from a failed axios request, or `undefined` when it sent none.
 * Blank text counts as none, so callers' `??` fallback still shows a message (B180).
 */
export function serverErrorMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const body: unknown = err.response?.data;
  if (typeof body === 'object' && body !== null) {
    const { error } = body as { error?: unknown };
    if (typeof error === 'string' && error.trim()) return error;
  }
  return undefined;
}

/** True when `err` is an axios error whose response has this HTTP status. */
export function hasStatus(err: unknown, status: number): boolean {
  return axios.isAxiosError(err) && err.response?.status === status;
}
