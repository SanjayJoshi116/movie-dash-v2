## Context

All routes and catalogue state live in the `createApp()` closure in `server/app.ts`. TMDB I/O goes through the `TmdbClient` interface (`server/tmdb.ts`), which tests replace with `stubTmdb()`. Its errors are raw `AxiosError`s, and `app.ts` both logs them whole and sniffs `axios.isAxiosError(err) && err.response?.status === 404`. Mutations run inside `enqueue()` and call `reloadIfChanged()`, which compares a `{mtimeMs, size}` fingerprint. Express is 4.22, which ignores rejected promises from async handlers. Upgrading to Express 5 belongs to `upgrade-major-deps`. See proposal.md for the findings themselves.

## Goals / Non-Goals

**Goals:**
- Fix each verified finding with the smallest change that fits the existing patterns (closure state, op queue, injectable seams).
- Add a server test for every spec scenario.

**Non-Goals:**
- Express 5 migration, binding to localhost, CSV formula-prefix changes, Python writer changes.
- Making delete fully race-free against external writers. That needs OS file locking, which the Python tools don't use. The goal is shrinking the window from "whole rewrite" to "stat → rename".

## Decisions

**D1 — Redacted TMDB errors at the client boundary.**
- `createTmdbClient` catches every failure and throws a new `TmdbRequestError` with these fields: `status?: number`, `code?: string`, `path: string` (the path segment, no query string), and a `message` built from them.
- The original AxiosError is *not* attached as `cause`, because `util.inspect` would print it.
- `app.ts` replaces `axios.isAxiosError` with an exported `tmdbErrorStatus(err)` helper, and logs TMDB failures with a one-line summary instead of the object.
- `helpers.ts`'s `axiosError(status)` becomes `tmdbError(status)`, returning a `TmdbRequestError`.
- *Alternative:* redact in `app.ts`, either by deleting `config`/`request` or with a log formatter. Rejected because every future call site would have to remember it. Redacting once at the boundary also covers future routes.
- *Alternative:* move the key into a header (TMDB v4 bearer). It needs a different credential type than the `TMDB_API_KEY` shared with `movie-search.py`, so it's deferred.

**D2 — Async error forwarding via a wrapper.**
- Add `const route = (fn) => (req, res, next) => fn(req, res, next).catch(next)` and wrap every async handler with it. The existing error middleware already returns a generic `500` and logs.
- The import also normalizes the TMDB bodies: `details ?? {}`, `credits ?? {}`.
- `logger.error('Unhandled error:', err)` in the middleware stays. Thanks to D1, TMDB errors reaching it are already redacted.
- *Alternative:* a global `process.on('unhandledRejection')` in `server.ts`. Rejected: the request would hang with no response, and it hides bugs.

**D3 — Duplicate header detection on load.**
- `loadCatalogue()` checks the mapped header list in its `'headers'` handler. On a repeat it rejects with a `DuplicateHeaderError` naming the column, and it destroys the stream.
- `reloadCatalogue()` therefore throws before swapping state, so `fingerprint` stays stale. Every later `reloadIfChanged()` re-reads, and fails again until the file is fixed:
  - Mutations hit that inside the queue and return their existing storage-error `500`s.
  - `GET /api/movies` keeps its existing "serve last loaded copy" catch.
  - At boot with a bad file, `movies` stays `[]` and `ready` resolves through its existing catch.
- As a second guard, `rewriteCsvFile` throws if `headers` has duplicates.
- *Alternative:* auto-dedupe by keeping the first non-empty column. Rejected: it silently guesses which data is real. The user should repair the file. The Python half of B3 stops it happening.

**D4 — Boot-scoped ETag.** `const bootId = crypto.randomUUID().slice(0, 8)` is created once per `createApp`. The ETag becomes `W/"${bootId}-v${catalogueVersion}"`. A content hash was rejected: it costs a full serialization per request.

**D5 — Re-check before rename in delete.**
- `rewriteCsvFile` writes the temp file, then compares `statFingerprint()` with `fingerprint`.
- On mismatch it unlinks the temp file and throws `CatalogueChangedError`.
- The delete op catches that and runs `reloadCatalogue()`. It then recomputes `target`/`remaining`, returning `404` if the target is gone, and retries up to 3 attempts in total. After that the delete fails with a storage `500`.
- This all happens inside the same queued op, so no other in-app op interleaves.

**D6 — Bounded rename retry.**
- `renameWithRetry(tmp, dest)` retries only `EPERM`/`EBUSY`/`EACCES`, for 5 attempts with backoff 50, 100, 200, 400 ms (~750 ms worst case). It rethrows anything else immediately.
- Tests need a seam: `CreateAppOptions.fsHooks?: { rename?: typeof fs.promises.rename; stat?: typeof fs.promises.stat }`, matching the `onBeforeLoad` / injectable-`sleep` style. Production uses `fs.promises`.

**D7 — Non-fatal `markWritten`.**
- Wrap its stat in try/catch. On failure, log it and set `fingerprint = null`, so the next `reloadIfChanged()` reloads whenever the file exists. Still bump `catalogueVersion`.
- The op then resolves successfully, since the write and the memory swap already happened.

**D8 — Fresh state on read-only routes.**
- Add `/api/tmdb/search` to the readiness middleware's path list.
- `GET /api/tmdb/search` and `GET /api/movies/:id` both run `await enqueue(reloadIfChanged)` in a try/catch that logs and falls back to the in-memory copy, the same as `GET /api/movies`.
- For search, the reload runs *after* the TMDB call returns, so the queue is never held across network I/O.

**D9 — Actor results.**
- Dedupe `creditsRes.cast` by `id`, keeping the first entry, then sort by `popularity` descending before `slice(0, 20)`.
- Add `popularity?: number` to `TmdbMovieSummary`. A missing popularity sorts as 0. Array sort is stable, so ties keep TMDB's order.

## Risks / Trade-offs

- [Risk] Changing how TMDB errors look breaks the existing tests that throw `axiosError(404)`. → Update the helper in the same task and run the whole server suite.
- [Risk] A duplicate-header file now blocks all mutations until it is fixed by hand. → The log message names the column. The intent matches the spec: refusing is safer than corrupting data.
- [Risk] The D5 stat→rename window still exists, though it is now microseconds. → Accepted and documented in Non-Goals.
- [Trade-off] The rename retry can add up to ~750 ms to a failing delete. It only happens on lock errors.
- [Risk] The BOM-regex escape in `app.ts` / `helpers.ts` gets mangled by editing tools (CLAUDE.md gotcha). → Task 6.2 greps for it.

## Migration Plan

Server-only change, with no data migration. The ETag format change causes one cache miss for each open client. Rollback = revert the commit.
