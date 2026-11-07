## Context

See proposal.md for the 10 findings. Every fix sits inside existing seams, so none of them needs a new architectural pattern:
- the `createApp()` closure in `server/app.ts` (the op queue, `reloadCatalogue`/`reloadIfChanged`, `appendMovieToCsv`, `rewriteCsvFile`)
- `createTmdbClient()` in `server/tmdb.ts`, whose `sleep`/`httpGet` can be injected
- the pure parsers in `server/bootstrap.ts`

The constraints come from CLAUDE.md:
- Every mutation goes through `enqueue()` + `reloadIfChanged()`.
- TMDB network I/O never happens while the queue is held.
- The BOM escape must survive the edit (check with `grep -n uFEFF` afterwards).
- New server-compiled files go in `server/tsconfig.json` `include`.

## Goals / Non-Goals

**Goals:**
- Make the 10 confirmed findings impossible, each with a server test that fails before its fix.
- Keep every existing catalogue-safety guarantee: atomic rewrite, external-edit detection, the formula guard.

**Non-Goals:**
- Changing the client. AddMovieModal already shows a generic error on `502`.
- Rewriting rows that have blank-header data in place.
- Handling encodings other than UTF-8.
- Retry/backoff changes in `movie-search.py`.

## Decisions

**1. Blank header cells (`loadCatalogue`).**
- `mapHeaders` returns `null` for a header that is empty after BOM-strip + trim. csv-parser then drops that column from every row.
- `findDuplicateHeader` then only ever sees real names, and `csvHeaders` excludes the blanks, so a later rewrite drops those columns.
- *Alternative considered:* keep the blank columns and allow duplicate `''`. Rejected: rows are objects, so two `''` keys collapse into one value. A rewrite would then copy one cell into both columns, which is silent corruption rather than a visible drop. Blank-named columns can't be shown or edited in the app anyway.

**2. Served import row (`appendMovieToCsv` → `projectRow`).**
- A helper `projectRow(row, headers)` builds `Record<header, row[header] ?? ''>`. Inside the queue, the import pushes `projectRow(row, csvHeaders)` (after `appendMovieToCsv`, which may set `csvHeaders` for a new file) and returns that same object in the `201`.
- *Alternative considered:* add the missing columns to the header. Rejected: the spec explicitly says import does not add columns, and it would need a full rewrite on every import.

**3. `TRUST_PROXY=true` → `ConfigError`.**
- `parseTrustProxy` throws a `ConfigError` naming the value and suggesting `1` or an address list. `server.ts` already calls it inside `main()`, whose catch prints `ConfigError` messages on one line and exits 1. `createApp`'s `trustProxy` option type drops `true`.
- *Alternative considered:* silently map `true` → `1`. Rejected: it guesses the operator's topology. One proxy is common, but two proxies plus `1` would rate-limit on the inner proxy's address. Failing loudly costs one config edit.

**4. Validating the TMDB details body (import route).**
- After the fetch, the import requires `rawDetails` to be a non-null object with a non-empty `title` string; otherwise `502 "TMDB request failed"` and a log line through `describeError`-style text.
- The credits body is still optional: `rawCredits ?? {}`, plus a check that it is an object, else `{}`.
- The `hardening.test.ts` null-body test is rewritten to expect `502`, no row, and a successful re-import afterwards.
- *Why validate details only:* a movie with no title is useless and shows up as a blank Dashboard entry. Missing credits still give a usable row.

**5. Preserving BOM and line endings.**
- `reloadCatalogue` reads the first 64 KiB with `fs.promises.open` + `read` before streaming. From that it records `fileFormat = { bom: buf starts EF BB BF, eol: first '\n' preceded by '\r' ? '\r\n' : '\n' }`.
- `rewriteCsvFile` joins lines with `fileFormat.eol` and prefixes `﻿` when `bom` is set.
- `appendMovieToCsv` uses `fileFormat.eol` for its line join, terminator, and missing-trailing-newline prefix (the existing last-byte check stays `0x0a`; a file ending `\r` alone is treated as having no newline).
- A missing or empty file → `{ bom: false, eol: '\n' }`.
- The probe sits inside `reloadCatalogue`, which already runs on every external change, so the format tracks hand edits.
- *Alternative considered:* sniff inside the csv-parser stream. Rejected: csv-parser gives no hook for raw bytes, and a separate small read is simpler.

