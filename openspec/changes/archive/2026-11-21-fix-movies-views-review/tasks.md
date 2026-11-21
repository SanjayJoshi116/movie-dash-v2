## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3k "Found 2026-11-20 (Batch H review: Movies views + mutations + export), owned by `fix-movies-views-review`" with B124–B130, and mark B14, B17, B19, B21, B24 (drawer/grid), B30 (grid), B31, B37 as owned by this change
- [x] 1.2 `BUG_BACKLOG.md` §6: tick CR + SR for rows 26–29, 52 and Batch H; update the Progress line

## 2. Add Movie (B125, B126, B37, B128)

- [x] 2.1 `AddMovieModal.tsx`: remove the `searching` early return; one `AbortController` per search, abort the previous one, ignore cancels
- [x] 2.2 `AddMovieModal.tsx`: "Added" = in `useMovies().movies` (memoised id set) or in a local `justImported` set that is cleared when `movies` changes
- [x] 2.3 `AddMovieModal.tsx`: a `409` adds the id to `justImported` and calls `refetch()`, with no error
- [x] 2.4 `AddMovieModal.tsx`: import start no longer clears `error`; the error alert is `closable`
- [x] 2.5 e2e (Movies Add & Delete): mock search "Alien" (delayed), then "Aliens" (fast) → "Aliens" results shown, also after the "Alien" reply arrives
- [x] 2.6 e2e: mocked import `409` → row shows "Added", no alert
- [x] 2.7 e2e: import, then mock the catalogue without that movie and `refetch` → row offers Import again
- [x] 2.8 e2e: import A mocked `500` → alert; start import B (pending) → A's alert still visible

## 3. Movie details (B19, B31, B24)

- [x] 3.1 `MovieDrawer.tsx`: capture the id at delete start; after `await`, act only if the current-id ref matches; always `refetch()`; reset `deleting` in the `lastMovieId` block
- [x] 3.2 `MovieDrawer.tsx`: `<span aria-hidden="true">🎬 </span>` in the heading
- [x] 3.3 `MovieDrawer.tsx`: runtime ≤ 0 → "—"; omit a blank date or year part; vote ≤ 0/NaN → "Not rated" tag, no vote count
- [x] 3.4 e2e: delete A mocked slow → close, open B → B's Delete isn't loading; A completes → B's drawer still open, no error
- [x] 3.5 e2e: mocked movie with vote `0`, runtime `0`, blank date → drawer shows "Not rated", no "0 mins", no "()"

## 4. Views (B124, B21, B24, B30, B129/B17)

- [x] 4.1 `MovieTable.tsx`: Language sorter compares `getLanguageName(...)`
- [x] 4.2 `MovieTable.tsx`: clear `sort` (render-phase) when the sorted column's `responsive` breakpoint is false
- [x] 4.3 `MovieCardGrid.tsx`: year/language line joins non-blank parts; runtime line only for runtime > 0
- [x] 4.4 `MovieCardGrid.tsx`: card body gets `id="movie-card-<Movie ID>-details"`; card `aria-describedby` points to it; keep `aria-label`
- [x] 4.5 `MoviesContext.tsx`: normalise each row so every `CATALOGUE_COLUMNS` key is a string (`''` if missing or non-string); keep extra keys
- [x] 4.6 e2e: mocked rows de/el/en → Language ascending gives English, German, Greek
- [x] 4.7 e2e (Mobile/viewport): sort by Actors/Actresses at 1280px, resize to 800px → no column sorted; export (mocked download) is in default order
- [x] 4.8 e2e: mocked row with no `Genres`/`Release Date` keys → grid renders, table sorts by Genres and Release Date, drawer opens, Stats › Explore and People tabs render
- [x] 4.9 e2e: grid card `toHaveAccessibleDescription(/…/)` contains its year and director

## 5. Export (B14, B127, B130)

- [x] 5.1 `exportCsv.ts`: prefix `String.fromCharCode(0xfeff)`; afterwards `grep -n "0xfeff" src/utils/exportCsv.ts` and confirm no literal U+FEFF crept in (CLAUDE.md gotcha)
- [x] 5.2 `exportCsv.ts`: headers `escapeCsvField(sanitizeCsvValue(h))`
- [x] 5.3 `exportCsv.ts`: revoke via `setTimeout(..., 1000)`
- [x] 5.4 e2e: download content starts with the BOM bytes `EF BB BF`; a mocked extra column `=X` appears as `'=X` in the header

## 6. Docs and checks

- [x] 6.1 CLAUDE.md: `MoviesContext` normalises missing catalogue fields to `''`; Add Movie "Added" derives from the catalogue and a new search replaces a running one; grid cards use `aria-describedby`; export BOM + guarded headers
- [x] 6.2 `npm run lint`, `npm run type-check`, `npm run test:e2e` (check ports 3000/5000 first)
- [x] 6.3 `BUG_BACKLOG.md`: mark B14, B17, B19, B21, B31, B37, B124–B130 fixed; note B24/B30 parts fixed here; §6 Fix ◐ for rows 26–29, 52 and Batch H
