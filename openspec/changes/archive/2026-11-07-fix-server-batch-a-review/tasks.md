## 1. Shared CSV escaping (finding 10)

- [x] 1.1 Create `src/utils/csvEscape.ts` exporting `FORMULA_PREFIXES`, `sanitizeCsvValue`, `escapeCsvField` (pure TS, no DOM/Node imports)
- [x] 1.2 Import it in `src/utils/exportCsv.ts` and `server/app.ts`, deleting the local copies; add `../src/utils/csvEscape.ts` to `server/tsconfig.json` `include`
- [x] 1.3 Use `[...CATALOGUE_COLUMNS]` (value import from `../src/types/movie`) as the header for a brand-new file in `appendMovieToCsv` and as the empty-`csvHeaders` fallback in `rewriteCsvFile`; test: import into a missing file writes the header in `CATALOGUE_COLUMNS` order

## 2. Catalogue loading and file format (findings 1, 5, 7)

- [x] 2.1 `loadCatalogue`: `mapHeaders` returns `null` for headers empty after BOM-strip + trim; log a one-line note when any were ignored; test: header ending `,,` loads, lists, imports and deletes (persistence.test.ts)
- [x] 2.2 Add a `fileFormat` probe (`{ bom, eol }`, first 64 KiB) to `reloadCatalogue`; missing/empty file → `{ bom: false, eol: '\n' }`
- [x] 2.3 `rewriteCsvFile` joins with `fileFormat.eol` and prefixes the BOM when set; `appendMovieToCsv` uses `fileFormat.eol` for the line join, terminator and missing-newline prefix; tests: BOM file keeps exactly one BOM after delete; CRLF file has only CRLF line endings after import + delete; new file is LF without BOM
- [x] 2.4 Readiness middleware: while `loadError` is set, force `enqueue(reloadCatalogue)` (caught) instead of `reloadForRead()`; test: boot with a duplicate-header file, delete the file, list returns `[]` and health is `ok` (hardening or bootstrap test file)
- [x] 2.5 Run `grep -n uFEFF server/app.ts` and confirm the BOM escape is still the escape text, not a literal character

## 3. Import route (findings 2, 4, 6)

- [x] 3.1 Call `await reloadForRead()` before the fast-path 409 check; test: externally remove a row, then import it immediately → `201`, stored once
- [x] 3.2 Validate the TMDB details body (non-null object with non-empty string `title`) → else log one line and return `502`, writing nothing; credits body falls back to `{}` when null or not an object
- [x] 3.3 Rewrite `hardening.test.ts` "a null TMDB body imports a row of empty values" to expect `502`, no stored row, and a successful re-import once TMDB answers normally; add an HTML-string details body case and a null-credits-still-imports case
- [x] 3.4 Add `projectRow(row, headers)`; push and return the projected row on import; test: file without `Poster URL` → `201` body and `GET /api/movies` have no `Poster URL`, and the extra disk column (e.g. `Keywords/Tags`) is present and empty

## 4. Logging (finding 9)

- [x] 4.1 Error middleware logs `describeError(err)`; boot-load `.catch` takes `unknown`, stores an `Error`, logs `describeError(err)`
- [x] 4.2 Tests: a throwing route logs exactly one string line; `onBeforeLoad` rejecting with a non-Error string logs a line containing that string, not `undefined`

## 5. TMDB client deadline (finding 8)

- [x] 5.1 Add `deadlineMs` (default 15000) and injectable `now` to `TmdbClientOptions`; per-attempt `timeout = min(10000, remaining)`
- [x] 5.2 Retry only AxiosErrors with no response or a `RETRYABLE_STATUS` response; throw non-Axios errors at once (still via `redact`)
- [x] 5.3 On `429`, wait `max(backoff, Retry-After seconds × 1000)`; throw instead of sleeping when the wait would reach the deadline
- [x] 5.4 Tests in `tmdb-client.test.ts` (fake `now`/`sleep`): a `TypeError` from `httpGet` is not retried; `Retry-After: 60` fails without sleeping; `Retry-After: 2` sleeps ≥ 2000 ms then succeeds; repeated timeouts stop by the deadline; per-attempt timeout shrinks with the remaining budget

## 6. TRUST_PROXY (finding 3)

- [x] 6.1 `parseTrustProxy('true')` (any case, trimmed) throws `ConfigError` recommending `1` or an address list; narrow `createApp`'s `trustProxy` type to `number | string`
- [x] 6.2 Update the `parses TRUST_PROXY` test in `hosting.test.ts` (`TRUE` now throws `ConfigError`)
- [x] 6.3 Update the README `TRUST_PROXY` table row and Rate-limiting note (drop `true`) and the `.env.example` comment

## 7. Docs and tracker

- [x] 7.1 CLAUDE.md: the shared `src/utils/csvEscape.ts`; BOM/EOL preservation; the TMDB 15 s deadline + Retry-After; `TRUST_PROXY=true` rejected; blank header cells ignored; import response = projected row
- [x] 7.2 `BUG_BACKLOG.md`: log findings as B51–B60 (marked fixed by this change), tick CR and SR for rows 3 and 69, and add a Batch A note (CR 10 confirmed; SR 0 at ≥8)
- [x] 7.3 Update the server test count in CLAUDE.md/README to the new total

## 8. Verify

- [x] 8.1 `npm run test:server` passes
- [x] 8.2 `npm run lint` and `npm run build` pass; `npx tsc -p server/tsconfig.json --noEmit` passes
- [x] 8.3 `npm run test:e2e` passes (AddMovieModal still handles `502`)
- [x] 8.4 `openspec validate fix-server-batch-a-review --strict` passes
