## Why

The Batch A code review (`BUG_BACKLOG.md` §6: `server/app.ts`, `server/server.ts`, `server/tmdb.ts`, `server/bootstrap.ts`, 2026-11-07) raised 10 findings, and all 10 were confirmed against the code. Three of them can make user data look lost or wrong:
- A header with trailing blank columns takes the whole catalogue offline.
- An import can show fields that were never written to disk.
- A delete rewrite drops the file's BOM, so Excel garbles non-ASCII titles.

The security review of the same files found nothing at confidence ≥ 8. It did suggest one hardening step, one-line error logging, and that is finding 9 below.

## What Changes

1. **Blank header columns no longer block loading.** Header names that are empty after trimming (e.g. `...,Release Date,,` saved by Excel) are ignored as columns, not reported as duplicates. Real repeated names are still rejected.
2. **An import's in-memory row matches what was written.** The served row is projected onto the file's current header: columns missing from disk are dropped, and extra disk columns are present and empty. This matches what a reload would produce.
3. **BREAKING: `TRUST_PROXY=true` is rejected at startup.** It now fails with a `ConfigError` pointing to a hop count (`1`) or an address list. `true` trusts any client-supplied `X-Forwarded-For`, and `express-rate-limit` 8 flags it as `ERR_ERL_PERMISSIVE_TRUST_PROXY`.
4. **An unusable TMDB response fails the import with `502`.** A details body that is not an object with a non-empty `title` returns `502` and writes nothing. This covers a `null` body or an HTML page from a proxy. It reverses the current "null body imports a row of empty values" behaviour that `hardening.test.ts:80` asserts. A null *credits* body still imports, with no director or cast.
5. **Rewrites and appends keep the file's format.** The UTF-8 BOM and line-ending style (CRLF vs LF) detected at load are kept on every rewrite and append. New files are still written with no BOM and LF endings.
6. **The import's early `409` check reflects the file.** The early duplicate check runs after reconciling with the file on disk, so a row removed externally can be re-imported.
7. **Startup-failure recovery doesn't depend on the file changing.** While a load error is set, each catalogue request forces a full reload. Deleting the broken file then recovers to an empty catalogue without a restart.
8. **TMDB calls have a bounded total time.**
   - A single `TmdbClient.get` stops after a 15 s overall deadline.
   - Programming errors (non-HTTP errors) are not retried.
   - `429` honours `Retry-After` within the deadline.
   - The worst case drops from about 31.5 s per call (about 63 s for an actor search) to 15 s per call.
9. **Errors are logged in one line.** The catch-all error middleware and the boot-load failure log `describeError(err)`, not the error object or `err.message`.
10. **One shared CSV-escaping module.** `sanitizeCsvValue` / `escapeCsvField` / `FORMULA_PREFIXES` move into a shared `src/utils/csvEscape.ts`, used by both `server/app.ts` and `src/utils/exportCsv.ts`. A brand-new file's header is written in `CATALOGUE_COLUMNS` order instead of `Object.keys(row)` order.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `catalog-persistence`:
  - Header handling ignores blank column names (1).
  - Imported rows are served as stored (2).
  - The file's BOM and line endings are preserved on rewrite and append (5).
  - The early duplicate rejection reflects the current file (6).
- `server-resilience`:
  - `TRUST_PROXY=true` is a startup configuration error (3).
  - An unusable TMDB import response returns `502` instead of a blank row (4).
  - Startup-failure recovery works when the file is removed (7).
  - TMDB failures are reported within a bounded time (8).
  - Unexpected errors are logged without the error object (9).

## Impact

- **Code:**
  - `server/app.ts`: `findDuplicateHeader`/`loadCatalogue`, `appendMovieToCsv`, `rewriteCsvFile`, the import route, the readiness middleware, the error middleware and the boot catch.
  - `server/tmdb.ts`: retry loop.
  - `server/bootstrap.ts`: `parseTrustProxy`.
  - `src/utils/exportCsv.ts`.
  - New `src/utils/csvEscape.ts`, which must be added to `server/tsconfig.json` `include`.
- **Tests:**
  - New and changed cases in `server/__tests__/hardening.test.ts` (null-body test flips to `502`), `persistence.test.ts`, `bootstrap.test.ts`, `tmdb-client.test.ts` and `hosting.test.ts` (the `TRUST_PROXY` cases).
- **Docs:** README (`TRUST_PROXY` table row: drop `true`), `.env.example` comment, CLAUDE.md (new shared module, the TMDB deadline, `TRUST_PROXY`), and `BUG_BACKLOG.md` (log B51–B60, tick CR/SR for rows 3 and 69).
- **Behaviour/config:** deployments with `TRUST_PROXY=true` must switch to `1` or an address list.
