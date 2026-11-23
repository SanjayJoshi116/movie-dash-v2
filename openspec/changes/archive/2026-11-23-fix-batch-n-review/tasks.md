## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3t "Found 2026-11-23 (Batch N review: §6 rows 76–81, 83–85), owned by `fix-batch-n-review`" with B178–B186, plus the SR result (nothing at ≥ 8; tab/CR at 3/10 = B181)
- [x] 1.2 `BUG_BACKLOG.md` §3s: mark B177 as owned by `fix-batch-n-review`
- [x] 1.3 `BUG_BACKLOG.md` §6: tick CR + SR for rows 76–81 and 83–85 (row 80 including `filterSpans.test.ts`) and the Batch N row; update the Progress line

## 2. Drawer errors (B178, B179, B184)

- [x] 2.1 `ChunkErrorBoundary.tsx`: export `ChunkLoadError`; store the caught error; call `onError` only for `ChunkLoadError`; rethrow any other error from `render`; fix the doc comment so it says the boundary is keyed on an attempt counter
- [x] 2.2 `Dashboard.tsx`: make `loadDrawer` wrap an `import()` rejection in `ChunkLoadError`; give the inline `Alert` a "Reload page" action (`window.location.reload()`); correct the "browsers re-fetch" comment
- [x] 2.3 e2e: a mocked row that makes `MovieDrawer` throw after the chunk has loaded shows the route error view, with no "Couldn't open movie details" alert; the load-failure alert has a "Reload page" button that reloads the page

## 3. Server error text (B180)

- [x] 3.1 `httpError.ts`: return the error text only when it is non-blank after trimming
- [x] 3.2 e2e: a mocked TMDB search that returns `500 { error: "" }` shows "Request failed" in Add Movie; a mocked delete that returns `500 { error: "" }` shows "Delete failed" in the drawer

## 4. Formula guard (B181, B185)

- [x] 4.1 Check the real `src/movies.csv` for cells that start with `'` followed by a tab or CR (expect 0; if any exist, stop and tell the user)
- [x] 4.2 `csvEscape.ts`: add `'\t'` and `'\r'` to `FORMULA_PREFIXES`; update the comment
- [x] 4.3 `catalogue_io.py`: add `"\t"` and `"\r"` to `FORMULA_PREFIX_CHARS`
- [x] 4.4 New `tests/unit/csvEscape.test.ts`: a case table (`=`, `+`, `-`, `@`, tab, CR, `'-ism`, `it's`, plain) for sanitize, unsanitize, the round trip, and `escapeCsvField` quoting
- [x] 4.5 `test_catalogue_io.py`: add `test_formula_prefixes_match_typescript`; rename the sanitize test to `test_sanitize_escapes_formula_prefixes`, add tab/CR cases, and add a real append → read round trip
- [x] 4.6 Server test: an import whose title starts with a tab and `=` is stored as `'\t=…` and served unchanged after a delete rewrite

## 5. Nits (B177, B182, B183, B186)

- [x] 5.1 `FiltersDrawer.tsx`: `optionFilterProp="label"` on the Language Select; e2e test: typing "Tamil" (or the name of the first mocked language) offers it, and selecting it filters
- [x] 5.2 `statsHelpers.test.ts`: import `RATING_BUCKETS` from `src/utils/chartBuckets.ts` and drop the local copy
- [x] 5.3 `chartHelpers.ts`: when not clickable, `useClickHandlers` returns a module-level `onHover` that resets the cursor; add a unit test in `tests/unit/chartHelpers.test.ts`
- [x] 5.4 `test_catalogue_io.py`: `test_nothing_found_leaves_file_untouched` asserts that `rewrite_catalogue` was never called, instead of comparing mtime

## 6. Checks

- [x] 6.1 Break each target once, confirm its test fails, then revert:
  - drop the `instanceof ChunkLoadError` check
  - drop `'\t'` from one prefix list only
  - drop `optionFilterProp`
  - return `''` from `serverErrorMessage`
- [x] 6.2 Run `npm run lint`, `npm run type-check`, `npm run build`, `npm run check:bundle`, `npm run test:unit`, `npm run test:server`, `python -m unittest discover -s tests/python`, `ruff check`, and `npm run test:e2e` (check ports 3000/5000 first; also run with `CI=1` on the template CSV)
- [x] 6.3 `grep -n uFEFF` on `server/app.ts` and `server/__tests__/helpers.ts` if either was touched
- [x] 6.4 CLAUDE.md: `ChunkLoadError` and the rethrow, the Reload action, the tab/CR prefixes and the parity test, the blank-message rule in `serverErrorMessage`, and the Language Select's `optionFilterProp`; update the test counts in CLAUDE.md, README and features.txt
- [x] 6.5 `BUG_BACKLOG.md` §6: set Fix to ◐ for the Batch N rows
