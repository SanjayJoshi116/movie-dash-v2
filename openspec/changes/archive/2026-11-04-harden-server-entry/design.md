## Context

`server/server.ts` is a 22-line entry point. It loads `.env` (bare `catch {}`), calls `createApp()`, `app.listen(PORT)` with no host and no `'error'` listener, and `server.close(() => process.exit(0))` on SIGINT/SIGTERM. It discards `ready`. Inside `createApp()` the boot load's `.catch` logs and `.finally` sets `isReady = true`, so a failed load looks identical to an empty file. `vite.config.ts` has `host: true` and proxies `/api` to `http://localhost:5000`. The entry point has no tests, because everything in it runs at import time. See proposal.md for the findings.

## Goals / Non-Goals

**Goals:** fix the six findings; make the entry-point logic unit-testable without spawning processes; ship the localhost bind ahead of `prod-deploy` without conflicting with it.

**Non-Goals:** Host-header allowlist (DNS rebinding, rated 3/10); authentication; `trust proxy`, static serving, CSP (all stay in `prod-deploy`).

## Decisions

**D1 — `server/bootstrap.ts` holds the entry logic as small pure-ish functions.**
- The functions:
  - `parsePort(raw: string | undefined, fallback = 5000): number`: throws `ConfigError` unless `raw` matches `^\d+$` and is in 1–65535.
  - `loadEnvFile(file, { load = process.loadEnvFile, logger })`: ignores `ENOENT`, logs anything else with `describeError`.
  - `listen(app, port, host): Promise<http.Server>`: rejects on the server's `'error'` event, so `EADDRINUSE` becomes a rejected promise.
  - `installShutdown(server, { drain, timeoutMs = 10_000, exit = process.exit, signals = ['SIGINT', 'SIGTERM'] })`.
- `server.ts` becomes `main().catch(...)`. On a `ConfigError` or `EADDRINUSE` it prints one line (`Port 5000 is already in use — is another dev server still running?`) and calls `process.exit(1)`.
- Every dependency is injected, so tests call these directly. No child processes and no real signals are needed.
- *Alternative:* test `server.ts` by spawning `tsx`. Rejected because it is slow and flaky on Windows, especially around port and process cleanup (see the CLAUDE.md gotcha).

**D2 — Bind host.**
- `HOST` env, default `127.0.0.1`.
- `127.0.0.1` rather than `localhost`, so the bind address is unambiguous. Vite's proxy target changes to `http://127.0.0.1:5000`. Node ≥17 resolves `localhost` in OS order, often `::1` first on Windows, so the proxy would miss an IPv4-only listener.
- Vite: `server.host: 'localhost'`. Add `"dev:lan": "concurrently \"vite --host\" \"tsx watch server/server.ts\""`. The CLI flag overrides the config, so no `cross-env` dependency is needed. This matches `prod-deploy`'s own design §3 choice.
- In LAN mode only Vite is exposed. Express stays loopback and the proxy reaches it locally.
- Playwright needs no change: `baseURL`/`webServer.url` use `http://localhost:3000`, which Vite on `localhost` serves.

**D3 — Load-failure state in `createApp()`.**
- Add `let loadError: Error | null`. The boot `.catch` sets it; any later successful `reloadCatalogue()` clears it.
  - `ENOENT` already resolves to empty inside `loadCatalogue`, so it never sets `loadError`.
- `/api/health`: `{ status: loadError ? 'error' : isReady ? 'ok' : 'loading', movies }`.
- Catalogue routes (`/api/movies*`, `/api/tmdb/*`) get a check in the existing readiness middleware: if `loadError`, first `await reloadForRead()` (so a repaired file recovers on the next request), then `500 { error: 'Catalogue file could not be loaded; see server log' }` if it is still set.
  - The message is generic; the column name stays in the log, matching the "no internals in responses" rule.
- The middleware becomes async, so it goes through `route()`.
- The client needs no change. Axios rejects on `500`, `MoviesContext` shows its first-load error screen, and "Try Again" calls `refetch()`, which is exactly the retry path.
- A reload failure *after* a successful first load keeps today's "serve last copy" behaviour, since that data is real.
- *Alternative:* exit the process on load failure. Rejected because the user would have to fix the file and restart `npm run dev` (also killing Vite under `concurrently`). An in-app error with retry is friendlier.

**D4 — Graceful shutdown via `drain()`.**
- `createApp()` also returns `drain(): Promise<void>`, which is `enqueue(async () => undefined)`. It resolves once every op queued before it has settled.
- `installShutdown` behaves like this:
  - On the first signal, it calls `server.close()`, which stops accepting connections, and also `server.closeIdleConnections()` (Node ≥18.2).
  - It then awaits `drain()` *and* the close callback, then `exit(0)`.
  - A `setTimeout(timeoutMs).unref()` calls `exit(1)` if they don't finish in time.
  - A second signal exits immediately with 1.
- Ops whose HTTP client disconnected still sit in the queue, so `drain()` covers the "tab closed mid-delete" case.
- Import's TMDB fetch runs *outside* the queue (by design). A signal during that fetch can exit before the import enqueues, which is safe: nothing was written, and the client gets a connection error.
- The 10 s limit is shorter than a worst-case TMDB retry (~31 s), on purpose: shutdown shouldn't wait on the network.

**D5 — `prod-deploy` hand-off.** In that change:
- Remove tasks 3.1 and 3.2 and the "Development servers are local-only by default" requirement from its `app-hosting` delta.
- Reword 5.2 and the docs tasks that mention `HOST`/`dev:lan` to "already shipped by `harden-server-entry`".
- Keep its design §3 as historical context, with a note at the top of the section.

## Risks / Trade-offs

- [Risk] A developer used to opening the app from a phone loses that by default. → `npm run dev:lan`, documented in the README Getting Started section and the CHANGELOG.
- [Risk] `127.0.0.1` excludes IPv6 loopback clients (`::1`). → Every local client here goes through Vite's proxy, which now targets `127.0.0.1` explicitly. Direct API calls should use `http://127.0.0.1:5000`. Documented.
- [Trade-off] In the load-failure state, every catalogue request re-attempts the load (one CSV read each). It is cheap at this dataset size (~2k rows) and gives instant recovery.
- [Risk] `server.closeIdleConnections` can be missing on old Node versions. → `engines` / README require Node ≥22, and the code guards with an optional call.

## Migration Plan

No data migration. The bind change takes effect on the next `npm run dev`. Rollback = revert the commit, or set `HOST=0.0.0.0` and use `dev:lan` in the meantime.
