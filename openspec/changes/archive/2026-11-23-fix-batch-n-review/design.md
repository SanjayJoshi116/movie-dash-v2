## Context

- **Drawer loading.** `Dashboard.tsx` lazy-loads `MovieDrawer` through a module-level `loadDrawer` and wraps it in `ChunkErrorBoundary`, keyed on `drawer.attempt`. On any caught error, `handleDrawerLoadError` shows an inline `Alert`, unmounts the drawer and swaps in a fresh `React.lazy(loadDrawer)`. The e2e test `app.spec.ts:178` covers that path, but only in Chromium (the only Playwright project and installed browser).
- **Formula guard.** `csvEscape.ts` holds it for the server's writes, the server's read-time un-escape and Export CSV. `catalogue_io.py` keeps its own copy (`FORMULA_PREFIX_CHARS`). Nothing ties the two lists together.
- **Server error text.** `serverErrorMessage` feeds `AddMovieModal`, `MovieDrawer` and `MoviesContext`, which all fall back with `??`.

## Goals / Non-Goals

**Goals:**
- A drawer render crash reaches the route `ErrorBoundary`. Only a failed `import()` gets the inline alert.
- A user whose browser caches the failed module can recover without knowing to press F5.
- Both formula lists include tab and CR, and a test fails if the lists drift apart.
- Close all of Batch N and B177.

**Non-Goals:**
- Adding Firefox/WebKit Playwright projects to CI. That means a browser download and a slower run, which is out of scope. The Reload action makes the cross-browser retry behaviour non-critical.
- Quoting tab-containing fields in `escapeCsvField`. The guard prefix already makes such a cell text, so quoting adds nothing.
- Migrating stored values. Values are guarded the next time they are written.

## Decisions

**1. Mark chunk errors at the source, not by message text.**
`loadDrawer = () => import('../components/MovieDrawer').catch((e) => { throw new ChunkLoadError(e); })`. `ChunkLoadError` is a small `Error` subclass exported from `ChunkErrorBoundary.tsx`.
- The boundary stores the caught error in state.
- `componentDidCatch` calls `onError` only for a `ChunkLoadError`.
- `render` rethrows any other error, which propagates to the route boundary.

*Alternative rejected:* matching `TypeError` messages ("Failed to fetch dynamically imported module", "Importing a module script failed", "error loading dynamically imported module"). They differ per browser and change over time, and an unknown wording would fall through to the route boundary as a crash.

**2. Rethrow from render instead of skipping `getDerivedStateFromError`.**
React has no way for a boundary to decline an error, so the boundary must catch it and throw it again during its next render. React then hands it to the nearest ancestor boundary.
- In dev, StrictMode logs the error twice. That's expected.
- The route `ErrorBoundary` resets on navigation as it does today.

**3. Keep the retry; add a Reload page action.**
The inline `Alert` gets an `action` button, "Reload page", that calls `window.location.reload()`.
- Retry stays the first path, because it works in Chromium without losing page state.
- Reload is the fallback for browsers whose module map keeps the rejection.
- `Button` is already on the landing route, so `check:bundle` shouldn't move. Re-run it anyway.

*Alternative rejected:* a cache-busting query on the retried import. Vite only rewrites static `import()` specifiers, so a variable specifier would bypass Vite's chunk URL resolution in the production build.

**4. Blank server text counts as none.**
`serverErrorMessage` returns `error.trim() ? error : undefined`. That fixes all three callers at once, with no per-site `||`.

**5. Formula prefixes: one change, two languages, one test.**
- Add `'\t'` and `'\r'` to `FORMULA_PREFIXES` and `"\t"`, `"\r"` to `FORMULA_PREFIX_CHARS`.
- `tests/python/test_catalogue_io.py` gets `test_formula_prefixes_match_typescript`. It parses the array literal out of `csvEscape.ts` (the same approach as `test_columns_match_typescript`) and decodes the `\t`/`\r` escapes.
- `tests/unit/csvEscape.test.ts` adds a case table for sanitize, unsanitize, round trip and `escapeCsvField`.
- The Python test is renamed to `test_sanitize_escapes_formula_prefixes`, and a real round-trip check is added (`read_catalogue` of an appended `'-ism` row).

**6. B177: `optionFilterProp="label"` on the Language Select only.**
Genre and Director options have label === value, so they need no change.

**7. B183: when not clickable, return a cursor reset.**
`useClickHandlers` returns `{ onHover: resetCursor }` instead of `{}`. It's a module-level function, so the memo stays stable. It sets the canvas cursor to `''`.

**8. B186: assert the rewrite was never called.**
Patch `catalogue_io.rewrite_catalogue` (the function `save_checkpoint` calls) with a `mock.Mock(wraps=...)` and assert it was never called. Keep the bytes check and drop the mtime check.

## Risks / Trade-offs

- **[Old stored value `'` + tab]** A cell written before this change as an apostrophe followed by a tab would now be read back without its apostrophe. That's the same accepted risk the original guard had for `'=`, and real catalogue data has no leading tabs. → No mitigation needed. Before applying, check with a one-off `grep -c "^'\t\|,'\t"` on the real CSV.
- **[Rethrown error logged twice in dev]** StrictMode and the rethrow both log. → Cosmetic, dev only.
- **[Reload loses page state]** Scroll position and the open movie are lost. → It's offered, not automatic, and it's only needed after a failed retry.
- **[Python test parses TS source]** A reformatted array literal could break the regex. → The test fails loudly, which is the point.
