## 1. Redacted TMDB errors (B2)

- [x] 1.1 In `server/tmdb.ts`, add an exported `TmdbRequestError` with fields `status?`, `code?` and `path`. Add `tmdbErrorStatus(err)`. Make `createTmdbClient` throw only `TmdbRequestError`: no `cause`, no axios config/request (D1).
- [x] 1.2 In `server/app.ts`, replace the `axios.isAxiosError` 404 check with `tmdbErrorStatus`. Change both TMDB `logger.error` calls (search, import) to log a one-line summary. Drop the `axios` import if it becomes unused.
- [x] 1.3 In `server/__tests__/helpers.ts`, replace `axiosError(status)` with `tmdbError(status)` that returns a `TmdbRequestError`, and update its callers.
- [x] 1.4 Tests:
  - `tmdb-client.test.ts`: a fake `httpGet` throws an axios-shaped error whose config/request contain the key. The thrown error's `util.inspect` output must not contain the key, and its status must be kept.
  - `routes.test.ts`: with a capturing logger, a TMDB `502` for search and for import must never log the key.
  - Import `404` still returns `404`.

## 2. Async handler safety

- [x] 2.1 Add the `route()` wrapper (D2) and wrap every async handler in `app.ts`.
- [x] 2.2 Normalize `details ?? {}` and `credits ?? {}` in import before building the row.
- [x] 2.3 Tests: a stub where details or credits returns `null` gives `201` with empty fields, or a `5xx` but never a hang. A following `/api/health` returns `200`. A stub handler that throws gives a generic `500` JSON.

## 3. Catalogue file integrity

- [x] 3.1 Duplicate header guard (D3):
  - `loadCatalogue` rejects a header that repeats a name after BOM strip/trim, with an error naming the column.
  - `rewriteCsvFile` asserts the headers are unique.
  - Tests: a delete on a file with a duplicate `Movie ID` header returns a storage `500` and leaves the file byte-identical. An import is refused. After the file is repaired, a delete works.
- [x] 3.2 Add `fsHooks` (`rename`, `stat`) to `CreateAppOptions`. Production uses `fs.promises`.
- [x] 3.3 Delete re-check (D5):
  - Re-stat after the temp write, unlink the temp file and reload on a change, and retry up to 3 attempts.
  - Test: use `fsHooks.rename` (or a hook before rename) to append a row to the CSV on the first attempt. Afterwards the file holds the appended row and not the deleted movie.
- [x] 3.4 `renameWithRetry` (D6), retrying only EPERM/EBUSY/EACCES with bounded backoff. Tests:
  - One `EBUSY`, then success, returns `200`.
  - A persistent `EPERM` returns `500` and the temp file is gone.
  - `ENOENT` is not retried.
- [x] 3.5 Make `markWritten` non-fatal (D7). Test: `fsHooks.stat` throws `EBUSY` just after an import's append. The import returns `201`, and a later `GET /api/movies` includes the row.

## 4. Fresh state and validators

- [x] 4.1 Boot-scoped ETag (D4). Test: two `createApp` instances on the same file give different ETags, and an `If-None-Match` from instance A sent to instance B gets `200`.
- [x] 4.2 Add `/api/tmdb/search` to the readiness gate. Test: search during `onBeforeLoad` gets `503`.
- [x] 4.3 Queued `reloadIfChanged` with a fallback for `GET /api/tmdb/search` (after the TMDB call) and `GET /api/movies/:id` (D8). Tests:
  - Append a row externally. Get-by-id returns it.
  - Search marks it `alreadyImported: true`.

## 5. Actor search ordering

- [x] 5.1 Add `popularity?` to `TmdbMovieSummary`, then dedupe by id and sort by popularity descending before `slice(0, 20)` (D9). Test: duplicate ids are collapsed and the order is by popularity.

## 6. Wrap-up

- [x] 6.1 Run `npm run lint`, `npm run type-check:server`, `npm run build` and `npm run test:server`, all green.
- [x] 6.2 `grep -n uFEFF server/app.ts server/__tests__/helpers.ts` shows the escape text intact, with no literal BOM (CLAUDE.md gotcha).
- [x] 6.3 Update `CLAUDE.md`'s TMDB/op-queue paragraphs to cover redacted `TmdbRequestError`, the `route()` wrapper, the duplicate-header guard, the boot-scoped ETag, the delete re-check/rename retry and `fsHooks`. Update the test counts.
- [x] 6.4 In `BUG_BACKLOG.md`, close B2 and B16 and mark B3's server half done. Tick row 1 CR/SR in the section 6 tracker.
