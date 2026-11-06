## Why

A code review and a security review of `server/server.ts` (2026-11-04) left six verified issues, three of them reproduced against the running code:
- **LAN exposure.** Express listens on every interface, and Vite's `host: true` plus its `/api` proxy also forwards LAN requests. Anyone on the same Wi-Fi can `curl` the list and `DELETE` every movie while `npm run dev` runs. `src/movies.csv` is gitignored and is usually the only copy. The security verifier confirmed this at 7/10. It was planned in `prod-deploy`, but that change is much larger and 0/18, so this fix is moved here to ship first.
- **A failed first load looks like an empty catalogue** (reproduced). If the CSV can't be read at boot (duplicate header, permissions, lock), `/api/health` reports `ok, movies: 0` and `/api/movies` returns `200 []`. The Dashboard then shows its "empty catalogue" state, and the user believes their data is gone.
- **A port conflict crashes with a raw stack trace** (reproduced: an unhandled `EADDRINUSE` error event). Under `concurrently`, Vite keeps running and proxies `/api` to whatever stale process holds port 5000.
- **An invalid `PORT` gives a cryptic crash** (reproduced): `abc` throws `ERR_SOCKET_BAD_PORT`, and `5000abc` is silently read as 5000.
- **Shutdown doesn't wait for catalogue writes.** On SIGINT/SIGTERM the process exits once sockets close, even mid-rewrite, and has no upper time bound.
- **`.env` read errors are swallowed.** A `.env` that exists but can't be read leaves `TMDB_API_KEY` unset with nothing in the log.

## What Changes

- Express binds to `127.0.0.1` by default, overridable with `HOST`. Vite binds to `localhost` by default; a new `npm run dev:lan` script (`vite --host`) opts in to LAN access. The Vite proxy targets `127.0.0.1:5000` explicitly, so `localhost` → `::1` resolution can't miss the IPv4-only API.
- A failed initial load (any error except a missing file) is reported:
  - `/api/health` returns `{ status: "error" }`.
  - Catalogue routes return a `500` with a generic message until a later reload succeeds. The client's existing first-load error screen and "Try Again" button cover it.
  - The process keeps running, so the user can fix the file and retry without restarting.
- A port that's already in use, or an invalid `PORT`, ends startup with a one-line message and a non-zero exit code.
- Shutdown stops accepting connections, waits for in-progress catalogue operations, and force-exits after a bounded timeout.
- A `.env` that exists but can't be read is logged. A missing `.env` stays silent.
- `prod-deploy` drops its bind-host work (tasks 3.1 and 3.2, the "local-only by default" requirement, and 5.2) and points to this change.

Out of scope:
- DNS-rebinding Host-header checks: the security verifier rated them 3/10, and binding to localhost already closes most of the risk.
- `trust proxy`: stays in `prod-deploy`.

## Capabilities

### New Capabilities
- `server-exposure`: the dev and API servers are reachable only from the local machine unless network access is explicitly enabled.

### Modified Capabilities
- `server-resilience`: adds requirements for visible startup load failures, clear startup configuration errors (port in use, invalid port, unreadable `.env`), and shutdown that doesn't interrupt catalogue writes.

## Impact

- **Code:**
  - New `server/bootstrap.ts` with testable entry helpers (port parsing, env loading, listen, shutdown); it must be added to `server/tsconfig.json` `include`.
  - `server/server.ts` (uses the helpers).
  - `server/app.ts` (load-failure state, `drain()` on the returned object).
  - `vite.config.ts` (host, proxy target).
  - `package.json` (`dev:lan` script).
- **Tests:** server tests for the load-failure state, `drain()` and each bootstrap helper. e2e is unaffected (`baseURL` and `webServer.url` already use `localhost`).
- **Behaviour change:** other devices can no longer open the dev app by default; use `npm run dev:lan`. Any remote deployment must set `HOST=0.0.0.0` (none exists; the README says local-first).
- **Docs:** README (Getting Started, Deployment env vars, Security), CLAUDE.md server/Vite paragraphs, `.env.example` (`HOST`), and the `prod-deploy` change artifacts.
