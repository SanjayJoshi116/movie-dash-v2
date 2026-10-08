## 1. Catalogue loading

- [x] 1.1 Extract the boot CSV stream into `loadCatalogue()`, which returns `{ movies, headers }` and strips a UTF-8 BOM in `mapHeaders`
- [x] 1.2 During load, unescape formula-guarded values: for values matching `/^'[=+\-@]/`, drop the leading `'`
- [x] 1.3 Track a file fingerprint (`mtimeMs`, `size`) and a catalogue version counter, and add `reloadIfChanged()`
- [x] 1.4 Call `reloadIfChanged()` at the start of `GET /api/movies`

## 2. Write queue and mutations

- [x] 2.1 Add an `enqueueWrite()` promise-chain queue in which one failed write doesn't break later ones
- [x] 2.2 Rework `appendMovieToCsv`:
  - map values onto the current on-disk header
  - prefix `\n` when the file has no trailing newline
  - throw when a non-empty file has no readable header
- [x] 2.3 Rework `rewriteCsvFile` to write a uniquely named temp file and then `rename`; update `.gitignore` to `src/movies.csv*.tmp`
- [x] 2.4 Move delete's existence check, rewrite and in-memory change into the queue, after `reloadIfChanged()`, with rollback on failure
- [x] 2.5 Rework import:
  - return `409` early when the id is in `inFlightImports`
  - fetch from TMDB outside the queue
  - inside the queue: reload, re-check for a duplicate (`409`), append, then push to memory
- [x] 2.6 After every successful write, bump the version counter and refresh the fingerprint

## 3. HTTP semantics

- [x] 3.1 `GET /api/movies`: send `Cache-Control: no-cache` and a weak ETag built from the version counter; return `304` when `If-None-Match` matches
- [x] 3.2 Apply the readiness `503` gate to `POST /api/tmdb/import`
- [x] 3.3 Import: turn a TMDB `404` into `404`, and storage errors into `500 "Failed to save movie"`
- [x] 3.4 Make the error middleware use the `4xx` `status`/`statusCode` (malformed JSON → `400`, oversized → `413`)

## 4. Client

- [x] 4.1 `AddMovieModal`: add a request-id guard so only the latest search's results render, and ignore Enter while `searching`
- [x] 4.2 `AddMovieModal`: replace `importingId` with a `Set` of in-flight ids
- [x] 4.3 `MovieDrawer`: `encodeURIComponent` the id in the DELETE URL; on `404`, call `refetch()` and close

## 5. Python tools

- [x] 5.1 `backfill_posters.py`: write checkpoints to a temp file, then `os.replace()`
- [x] 5.2 `movie-search.py`: use the same atomic pattern for the header-migration rewrite

## 6. Docs and verification

- [x] 6.1 Update `CLAUDE.md`: describe the write queue, reload-if-changed and unescape-on-read, and remove the inaccurate "migrates the header" claim
- [x] 6.2 Update the README: add a note on running the Python tools alongside the server, and make the "safe to interrupt" claim accurate
- [x] 6.3 Manually verify that:
  - a double-click import yields one row
  - two rapid deletes both succeed
  - a row appended externally survives an in-app delete
  - a BOM-prefixed file loads
  - a `+1` title displays without `'`
  - Verified via a temp-dir harness against the real server (22/22): BOM, unescape, no-cache/ETag/304, concurrent deletes, external append survives delete, malformed JSON 400, oversized 413, double import 201/409 (real TMDB, id 603), no-trailing-newline append, external-column alignment, TMDB 404. Not exercised: failed-write rollback and import-before-ready 503 (left for server-api-tests). `+1` checked at API level (UI renders `Name` verbatim).
- [x] 6.4 Confirm `npm run lint`, `npm run build`, `npm run type-check:server` (once `fix-ci-green` has landed) and `npm run test:e2e` all pass
  - lint, type-check:server, build pass; e2e 56/56 (--retries=0, template CSV; real CSV restored, sha256 verified).
