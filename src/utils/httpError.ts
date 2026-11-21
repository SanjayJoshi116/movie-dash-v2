import axios from 'axios';

/** The server's `{ error }` text from a failed axios request, or `undefined` when it sent none. */
export function serverErrorMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const body: unknown = err.response?.data;
  if (typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  return undefined;
}

/** True when `err` is an axios error whose response has this HTTP status. */
export function hasStatus(err: unknown, status: number): boolean {
  return axios.isAxiosError(err) && err.response?.status === status;
}
