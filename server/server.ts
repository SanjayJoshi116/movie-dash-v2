import fs from 'fs';
import path from 'path';
import { createApp } from './app';
import {
  ConfigError, installShutdown, isProductionMode, listen, loadEnvFile, parsePort, parseTrustProxy,
} from './bootstrap';

// Loopback by default: the API has no authentication, so it must not be reachable from the LAN
// unless a deployment opts in with HOST (e.g. HOST=0.0.0.0). Vite's dev proxy targets 127.0.0.1.
const DEFAULT_HOST = '127.0.0.1';

async function main(): Promise<void> {
  // .env is optional locally; TMDB routes degrade gracefully if the key is absent.
  loadEnvFile(path.join(process.cwd(), '.env'));

  const port = parsePort(process.env.PORT);
  const host = process.env.HOST?.trim() || DEFAULT_HOST;

  // `server:prod` passes --production rather than setting NODE_ENV, since `NODE_ENV=x cmd` is
  // POSIX-only and npm scripts run under cmd.exe on Windows. Set before createApp() so Express
  // (which reads NODE_ENV when the app is created) also runs in production mode.
  const production = isProductionMode(process.argv, process.env);
  if (production) process.env.NODE_ENV = 'production';

  // Production serves the built SPA too, so one process/port is the whole app. Only in production:
  // a stale dist/ from an old build must not shadow anything in dev, where Vite owns the frontend.
  // process.cwd(), like the CSV path below — dist/ sits at the repo root in dev and compiled runs.
  const distDir = path.join(process.cwd(), 'dist');
  const indexHtml = path.join(distDir, 'index.html');
  let staticDir: string | undefined;
  if (production) {
    if (fs.existsSync(indexHtml)) staticDir = distDir;
    else console.error(`${indexHtml} not found — run \`npm run build\`; serving the API only`);
  }

  // Resolved from process.cwd(), not __dirname: __dirname is server/ under `tsx watch` but
  // server/dist/server/ once compiled, while both dev and server:prod run from the repo root.
  const { app, drain } = createApp({
    csvPath: path.join(process.cwd(), 'src', 'movies.csv'),
    tmdbApiKey: process.env.TMDB_API_KEY,
    clientOrigin: process.env.CLIENT_ORIGIN,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    staticDir,
  });

  let server;
  try {
    server = await listen(app, port, host);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      throw new ConfigError(`Port ${port} is already in use on ${host} — is another dev server still running?`);
    }
    throw err;
  }
  console.log(`Server running on http://${host}:${port}${staticDir ? ' (API + built app)' : ' (API only)'}`);
  installShutdown(server, { drain });
}

main().catch((err: unknown) => {
  console.error(err instanceof ConfigError ? err.message : err);
  process.exit(1);
});
