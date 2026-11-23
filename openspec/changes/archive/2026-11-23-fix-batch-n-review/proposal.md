## Why

Batch N (`BUG_BACKLOG.md` §6 rows 76–81, 83–85) covers the modules added or found after the 2026-11-20 sweep. The `/code-review` (high) on 2026-11-23 reported 9 findings, and each was checked against the code the same day. One is a real bug: the drawer's local error boundary reports every drawer crash as a failed download. The `/security-review` found nothing at ≥ 8 confidence. Its only candidate (a formula guard with no leading tab/CR, 3/10) is the same as one of the CR nits, and it is fixed here as hardening.

B177 (the Filters drawer's language search, found while applying `fix-e2e-review`) is a one-line fix, so it goes in this change too.

This is the last open review batch. With it, all 85 tracked modules are reviewed and fixed.

## What Changes

**Bugs:**
- **B178: `ChunkErrorBoundary` treats any error as a failed chunk** (`ChunkErrorBoundary.tsx:21`). A render crash in `MovieDrawer` shows the "Couldn't open movie details" alert, swaps the drawer for a fresh lazy copy, and never reaches the route `ErrorBoundary`. Each reopen crashes again. Fix:
  - `loadDrawer` wraps an `import()` rejection in a `ChunkLoadError`.
  - The boundary handles only that error and rethrows anything else from `render`, so the route boundary shows it.
- **B179: the retry depends on the browser fetching a failed module again** (`Dashboard.tsx:137`). The e2e test shows it works in Chromium. Firefox and Safari aren't tested, and the HTML module map lets a browser cache the failure. Fix: the alert also offers **Reload page**, so a user is never stuck.
- **B177: typing a language name in the Filters drawer finds nothing** (`FiltersDrawer.tsx`). The Language Select searches option values (ISO codes). Fix: `optionFilterProp="label"`.
- **B180: an empty server error message shows nothing** (`httpError.ts:7`). `serverErrorMessage` returns `''`, and callers fall back with `??`, which only catches `null`/`undefined`. AddMovieModal then shows no alert, and a failed delete shows no message. Fix: return text only when it is non-blank after trimming.

**Hardening:**
- **B181: the formula guard has no leading tab (0x09) or CR (0x0D)** (`csvEscape.ts:4`, `catalogue_io.py:31`). OWASP lists both, because some importers trim whitespace before parsing. Fix: add both to the TS and Python prefix lists in the same edit. `unsanitizeCsvValue` uses the same check, so the round trip stays exact.

**Nits:**
- **B182: `statsHelpers.test.ts` keeps its own copy of `RATING_BUCKETS`.** This breaks the CLAUDE.md "declare once" rule. Fix: import it from `src/utils/chartBuckets.ts`.
- **B183: the pointer cursor can stay on a chart that is no longer clickable** (`chartHelpers.ts:43`). It's latent, since no caller toggles `onElementClick`. Fix: when not clickable, `useClickHandlers` returns an `onHover` that resets the cursor.
- **B184: the `ChunkErrorBoundary` doc comment says "key it on the lazy component"**, but the caller keys it on an attempt counter. Fix the comment.
- **B185: nothing checks that the Python and TS formula rules match**, and `test_sanitize_round_trips_leading_apostrophes` isn't a round trip. Fix:
  - New `tests/unit/csvEscape.test.ts` with a case table, including `unsanitize(sanitize(x)) === x`.
  - A Python test reads `FORMULA_PREFIXES` from `csvEscape.ts`, like `test_columns_match_typescript` does for the columns.
  - Rename the Python test.
- **B186: `test_nothing_found_leaves_file_untouched` relies on `st_mtime_ns`**, which a coarse-timestamp filesystem can't tell apart. Fix: also mock the rewrite and assert it was never called.

Bookkeeping: log B178–B186 in `BUG_BACKLOG.md` §3t and tick CR/SR for Batch N rows 76–81, 83–85 and the Batch N row.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `dashboard-layout`: "Details failing to load don't break the Dashboard". Only a failed download counts as a load failure, a crash goes to the page's error view, and a page reload is offered.
- `catalog-persistence`: "Stored values round-trip faithfully and safely". Values beginning with a tab or carriage return are also stored formula-safe.
- `movie-browsing`: "Exported values are safe to open in spreadsheets" covers the same two characters. New requirement: the language filter can be searched by language name.
- `accessible-ui`: new requirement. A failed request always shows a message, even when the server's error text is empty.
- `dev-quality-gates`: new requirement. The Python tools' formula rule is tested to match the server's.

## Impact

- App code:
  - `src/components/ChunkErrorBoundary.tsx`
  - `src/pages/Dashboard.tsx` (`loadDrawer`, the alert's Reload action)
  - `src/components/FiltersDrawer.tsx`
  - `src/utils/httpError.ts`
  - `src/utils/csvEscape.ts`
  - `src/components/Charts/chartHelpers.ts`
  - `catalogue_io.py`
- Tests:
  - `tests/app.spec.ts`: a drawer crash reaches the route error view, the Reload action, language search by name, and an empty server error.
  - `tests/unit/csvEscape.test.ts` (new) and `tests/unit/statsHelpers.test.ts`
  - `tests/python/test_catalogue_io.py`
- Data: a stored value that begins with a tab or CR gets a leading `'` on its next write and reads back unchanged. No migration is needed.
- No server route or API change. Landing bundle: the Reload button is an antd `Button`, which the landing route already loads.