**6. Early 409 (import route).**
- `await reloadForRead()` before the fast-path check.
- That puts one queued `reloadIfChanged` ahead of the TMDB calls. It is cheap (a `stat`) and doesn't hold the queue across network I/O. The authoritative check inside the queue is unchanged.

**7. Recovering from a load error.**
- The readiness middleware, while `loadError` is set, calls `enqueue(reloadCatalogue)` (forced) inside try/catch instead of `reloadForRead()`.
- `reloadCatalogue` already clears `loadError` on success.
- Forced re-reads only happen while the server is already broken, so the cost doesn't matter.

**8. TMDB deadline (`createTmdbClient`).**
- New options: `deadlineMs` (default `15000`) and `now` (default `Date.now`, injectable alongside `sleep`).
- Each attempt's axios `timeout` = `min(10000, remaining)`.
- Retryable means:
  - an AxiosError with a `RETRYABLE_STATUS` response, or
  - an AxiosError with no response (network error or timeout).
  - A non-Axios error is thrown at once, wrapped by `redact`.
- The wait before a retry is `max(backoff, Retry-After seconds × 1000)`, with `Retry-After` parsed as an integer number of seconds (HTTP-date form → ignored, backoff used). If `wait ≥ remaining` the client throws instead of sleeping.
- `TMDB_MAX_ATTEMPTS` (3) still caps attempts.
- *Alternative considered:* never retry timeouts. Rejected: TMDB timeouts are often transient, and the deadline already bounds the cost.

**9. One-line logging.**
- The error middleware logs `describeError(err)`.
- The boot `.catch` types `err` as `unknown`, stores `err instanceof Error ? err : new Error(describeError(err))` in `loadError`, and logs `describeError(err)`.

**10. Shared CSV escaping.**
- New `src/utils/csvEscape.ts` exports `FORMULA_PREFIXES`, `sanitizeCsvValue`, `escapeCsvField`, with no DOM or Node imports.
- `server/app.ts` and `src/utils/exportCsv.ts` import it, and it is added to `server/tsconfig.json` `include`.
- For a brand-new file, `appendMovieToCsv` writes the header `[...CATALOGUE_COLUMNS]`, a value import from `src/types/movie.ts`, which is already included.
- `rewriteCsvFile` with empty `csvHeaders` falls back to `CATALOGUE_COLUMNS` as well.
- `normalizeStoredValue`/`ESCAPED_FORMULA` stay server-only (read path).

## Risks / Trade-offs

- **[`TRUST_PROXY=true` deployments stop booting]** → Proposal marks it BREAKING. The README and `.env.example` changes show `1`, and the error message says exactly what to set.
- **[Rewrite drops blank-header columns that held data]** → Logged at load ("ignoring N blank header column(s)") so the user can notice. Such data is invisible to the app anyway.
- **[Format probe reads a file that then changes before the stream]** → Same window as the existing stat-then-read. The fingerprint was taken first, so the next op reloads.
- **[15 s deadline too short on slow links]** → Each attempt still gets up to 10 s, and the per-call figure is a constant that's easy to tune.
- **[Shared module couples the server build to `src/`]** → Already true for `src/types/movie.ts`. The module is pure TS with no browser globals.

## Migration Plan

Deploy as usual. Anyone using `TRUST_PROXY=true` sets `TRUST_PROXY=1` (or an address list) first. No data migration is needed: existing CSVs keep their BOM and line endings from the first rewrite onward. To roll back, revert the commit. Files written meanwhile stay valid CSV.
