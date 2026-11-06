## Why

A code review and a security review of `server/app.ts` (2026-11-04) found several defects that were then verified against the code. Three of them were reproduced with a throwaway Node script against the repo's installed axios / csv-parser / Express 4.22:
- Every TMDB failure writes the TMDB API key to the server log (6 plaintext copies per `util.inspect` of the raw AxiosError).
- An import whose TMDB response body is `null` throws outside any `catch`. Express 4 does not route async rejections, so this is an unhandled rejection, which under Node 24 kills the API process.
- A CSV header with a duplicated column name (the BOM + `movie-search.py` path in `BUG_BACKLOG.md` B3) loads every row with the later, empty column's value. The next delete rewrite then makes that loss permanent.

The rest are confirmed by reading the code: the ETag can repeat across restarts (B16), external writes can be overwritten during a delete, Windows file locks cause transient failures, and some routes read stale state. Together they can lose user data, leak a credential, or take the server down, so they should be fixed before more features go on top.

## What Changes

- TMDB client failures are surfaced as a redacted error (HTTP status, error code, request path only). The server never logs a raw HTTP-client error object, so the API key cannot reach logs. (B2)
- Errors thrown anywhere in an async route handler are turned into a generic `500` response instead of an unhandled rejection. Import row building tolerates `null` / partial TMDB bodies.
- The catalogue loader rejects a file whose header repeats a column name (after BOM strip/trim). While that state stands, mutations are refused with a clear storage error, so a rewrite can never destroy the shadowed column. Reads keep serving the last good copy, and the server logs which column is duplicated. (Server half of B3.)
- The `/api/movies` validator includes a per-process identifier, so a validator cached from an earlier server process never matches. (B16)
- A delete rewrite checks right before replacing the file whether another tool changed it during the rewrite. If so, it redoes the delete against the fresh contents instead of clobbering them.
- Replacing the catalogue file retries briefly on transient Windows lock errors (`EPERM`/`EBUSY`/`EACCES`) before reporting failure.
- A mutation whose write succeeded is reported as success even if refreshing the post-write bookkeeping fails. The next operation re-reads the file instead.
- `GET /api/tmdb/search` waits for the initial load (`503` before ready) and computes `alreadyImported` against a freshly reconciled catalogue. `GET /api/movies/:id` also reconciles with the file before answering.
- Actor-based TMDB search de-duplicates movies by id and orders them by popularity before taking the top 20.

Out of scope, each owned elsewhere:
- Extra CSV formula-prefix hardening (tab/CR/`;`): the security review rated it a false positive.
- Binding the server to localhost: `prod-deploy`.
- The Python writers' `utf-8-sig` fix: the Python half of B3, `csv-tools-robustness`.

## Capabilities

### New Capabilities
- `server-resilience`: the API server keeps credentials out of logs and survives unexpected errors in request handlers without crashing.

### Modified Capabilities
- `catalog-persistence`: adds requirements for duplicate-header protection, validators that stay unique across restarts, concurrent-external-write safety during delete, transient-lock tolerance, success reporting after a committed write, and fresh state on read-only routes (search `alreadyImported`, get-by-id, actor result ordering).

## Impact

- **Code:** `server/tmdb.ts` (redacted error type, status helper), `server/app.ts` (logging, async error forwarding, header check, ETag, delete re-check, rename retry, `markWritten`, search/get-by-id gating, actor dedupe).
- **Tests:**
  - `server/__tests__/*`: new cases. `helpers.ts`'s `axiosError()` stub may need to produce the new redacted error shape.
  - The e2e suite is unaffected (no UI or API-shape change, apart from `alreadyImported` being more accurate and actor results being reordered).
- **APIs:** no new endpoints or response fields. `/api/tmdb/search` can now return `503` during startup. The ETag format changes, which forces one revalidation for existing clients.
- **Docs:**
  - `CLAUDE.md`'s TMDB/op-queue paragraphs need a note on redacted errors and the duplicate-header guard.
  - `BUG_BACKLOG.md`: close B2 and B16 and mark B3's server half done.
