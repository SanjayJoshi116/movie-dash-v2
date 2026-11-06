// Entry-point helpers for server.ts, kept free of import-time side effects so tests can call them
// directly with injected dependencies (no child processes, real signals, or process.exit).
import type http from 'http';
import type { Express } from 'express';

/** One-line, secret-free description of an error for logs. */
export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** A startup setting is invalid; server.ts prints the message and exits with code 1. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export const DEFAULT_PORT = 5000;

/** Strict port parse: only plain digits in 1–65535 (parseInt would accept "5000abc"). */
export function parsePort(raw: string | undefined, fallback = DEFAULT_PORT): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = raw.trim();
  const port = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(`Invalid PORT "${raw}": expected a whole number from 1 to 65535`);
  }
  return port;
}

/**
 * TRUST_PROXY → Express 'trust proxy'. Unset/empty/"false" → undefined (not trusted, the default);
 * "true" → true; digits → hop count; anything else (e.g. "loopback" or an IP/CIDR list) is passed
 * through for Express to interpret.
 */
export function parseTrustProxy(raw: string | undefined): boolean | number | string | undefined {
  const value = raw?.trim() ?? '';
  if (value === '' || value.toLowerCase() === 'false') return undefined;
  if (value.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

/** The --production flag (what `npm run server:prod` passes) or NODE_ENV=production. */
export function isProductionMode(argv: readonly string[], env: NodeJS.ProcessEnv): boolean {
  return argv.includes('--production') || env.NODE_ENV === 'production';
}

type Logger = Pick<Console, 'log' | 'error'>;

/** Loads an optional .env file: a missing file is silent, any other read error is logged. */
export function loadEnvFile(
  file: string,
  { load = (f: string) => process.loadEnvFile(f), logger = console }: { load?: (f: string) => void; logger?: Logger } = {},
): void {
  try {
    load(file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    logger.error(`Could not read ${file} (continuing without it): ${describeError(err)}`);
  }
}

/** Starts listening; resolves once bound, rejects on 'error' (e.g. EADDRINUSE) instead of crashing. */
export function listen(app: Express, port: number, host: string): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    const onError = (err: Error) => {
      server.close();
      reject(err);
    };
    server.once('error', onError);
    server.once('listening', () => {
      server.off('error', onError);
      resolve(server);
    });
  });
}

export interface ShutdownOptions {
  /** Waits for in-progress catalogue operations (createApp().drain). */
  drain: () => Promise<void>;
  timeoutMs?: number;
  exit?: (code: number) => void;
  signals?: NodeJS.Signals[];
  /** Where to listen for signals; tests pass an EventEmitter. */
  target?: Pick<NodeJS.EventEmitter, 'on'>;
  logger?: Logger;
}

type ClosableServer = Pick<http.Server, 'close'> & { closeIdleConnections?: () => void };

export const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * On the first signal: stop accepting connections, wait for open requests and queued catalogue
 * writes, then exit(0). Forced exit(1) after `timeoutMs`, or immediately on a second signal.
 */
export function installShutdown(server: ClosableServer, opts: ShutdownOptions): void {
  const {
    drain,
    timeoutMs = SHUTDOWN_TIMEOUT_MS,
    exit = (code: number) => process.exit(code),
    signals = ['SIGINT', 'SIGTERM'],
    target = process,
    logger = console,
  } = opts;
  let shuttingDown = false;

  const onSignal = (signal: string) => {
    if (shuttingDown) {
      logger.log(`${signal} again — exiting now`);
      exit(1);
      return;
    }
    shuttingDown = true;
    logger.log(`${signal} received — finishing in-progress work (up to ${timeoutMs / 1000}s)`);

    const timer = setTimeout(() => {
      logger.error('Shutdown timed out; exiting with work still pending');
      exit(1);
    }, timeoutMs);
    timer.unref?.();

    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeIdleConnections?.();
    Promise.all([closed, drain().catch(() => undefined)]).then(() => {
      clearTimeout(timer);
      exit(0);
    });
  };

  for (const signal of signals) target.on(signal, () => onSignal(signal));
}
