## Context

Batch H (`BUG_BACKLOG.md` §6 rows 26–29, 52). Re-checked against the code on 2026-11-20:

- `AddMovieModal.tsx:49` `if (searching) return;`, with `onPressEnter={handleSearch}` on all three inputs, which stay editable. This turns the `searchIdRef` guard into dead code and breaks `catalog-persistence` "Rapid successive searches" (B125). `:83` shows the server's `409 'Movie already in catalogue'` (`server/app.ts:605, 684`) as an error (B126). `:78` `setError(null)` at import start (B128). `alreadyImported` is local result state (B37).
- `MovieDrawer.tsx:41-61`: no movie-id check after `await`; `deleting` isn't reset in the `lastMovieId` block (B19). `:83` emoji in the heading (B31). `:150-154`, `:176-178`: "0 mins", "Release  ()", "⭐ 0" in red (B24).
- `MovieTable.tsx:47`: sorter on the ISO code, render by name (B124). `:69-101`: `responsive` columns keep `sort` while hidden; `sortedMovies` (`:141-147`) feeds Export (B21).
- `MovieCardGrid.tsx:95`: `movie.Genres.split`; `:39-40` and `MovieTable.tsx` sorters call `localeCompare` on possibly-undefined fields (B129, the B17 pattern). `:103-105`: `role="button"` plus a name-only `aria-label` (B30). `:136, :152-157`: " · English" for a blank year and "0 mins" (B24).
- `exportCsv.ts:22`: header cells only `escapeCsvField` (B130); `:23` no BOM (B14); `:31` revoke right after `click()` (B127).

## Goals / Non-Goals

**Goals:** fix B124–B130 plus B14, B17, B19, B21, B24 (drawer, grid), B30 (grid), B31 and B37; make the `catalog-persistence` Add Movie requirement consistent with itself; cover the behaviour changes with mocked e2e tests.

**Non-Goals:** B49 (`List` → `Listy`); B24's Dashboard and Stats parts (`fix-dashboard-review` B114, and Batch I); the server's `rewriteCsvFile` header (it only rewrites a header already on disk, and the loader doesn't unescape header names, so guarding it there would rename columns).

## Decisions

**D1 — New search replaces the running one (B125).** Drop the `searching` early return. Keep `searchIdRef` for stale replies and add an `AbortController` per search (abort the previous one; ignore `axios.isCancel`). `searching` stays true until the latest search settles, as today. *Alternative:* disable the inputs while searching. Rejected: it keeps the spec contradiction and blocks correcting a typo during a slow (up to 15 s) TMDB call.

**D2 — "Added" comes from the catalogue (B37, B126).** Render "Added" when `movies.some(m => m['Movie ID'] === String(item.id))`, from `useMovies()`, OR the server's `alreadyImported` for the brief window before `refetch()` lands. Implemented as a `Set` memoised from `movies` plus a local `justImported` set that is cleared when the catalogue changes. On `409`: add to `justImported` and `refetch()`, with no error. A later delete removes the id from `movies`; the next catalogue change clears `justImported`; Import comes back.

**D3 — Per-operation errors (B128).** Keep one `error` slot, but only searches clear it. An import failure sets it; an import start doesn't clear it. The alert is dismissible (`closable`), so a stale error can still be removed. *Alternative:* per-row errors. Rejected as more UI than the bug needs.

**D4 — Delete bound to its movie (B19).** In `handleDelete` capture `id = movie['Movie ID']` and keep the current id in a ref updated during render. After `await`, act (`onClose`, `setDeleteError`) only if the ref still equals `id`; always `refetch()`. The `lastMovieId` render-phase block also resets `deleting` to false. A delete still running for A keeps running; only its UI effects are dropped.

**D5 — Normalise missing fields once (B129, B17).** In `MoviesContext`, after the array check (`fix-contexts-hooks-review` D3), map each row to `{ ...Object.fromEntries(CATALOGUE_COLUMNS.map(c => [c, ''])), ...row }`, with any non-string value for a catalogue column replaced by `''`. Every consumer then sees strings, so no `.split`/`localeCompare` site needs its own guard. Extra (non-catalogue) keys are kept. *Alternative:* guard each site (B17's suggestion). Rejected: about 15 sites across 6 files, and the next one written would miss it. *Alternative:* fill in the server loader. Rejected: the server deliberately serves only the columns on disk (`projectRow`), and the server tests assert that.

**D6 — Grid card description (B30).** Keep `role="button"` and `aria-label="View details for X"` (the e2e sort test reads it). Add `aria-describedby` pointing at an id on the card body (`movie-card-<Movie ID>-details`), so screen readers read the visible rating, year, language, director, genres and runtime after the name. *Alternative:* a real `<button>` on the title as in `MovieTable`. Rejected for now: the whole card is the click target on mobile, where grid is the default view.

**D7 — Unknown values (B24).** Drawer: runtime ≤ 0 → "—"; a blank date omits the date part, and a blank year omits "( )"; vote ≤ 0 or NaN → "Not rated" tag in the default colour, with the vote count hidden. Grid: the year/language line joins only non-blank parts; the runtime line shows only for runtime > 0 (the vote tag already does `vote > 0`).

**D8 — Sort what is shown (B124, B21).** Language sorter: `getLanguageName(a.Language).localeCompare(getLanguageName(b.Language))`. Hidden column: read `Grid.useBreakpoint()`. If the sorted column's `responsive` breakpoint is `false`, clear `sort` with the render-phase pattern (no effect), so the clear sticks when the window widens again.

**D9 — Export (B14, B127, B130).** Prefix `String.fromCharCode(0xfeff)` (built that way per the CLAUDE.md BOM gotcha; never a literal or `\u` escape). Headers go through `escapeCsvField(sanitizeCsvValue(h))`. Revoke in `setTimeout(() => URL.revokeObjectURL(url), 1000)`.

## Risks / Trade-offs

- [D5 changes what rows contain: blank columns appear as `''`] → The export already writes every `CATALOGUE_COLUMNS` column, and the UI treats `''` as blank everywhere. Server memory is unaffected.
- [Aborting a search mid-flight] → The server's TMDB call still finishes, harmlessly; only the client stops waiting.
- [BOM in the export] → If the file is imported back, the server loader strips it (`mapHeaders`) and `catalogue_io.py` reads `utf-8-sig`.
- [Three in-flight changes touch `MoviesContext.tsx`] → Separate hunks (D5 is a `.map` after the shape check). Apply after `fix-contexts-hooks-review`, or keep its own `Array.isArray` guard.
