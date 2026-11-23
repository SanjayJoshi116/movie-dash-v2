# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.12.1] - 2026-11-23

Review of §6 Batch O (rows 86–101): the modules added in 0.11.11–0.12.0 plus config and entry files that were never tracked. `/code-review` (high) found B201–B208 (BUG_BACKLOG §3w), all fixed or documented; `/security-review` found nothing at ≥ 8 confidence. All 101 tracked modules are now reviewed. The last spec scenarios with no test (BUG_BACKLOG §4) are covered, so §4 is empty.

### Fixed
- **A failed first load left the tab title stale and announced no page change** (B202). Each page now renders its heading above `LoadingError`, so the heading, tab title and focus behave the same while loading, on a load error and with data (the skeleton's placeholder title bar is gone).
- **The selected Stats tab was hard to read on the light theme** (B203, about 2.8:1 contrast). It is `#4f46e5` there; dark keeps `#818cf8`. The colour comes from antd's `Tabs` tokens in `ConfigProvider`; the `!important` tab rules in `index.css` are gone.
- **More light-theme navigation text was low contrast** (B209, B210): the selected Sidebar item and mobile bottom-nav item, and a hovered Stats tab, now use `#4f46e5` on light (a light `Menu` token, a `--accent-text` CSS variable, `itemHoverColor`).

### Security hardening
- The CI workflow's token is read-only (`permissions: contents: read`, B204).
- `robots.txt` asks crawlers to stay out (`Disallow: /`, B205): a personal dashboard with no login.

### Changed
- `EmptyState` drops its unused `isDark` prop (B208).
- `/simplify` pass over the 0.12.1 diff:
  - e2e canvas sweeps are cheaper: `findPointer` stops at the first hit again (via `pointerRuns`' new `limit`), `isPointerAt` reads the cursor in the same round trip as its frame wait, large targets sweep in 8 px steps, and the 90-minute test re-checks the bar it already found instead of sweeping again.
  - New `mockDelete()` helper in `tests/helpers.ts` replaces 7 copies of the `DELETE /api/movies/:id` route mock; `yearRows()` moved to module level and reused; the slider drag uses Playwright's `steps`.
  - The Stats crash wrapper asserts it was served, so a route that stops matching fails instead of testing nothing.
  - `allowScripts.test.ts` checks every esbuild copy in the lockfile, not only the top-level one.
  - A follow-up `/code-review` found B209–B215 (BUG_BACKLOG §3x), all fixed: the two contrast items above; the export column test moved to a unit test of the new pure `moviesToCsv()` (the e2e version couldn't fail, since `normalizeMovie` fills every column), with a quote-aware CSV split (B211); `mockDelete` gives a non-2xx status an error body by default (B212); the Other-slice and Unknown-bar tests click only where the element is drawn (`firstPaintedX`, B213); the light-tab test uses a role query (B214); features.txt says `robots.txt` stops crawling, not indexing (B215).
  - Skipped: an `exportCsvRows()` helper (the other export tests parse differently on purpose), a shared "not drillable" assertion for the Other/Unknown tests (two short copies), a theme-dependent `colorPrimary` for every accent use (a visual change across the app), a route-level title/focus map (bigger redesign), and the remaining `isDark` props that only feed `getCardStyle` (outside this diff).
- A module that throws while loading is still reported as a failed download (B201, the same as B192, kept by choice). This is now documented in `retryableLazy` and CLAUDE.md, whose claim that every drawer crash reaches the error view is narrowed to render crashes.
- README, CLAUDE.md and features.txt updated; `BUG_BACKLOG.md` §3w added, §6 Batch O ticked, §4 emptied, the stale "Suggested grouping" diagram removed and the §3 headings updated to their archived changes.

### Added
- 18 e2e tests (135 → 153): the light-theme tab colour (B203); a failed first load still naming the page; and for the §4 gaps: navigating away from / re-opening a crashed page, all site storage blocked, a first visit on a light-mode OS, delete from page 3 keeping sort and page, a slider drag applied once, two imports in flight, the 90-minute and "> 180 min" runtime buckets, a decade partly outside the year range, an "Unknown" bar not navigating, a co-production counted per country, Dashboard sections in order, Total Movies emphasis, a genre slice drill-down and the Other slice not clickable. `findPointer` moved to module level beside a new `pointerRuns` canvas sweep.
- 4 frontend unit tests (56 → 60): `tests/unit/exportCsv.test.ts` (columns from every row incl. a first row without Poster URL, guarded header names; B211); 7 + Other categories get distinct colours (`makeDoughnut`/`makePolar`); `tests/unit/allowScripts.test.ts` fails if the lockfile's esbuild moves without `package.json`'s exact `allowScripts` entry (B206). `search.test.ts` gains accented language-name cases (B207).

## [0.12.0] - 2026-11-23

Clears the rest of `BUG_BACKLOG.md` §1–§3: every remaining item is fixed or closed. A `/simplify` pass and a `/code-review` (high) of the result follow; that review's findings (B194–B200, §3v) are fixed too. Full e2e 135/135.

### Fixed
- **A page whose code failed to download couldn't be recovered without a full reload** (B10). React.lazy caches a rejected import, so "Try Again" re-threw the same error. Movies, Stats and the Dashboard movie drawer now load through `retryableLazy()` (`src/utils/retryableLazy.ts`): a failed download is wrapped in `ChunkLoadError` and a fresh lazy is queued, applied when the error view clears. The route error view shows a connection message plus **Reload page** for it; its Try Again retries at once, without waiting on the catalogue (B197).
- **"Try Again" re-rendered before the catalogue reloaded** (B11). `refetch()` now returns a promise; after a crash the error view (button spinning) stays up until the reload finishes. A late reload can no longer clear a newer error (B196).
- **The outermost error view couldn't recover** (B23): its Try Again reloads the page, and the crashed tree is no longer re-rendered before the reload (B198).
- **Search didn't ignore accents** (B20): `amelie` finds *Amélie*. Each movie's folded text is cached and the term folded once per search.
- **Names containing a comma split into fake categories** (B147). The in-app import and `movie-search.py` replace a comma inside one name with a space before joining (`joinNames()` / `catalogue_io.join_names()`); existing rows aren't rewritten.
- **Language case/whitespace variants counted as separate languages** (B146). The server trims and lower-cases `Language` when it loads the CSV, so `EN` and ` en` are `en` in the API and every chart. The next in-app delete persists the normalised codes.
- **White flash before first paint, light browser chrome in dark theme** (B35). `public/theme-init.js` applies the saved/OS theme before React mounts, with an inline base colour and `color-scheme`.
- **Recent Releases could show a heading over an empty list** (B195): "No dated releases" when no movie has a parseable date.
- **The browser tab kept the previous page's name** (B33, B200). Each page names the tab ("Movies · MovieDash"); a failed route shows "Something went wrong".

### Accessibility
- Page headings take focus after an in-app navigation so screen readers announce the new page (B33); the first page of a visit keeps normal focus, even after Stats rewrites `?tab=` or a reload (B194, `src/utils/firstPage.ts`). New `PageTitle` component, also on the 404 page.
- The Sidebar collapse toggle is a real keyboard-operable button named "Collapse/Expand sidebar" with `aria-expanded` (B12); the desktop menu is a `<nav aria-label="Main">` landmark (B32).
- Filter chips are a named list, each with a real "Remove <chip>" button instead of antd's unfocusable "Close" icon (B28).
- Range-slider handles are named ("Release year minimum/maximum", B29).

### Changed
- antd `List` (deprecated in v6) replaced by plain lists on the Dashboard and in Add Movie (B49).
- Create React App leftovers removed: `favicon.ico`, `manifest.json`, `logo192/512.png` (B36), replaced by `favicon.svg`; the CRA entries are gone from `.gitignore`.
- Chart wrappers take their text/grid/tick colours from `chartInk(isDark)` instead of hardcoding them (B40).
- Shared stats helpers `splitNames`, `topN`, `topBy`, `topAverages`, `averagesBy` replace duplicated aggregation code across the Stats tabs, drawer, grid and filters (B41); `Actors/Actresses` joins `MULTI_VALUED_FIELDS`.
- `docs/screenshots/` regenerated from the template CSV (B47).
- e2e selectors moved off layout and antd internals onto helpers (`filterChip`, `columnCells`, `searchResult`, `exportCsv`) (B50).
- Server tests are type-checked (`server/tsconfig.test.json`, run by `type-check:server`) (B38).
- `DEFAULT_FILTERS` lives in `src/types/movie.ts`.
- `/simplify` pass: one `clearError()` in `ErrorBoundary` with a generic `onClear` prop; Language normalisation moved from the client to the server; shared e2e helpers; skipped items are listed in BUG_BACKLOG.
- The "Added" tag's margin override in Add Movie is now a documented exception (B199).
- Landing JS is about 332 kB gzip (was ~364).
- Closed without a fix: B39 (stat-card accents, by design), B75, B191, B192 (won't fix).
- README, CLAUDE.md, features.txt and `openspec/specs/catalog-data-format` updated; `BUG_BACKLOG.md` §3v added (B194–B200), §6 rows 87–90.

### Added
- 18 e2e tests (117 → 135): chunk retry and Try Again behaviour, theme pre-paint, keyboard chip removal, slider names, sidebar keyboard and landmark, page title and focus (incl. first page), 404 heading, accent search, empty Recent Releases and other §4 spec scenarios. The client Language test moved to the server.
- 3 server tests (115 → 118): commas in names, missing director, Language normalisation.
- 17 frontend unit tests (39 → 56): `tests/unit/search.test.ts`, `persistedFilters.test.ts`, more `statsHelpers` and `chartTheme` cases (B15).
- 2 Python tests (40 → 42): `join_names` and its parity with the server.

## [0.11.12] - 2026-11-23

Fixes from a `/code-review` (high) of the staged 0.11.8–0.11.11 diff (BUG_BACKLOG §3u). Of its 7 findings, 5 are fixed, B191 is accepted (no fix planned) and B192 stays open pending a design choice.

### Fixed
- **Dashboard trend and rating charts let you click empty years/bars** (B187). A zero-filled trend year or an empty rating bucket showed the pointer and drilled down to an empty Movies list; both charts now pass `isClickable` (count > 0), like the Stats charts.
- **Crossed slider handles could round an untouched bound** (B193). rc-slider lets range handles cross (`allowCross` defaults to `true`) and reports sorted values, so an untouched bound such as a drill-down's `3.999` could arrive at the other index and be saved as `4.0`. `RangeSlider`'s `keepUntouched` now matches by index first, then the other bound, using each committed bound once.
- **Export filename could disagree with the exported rows** (B188). The name used the live search while the rows used the debounced one; it now uses the debounced search too.
- **Recent Releases read "released , rated …" for an undated movie** (B189). The accessible name leaves out the release part when the date is blank.

### Changed
- e2e write-guard lint (B190): `browser.newPage()` (a new, unguarded context) is banned in `tests/`, and computed access such as `request['post']` is caught alongside `request.post`.
- CLAUDE.md, README and features.txt updated; `BUG_BACKLOG.md` §3u: B187–B190 and B193 fixed, B191 accepted, B192 open.

## [0.11.11] - 2026-11-23

Batch N fixes (modules added after the per-module sweep): OpenSpec `fix-batch-n-review` is applied and archived, and its requirements are synced into the `dashboard-layout`, `catalog-persistence`, `movie-browsing`, `accessible-ui` and `dev-quality-gates` main specs. With it, all 85 tracked modules are reviewed (CR + SR) and fixed. The `/security-review` found nothing at ≥ 8 confidence.

### Fixed
- **A drawer crash was reported as a failed download** (B178). `ChunkErrorBoundary` caught every error, so a render crash in the movie drawer showed "Couldn't open movie details" and crashed again on each reopen. `loadDrawer` now wraps an `import()` rejection in `ChunkLoadError`; the boundary handles only that and rethrows anything else, so the route error view shows real crashes.
- **The drawer retry could keep failing in some browsers** (B179). Chromium downloads a failed module again, but other browsers may cache the failure, so the alert now also offers **Reload page**.
- **Typing a language name in the Filters drawer found nothing** (B177). The Language picker searched ISO codes; it now searches the names it shows ("Tamil").
- **A blank server error showed no message** (B180). `serverErrorMessage` treats blank text as none, so Add Movie and the drawer's delete fall back to "Request failed" / "Delete failed".

### Security hardening
- **The formula guard now also escapes a leading tab or carriage return** (B181), as OWASP lists. The server, Export CSV and the Python tools are changed together; stored values still read back unchanged. The real catalogue had no value this affects.

### Changed
- `statsHelpers.test.ts` imports `RATING_BUCKETS` instead of keeping a copy (B182); a chart that stops being clickable resets the pointer cursor (B183, latent); `ChunkErrorBoundary`'s doc comment now matches how it's keyed (B184).
- The Python backfill "file untouched" test checks that the rewrite was never called, instead of comparing mtime (B186).
- `/simplify` pass over the staged 0.11.8–0.11.11 diff (reuse, simplification, efficiency, altitude reviews), with no behaviour change:
  - The ~20 `useCallback` wrappers on Dashboard/Stats chart click handlers are gone (with the `yearLabels` memo and the misleading `formatRoi` comment): the chart wrappers read callbacks through `useLatest` at event time, so identity never mattered. The year-click handlers no longer repeat the `isClickable` check that `clickHandlers` already enforces.
  - New `drillableLabelAt()` and `continuousYears()` in `statsHelpers.ts` replace 8 copies of the label cast-and-check and 3 hand-built year axes; OverviewTab counts years and finds the span in one pass, with a `for` loop instead of a cast.
  - Stats uses `computeFilterSpans` for its year bounds and the now-exported `clampRange(..., true)` for its range clamp; RuntimeTab's open bucket ends at `computeFilterSpans().runtimeMax`, the Movies slider's own max.
  - Dashboard uses `parseVote` for every vote read, and one `Tag` instead of two branches for rated/not rated.
  - New `src/components/EmptyState.tsx` replaces three copies of the empty-state card.
  - `TopNExplorer` computes each movie's metric once instead of on every sort comparison (~46k calls → 2k).
  - `ChunkLoadError` drops its unused `original` field and `onError` its unused argument; `filterChips` trims the search once.
  - e2e: `chartCanvas`, `dashboardChartCanvas`, `confirmDrawerDelete`, `codesByLanguageName` and `FILTERS_STORAGE_KEY` in `tests/helpers.ts`, a local `failDrawerChunkOnce`, and one `isPointerAt` probe shared by the canvas sweeps.
  - Skipped (deeper than this diff, or changing test mechanics): shared `parseRuntime`/known-revenue helpers, a shared vote tag for `MovieDrawer`, `TopNExplorer` NaN-for-unknown, typing in `selectInDrawer`, chart-geometry clicks.
- CLAUDE.md documents `ChunkLoadError` and the Reload action, the tab/CR prefixes and their parity test, the blank-message rule and the Language picker's label search; README and features.txt updated.
- `BUG_BACKLOG.md`: new §3t with B178–B186, B177 fixed; §6 Batch N rows 76–81, 83–85 set to ☑ (reviewed and fixed); Progress 85 of 85.

### Added
- 4 e2e tests (113 → 117): the Reload page action, a drawer crash reaching the error view, the language picker found by name, and a blank server error on search and delete.
- 1 server test (114 → 115): a tab-led formula title stored escaped once and served unchanged after a rewrite.
- `tests/unit/csvEscape.test.ts` and 2 cursor tests in `chartHelpers.test.ts` (30 → 36), then 3 for the `/simplify` helpers (36 → 39).
- 2 Python tests (38 → 40): the Python and TypeScript formula prefixes must match (B185), and an append → read round trip.

## [0.11.10] - 2026-11-23

Batch L and M fixes (server tests, e2e spec + helpers): OpenSpec `fix-server-tests-review` (archived 2026-11-22) and `fix-e2e-review` (archived 2026-11-23) are applied, and their requirements are synced into the `dev-quality-gates` main spec. All eleven review-fix changes from the 2026-11-20 per-module review are now archived. These are test fixes; the only production changes are a test seam and moved constants, with no behaviour change.

### Fixed — server tests
- **Tests that waited by sleeping** (B153, B157): the duplicate-in-queue and `drain()` tests now wait for a `reached()` promise that a stub or fs hook resolves, instead of `sleep(30)`/`sleep(50)`, so they still reach the state they describe on a loaded runner.
- **Injected faults never checked to have fired** (B154): `armedStat` exposes `fired`, and both tests assert it, so a server change that moves the fault point fails the test instead of passing untested.
- **Write-failure test relied on `chmod`, which root ignores** (B158): failures are injected through `fsHooks` (`rename`, plus a new `appendFile` hook for the import's append), so the suite passes in a root container.
- **Tests that passed with nothing tested** (B152, B155, B156): the apostrophe round-trip now really reloads, the deadline test requires at least two attempts, and shutdown is also tested with drain finishing first.
- Test names, a stale comment and a 502 stub that the real client can't throw (B159–B161).

### Fixed — e2e
- **Director, runtime and revenue filter tests checked only the chip** (B162), and **"multiple filters combined" never checked the count** (B163). They run on mocked rows and assert the exact total; the combined test requires a non-empty AND result first. Each was confirmed to fail with its filter removed.
- **The e2e write guard covered only `page`** (B164). It's now on the browser context (any page the test opens), the `request` fixture is GET-only, and lint bans `.request.post/put/patch/delete/fetch` and `newContext` in `tests/`. Nothing misused the gap.
- **Bucket bounds copied into the test** (B166): `RATING_BUCKETS` and `VOTE_BUCKETS` moved to `src/utils/chartBuckets.ts`, shared by the Dashboard, Ratings tab and the e2e drill-down tests.
- Fragile helpers (B165, B167–B169, B171): `yearSpan()` returns `null` with no years and both callers skip the same way; the language test counts by code; `selectInDrawer` matches the option title exactly; `chooseOption` uses `getByTitle(…, { exact: true })` instead of an unescaped CSS selector; duplicate JSDoc removed.
- Two tests named for more than they checked (B170): the pagination visibility test is merged into "second page of pagination loads", and the rating-colour test checks the tag colour of a mocked 8.5-rated movie.

### Added
- `src/utils/chartBuckets.ts`; `fsHooks.appendFile` in `createApp()`; `reached()` and `isPending()` in `server/__tests__/helpers.ts`.
- 2 server tests (112 → 114): drain finishing first at shutdown, and a network-error 502.

### Changed
- e2e tests 114 → 113 (pagination tests merged); still 13 suites.
- `dev-quality-gates` spec: the write guard also covers pages the test opens and API requests that skip page routing.
- CLAUDE.md documents the context-level guard, the GET-only `request` fixture and its lint bans, `chartBuckets.ts`, `reached()`/`isPending()` and the fault-fired rule; README and features.txt test counts updated.
- `BUG_BACKLOG.md`: B152–B171 fixed; §6 rows 62–68, 70, 71, 73 and Batches L, M set to Fix ☑. New open B177 (§3s): typing a language name in the Filters drawer finds nothing. §6 now tracks 85 modules: rows 82–85 add `catalogue_io.py` (reviewed with Batch B), `csvEscape.ts`, `test_catalogue_io.py` and `chartBuckets.ts`, and the last three join Batch N, which still needs a CR + SR pass.

## [0.11.9] - 2026-11-22

Batch F, I1 and I2 fixes (Dashboard, Stats page, Stats tabs): OpenSpec `fix-dashboard-review`, `fix-stats-review` and `fix-stats-tabs-review` are applied and archived, and their requirements are synced into the `accessible-ui`, `dashboard-layout` and `analytics-drilldown` main specs. Nine of the eleven review-fix changes are now archived; `fix-server-tests-review` and `fix-e2e-review` (tests only) are still open.

### Fixed — Dashboard
- **"Top Rated" ignored vote count** (B108, same as B7): a 1-vote 10.0 beat The Godfather. Dashboard and Stats › Explore "Highest Rated" now share `ratingPool()` (at least 50 votes, dropped when fewer than 10 movies qualify), so they pick the same movie.
- **A failed movie-details download broke the Dashboard until reload** (B109). A local `ChunkErrorBoundary` keeps the page up, shows an inline error, and the next click downloads the details again. It's an `Alert`, not antd `message`, which would have added ~9 kB gzip to the landing page.
- **Negative revenue lowered Total Box Office** (B110); **unrated movies showed "⭐ 0" and empty averages showed 0** (B114): revenue ≤ 0 is skipped, unrated movies get a "Not rated" tag, and Average Rating/Runtime show "—" when nothing is known.
- **Screen readers didn't hear card values** (B111) and **Recent Releases lost its list role** (B112). Stat, highlight and recent-release names now include what's shown; each list item holds a real `<button>` (`.recent-release-button`). Section headings are h4 under the page's h3 (B116), at the same visual size.
- Memoized chart click handlers (B113), hero tint built with `withAlpha` (B115).

### Fixed — Stats page
- **"Movies Released per Year" had an "Unknown" point and skipped gap years** (B4). It now runs from the first to the last year, ascending, with 0 for empty years (not clickable).
- **Earliest/Latest Release showed 0 with no dated movies** (B24, Stats part; B135): shown as "—", computed in one loop.
- **No empty states** (B25): an empty catalogue shows "Go to Movies"; a year range with no releases shows "Reset range" in place of the tabs and keeps the tab.
- **The Release Year Range wasn't re-checked when the data changed** (B131): it's clamped to the new span, or reset when it no longer overlaps or covers everything.
- **Top 10 Explorer**: the metric select no longer shrinks to 87 px at 320 px (B132); "Oldest" ranks by release date and leaves out undated movies (B133); text uses the theme colours, readable in light theme (B34).
- Language bars get hover feedback again (B134); Overview/Explore chart callbacks memoized (B13).

### Fixed — Stats tabs
- **Unrated movies dragged rating averages down** (B6). New `parseVote()` (`null` for missing/NaN/≤ 0) is the one rule for every Stats rating chart; `MIN_FILMS` counts rated films only, and an empty runtime bucket has no bar instead of 0.
- **The language radar could plot an "Unknown" 0.0 spoke** (B18): the top 8 come from languages with rated films.
- **"Average Vote by Year" skipped gap years** (B136): continuous axis, the line breaks at years without rated films, which aren't clickable.
- Radar point borders and the scatter hover colour are no longer hardcoded (B137, B138); People/Ratings/Runtime/BoxOffice chart callbacks memoized (B13).

### Added
- `src/components/ChunkErrorBoundary.tsx`; `ratingPool()`, `MIN_VOTES_FOR_RATING`/`MIN_QUALIFYING_FOR_CUTOFF` and `parseVote()` in `statsHelpers.ts`.
- 14 e2e tests (100 → 114): Dashboard Top Rated vs Explore, the drawer chunk retry, unknown values, accessible names/list/headings; Stats per-year gaps, empty range, empty catalogue, range clamp after a refresh (two cases), Oldest ordering, the 320 px toolbar; director averages without unrated films, radar spokes, the average-by-year gaps and drill-down.
- 1 unit test (29 → 30): `parseVote`.

### Changed
- CLAUDE.md documents the drawer boundary, `ratingPool`, `.recent-release-button`, Dashboard/Stats unknown values, Stats empty states and range clamp, the continuous per-year charts, the Top 10 changes and `parseVote`; README and features.txt updated.
- `BUG_BACKLOG.md`: B108–B116, B131–B138 fixed; B4, B6, B7, B18, B24, B25, B30, B34 closed; the last caller parts of B13 done; B10 stays open (route chunks). §6 rows 23, 25, 33–43 and Batches F, I1, I2 set to Fix ☑; new row 81 for `ChunkErrorBoundary.tsx`.

## [0.11.8] - 2026-11-21

Batch G fixes (Movies page and filtering): OpenSpec `fix-movies-filtering-review` is applied and archived, and its requirements are synced into the `accessible-ui`, `analytics-drilldown` and `movie-browsing` main specs. Six of the eleven review-fix changes are now archived; five are still open.

### Fixed — filters
- **Moving one vote handle after a rating drill-down rounded the other bound** (B117). The vote slider steps by 0.1, so it showed and committed the "2–4" drill-down's `3.999` as `4.0`, and 4.0 films (counted in "4–6") appeared in the "2–4" list. `RangeSlider` now keeps the exact committed value of any end the user didn't move (`alignToStep()` mirrors rc-slider's step alignment). The new e2e test fails without the fix.
- **The revenue slider moved $1 per key press** (B118). Its step is now about 1/100 of the span, rounded to 1/2/5 × 10^k (`niceStep()`), e.g. $20M for $1M–$2.8B.
- **Runtime 0 counted as a real runtime** (B119, same as B5). TMDB stores an unknown runtime as `0`. It is now unknown, like an unrated vote or unknown revenue: left out of the slider span, excluded while a runtime filter is active, and skipped by the Runtime tab's runtime-bucket chart, so "< 60 min" counts what its drill-down lists.
- **Surrounding spaces broke the search** (B120, the trim part of B20). "The Matrix " matched nothing, and a lone space showed a blank "Search:" chip and the active-filters dot. Search is trimmed at match time; the box still shows exactly what was typed.
- **A saved genre filter on a catalogue without a Genres column** (B121) no longer crashes. It was already fixed by 0.11.6's row normalisation, so no per-site guard was added; a new e2e test covers it.

### Fixed — export
- **The Export CSV explanation was mouse-only** (B122). The info icon is gone: the tooltip is on the button (hover and focus), and the button's accessible description carries the same text.
- **The export was always named `movies-filtered-N.csv`** (B123). It is `movies-N.csv` unless a search or filter is active (sorting alone isn't filtering).

### Added
- 6 e2e tests (94 → 100): a drill-down bound kept when the other vote handle moves, the revenue keyboard step, search ignoring surrounding spaces, a saved genre filter without a Genres column, runtime 0 as unknown, and the Export button's hint and filtered filename.
- `tests/unit/filterSpans.test.ts`, 3 unit tests (26 → 29): `alignToStep`, `niceStep`, and runtime 0 left out of the slider span.

### Changed
- "CSV export triggers download" now expects `movies-N.csv`, since it runs with no filters.
- CLAUDE.md documents the slider, unknown-runtime, search-trim and export-filename rules; README test counts and descriptions updated.
- `BUG_BACKLOG.md`: B117–B120, B122, B123 and B5 marked fixed, B121 resolved, B20's trim part fixed (accent folding still open); §3j marked fixed; §6 rows 24, 30–32, 54, 55, 74 and Batch G set to Fix ☑; §0 checks re-run.

## [0.11.7] - 2026-11-21

`/simplify` and `/code-review` (high) pass over the staged Batch D/E/H/J/K fixes (0.11.3–0.11.6). The review logged B172–B176, all fixed here. The simplify pass changes no behaviour except trimming in `formatDateDDMMYYYY`.

### Fixed
- **Clicking a crashed Movies or Dashboard page's own nav link didn't clear the error** (B172, a gap in the B97 fix). React Router turns a link to the URL already shown into a REPLACE navigation, and the boundary skipped every REPLACE. Now it skips only a REPLACE that keeps the path and changes the query string (Stats' `?tab=` sync).
- **A navigation that itself crashed the page rendered and logged it twice** (B173). The boundary records the `resetKey` the crash happened under (`errorKey`) and clears only on a newer one.
- **The hidden-column sort check used `.some` on the column's breakpoints** (B174). antd shows a column when any listed breakpoint matches, so the check now uses `.every`. This was latent, since every column lists one breakpoint.
- **Screen readers read each grid card's title twice** (B175). The title in the card body is `aria-hidden`, since it is already in the card's label.

### Changed
- **Chart wrappers:** the click wiring that 5 wrappers each repeated is now one `useClickHandlers()` hook in `Charts/chartHelpers.ts`. It returns `{}` without a handler and changes only when a handler appears or disappears.
- **Server error text:** one `serverErrorMessage()` plus a `hasStatus(err, n)` helper in the new `src/utils/httpError.ts` replace 3 copies (`AddMovieModal`, `MovieDrawer`, `MoviesContext`).
- **`voteColor`** moved to the new `src/utils/vote.ts`. The drawer and the grid share it; the drawer used to inline its own copy.
- **`MovieDrawer`:** the latest-id ref uses `useLatest`. Delete has one `refetch()` and one close-or-error step; a 404 counts as success.
- **`AddMovieModal`:** a 409 is turned into success in one place. The unused `alreadyImported` field is gone from the client result type.
- **`ThemeContext`:** it stores the saved choice and the OS preference, and derives `isDark`/`hasChoice` from them (was three state values).
- **`formatDateDDMMYYYY`:** trims its input, so a blank value gives `''`. The drawer's own `.trim()` guard is gone, and the unit test checks blank and padded input.
- **e2e:** `tmdbResult()`/`openAddMovie()` are reused by the Add Movie tests, one `CanvasTextWindow` type replaces a repeated cast, and the existing `nextFrames()` replaces an inline copy. The grid-description test also checks the title isn't repeated.
- **CLAUDE.md:** documents `useClickHandlers`, the new `resetKey` rule, the new utils, and the grid tags' `margin: 0` as the one exception to the global Tag margin (B176).
- `BUG_BACKLOG.md`: new §3r with B172–B176, all fixed.

## [0.11.6] - 2026-11-21

Batch H fixes (Movies views, mutations and export): OpenSpec `fix-movies-views-review` is applied and archived, and its requirements are synced into the `accessible-ui`, `catalog-persistence` and `movie-browsing` main specs. Five of the eleven review-fix changes are now archived; six are still open.

### Fixed — Add Movie
- **A search typed while another was running was silently dropped** (B125), so the list showed results for the old text. A new search now replaces the running one: its request is aborted and a late reply is ignored. This also resolves a contradiction in the `catalog-persistence` spec.
- **Importing a movie already in the catalogue showed an error** (B126). A `409` now marks the row "Added" and refreshes the catalogue.
- **"Added" stuck to a movie deleted afterwards** (B37). "Added" now follows the current catalogue, so Import comes back after a delete.
- **Starting an import hid an earlier import's error** (B128). Only a new search clears the error, and the alert can be dismissed.

### Fixed — movie details and views
- **A delete still running acted on a different movie's drawer** (B19). It closes the drawer or shows its error only if the drawer still shows the movie it was started for, and switching movies clears the loading state.
- **The drawer heading's 🎬 was read aloud** (B31). It is now `aria-hidden`.
- **Blank or zero values showed as real ones** (B24, drawer and grid parts). Runtime 0 shows "—" (and no "0 mins" on cards), a blank date or year is left out instead of "Release  ()", and a vote of 0 shows a "Not rated" tag instead of a red "⭐ 0".
- **The Language column sorted by ISO code** (B124). It sorts by the language name it shows (de/el/en → English, German, Greek).
- **A hidden column kept sorting the rows and the export** (B21). A sort on a column hidden at the current width is cleared and stays cleared when the window widens again.
- **Grid cards announced only the movie name** (B30, grid part). Cards keep their label and add their visible details as an accessible description.
- **Missing fields crashed the grid, drawer, table sorters and Stats tabs** (B129, B17). Each fetched row is normalised once in `MoviesContext`: every catalogue column becomes a string (`''` when missing), so no view needs its own guard.

### Fixed — export
- **Excel garbled accented titles** (B14). The CSV starts with a UTF-8 BOM.
- **Column names skipped the formula guard** (B130). Header cells are guarded like data cells.
- **The download link was released straight after `click()`** (B127), which can cancel the download in some browsers. It is now released after 1 s.

### Added
- 11 e2e tests (83 → 94): rapid successive searches, `409` shown as Added, Import offered again after a delete, an earlier import error kept visible, a delete finishing after switching movies, unknown values in the drawer, Language sort, a sort cleared when its column is hidden (table and export), a row missing Genres/Release Date in every view, grid-card accessible descriptions, export BOM and guarded header names.

### Changed
- The Add Movie e2e test's already-imported result is now a catalogue row, since "Added" no longer comes from the search result's `alreadyImported` flag.
- `BUG_BACKLOG.md`: B14, B17, B19, B21, B31, B37 and B124–B130 marked fixed; B24/B30 drawer and grid parts noted; §6 rows 26–29, 52 and Batch H set to Fix ☑; §0 checks re-run.

### Notes
- `fix-movies-filtering-review`'s B121 guard (Genres filter without a `Genres` column) is now redundant but harmless, since missing fields are normalised to `''`.

## [0.11.5] - 2026-11-21

Batch D (app shell) and Batch J (chart wrappers) fixes: OpenSpec `fix-app-shell-review` and `fix-chart-wrappers-review` are applied and archived, and their requirements are synced into the `accessible-ui`, `analytics-drilldown` and `frontend-performance` main specs. Four of the eleven review-fix changes have now landed; seven are still open.

### Fixed — app shell
- **Tablet-width loads showed the sidebar expanded** (B94). antd 6.7's `useBreakpoint()` is real on the first render, so the old collapse-on-change never ran; `collapsed` now starts from the first-render breakpoint.
- **A failed first load showed "0 movies in catalogue"** (B95, same as B27). The count badge is hidden while the first load has failed.
- **Load errors showed axios's generic text** (B96). The error shows the server's `{ error }` message, and a first-load `503` ("still loading") is retried once after 1 s.
- **A crashed page stayed crashed when its own nav link was clicked** (B97). The error boundary also resets on PUSH/POP navigations within a section; REPLACE navigations (Stats' `?tab=` sync) don't, so tab switches never remount Stats.
- **Back/Forward forced the page to the top** (B98). `ScrollToTop` skips POP navigations. (Chromium already restored the position after the old reset, so this matters for other browsers.)
- **The refresh spinner was never announced** (B99). TopBar has an always-mounted `role="status"` region with "Refreshing catalogue…" text; new `.visually-hidden` utility in `index.css`.
- **The collapsed sidebar logo was announced as "play-circle"** (B100) and **BottomNav icons leaked into link names** (B101). The logo link is named "MovieDash – Dashboard"; nav icons are `aria-hidden`.

### Fixed — chart wrappers
- **Charts redrew on every unrelated parent re-render** (B13). Callback props are read at event time through a new `useLatest()` hook, so the options memo no longer depends on callers' function identities. Measured on the Stats Overview: about 50 redraws per chart while the counters animate before, about 10 (the end of the first animation) after. The per-caller `useCallback` tasks in `fix-dashboard-review`, `fix-stats-review` and `fix-stats-tabs-review` are now optional.
- **Count tooltips showed `23.00`** (B26). Integers print as-is, other values with at most 2 decimals, and a missing value shows "—" instead of throwing.
- **Line points were hard to hover or click** (B139). Line charts use index-mode interaction: anywhere in a year's column targets it, and the pointer cursor still matches what a click does.
- **Smoothed lines bent past the data** (B140). Monotone interpolation keeps them smooth without overshooting.
- **The scatter tooltip hardcoded "votes" and "/10"** (B141). It names values by the chart's axis labels.
- **Single-series charts showed a legend whose only entry hid all the data** (B142). The legend is shown only with more than one dataset.

### Added
- 10 e2e tests (73 → 83) and 3 unit tests (23 → 26, `formatNumber`). Every new e2e test except two guards was confirmed to fail on the previous code; the guards are "Stats tab switches don't remount" and "Back keeps the scroll", which Chromium can't reproduce. Canvas-drawn text (tooltips, legends) is checked by recording `fillText` calls.

### Changed
- E2E nav-link lookups use `exact: true`, since the logo link's name now contains "Dashboard".
- `BUG_BACKLOG.md`: B94–B101, B27, B13, B26 and B139–B142 marked fixed; §6 rows 9–16, 44–51 and Batches D and J set to Fix ☑; §0 checks re-run.

### Notes
- The pending check from `fix-contexts-hooks-review` is done: "Unexpected response from the server" passes through the new `errorMessage` helper unchanged and doesn't trigger the 503 retry.

## [0.11.4] - 2026-11-21

Batch E fixes (contexts and hooks): OpenSpec `fix-contexts-hooks-review` is applied and archived, and its requirements are synced into the `movie-browsing` main spec.

### Fixed
- **The theme followed the OS only on the first visit** (B102, same as B22). The OS-derived default was saved on mount as if the user had chosen it. Now only the theme toggle saves a choice, and until then the theme follows `prefers-color-scheme`, including changes while the app is open.
- **A 200 response that isn't a list crashed every page** (B103). It is now a failed load: the first load shows the load error with Retry, and a refresh keeps the last data and shows the refresh error.
- **The old search kept filtering for 300 ms after it was cleared** (B104). Clearing the search (Clear all, its chip, or emptying the box) applies at once; typing is still debounced. `useDebounce` takes an optional `immediate` predicate.
- **A drill-down first rendered the filters saved earlier in the session** (B105). The drill-down's filters are now the Movies page's initial state (`usePersistedFilters(defaults, preset)`), and they are clamped to the data like restored filters.
- **Blocked `localStorage` stopped saved filters restoring** (B106). The legacy cleanup has its own `try`.
- **The theme was stored under the bare key `theme`** (B107), which another app on the same origin could read or overwrite. It is now `movieDash_theme`.

### Added
- 8 e2e tests (65 → 73): theme follows the OS until a toggle, a toggled choice wins after reload, another app's `theme` key is ignored, filters restore with `localStorage` blocked, a non-list response shows the load error, Clear all skips the debounce (Playwright clock), a drill-down never renders the saved filters, and a decade drill-down past the data is clamped. Each one was confirmed to fail on the previous code.

### Changed
- `BUG_BACKLOG.md`: B102–B107 and B22 marked fixed; §6 rows 17–22 and Batch E set to Fix ☑ (the Batch E row had an extra cell, now repaired).

### Notes
- **Existing users see their OS theme once.** The old `theme` key is neither read nor removed: every value in it was written on mount, so it can't be told apart from a real choice. One toggle saves the preference again.
- The planned "vote drill-down clamped to the data" test was replaced by a decade (year) drill-down: vote ranges are never clamped, because the vote slider is fixed at 0–10 by design.
- When `fix-app-shell-review` lands, check that its `errorMessage` helper passes "Unexpected response from the server" through unchanged and that the error doesn't trigger its 503 retry.

## [0.11.3] - 2026-11-21

Batch K fixes (utilities and types): OpenSpec `fix-utils-types-review` is applied and archived, and its requirements are synced into the `analytics-drilldown` and `dev-quality-gates` main specs. This is the first of the 11 review-fix changes from 0.11.2 to land.

### Added
- **Frontend unit tests:** `npm run test:unit` (`tsx --test tests/unit/*.test.ts`, Node's `node:test`, no new dependency). 23 tests cover `formatRevenue`, `withAlpha`, `formatDateDDMMYYYY`, `getLanguageName`, `groupByField`, `topNWithOther` and `bucketToRange`/`countIntoBuckets`. CI runs them after the server tests, and Playwright ignores `tests/unit/` (B15, part).
- Compile-time check that `CATALOGUE_COLUMNS` lists every `Movie` field: it is now `as const satisfies`, and a missing field fails the build (B149).

### Fixed
- Revenue labels at unit boundaries: 999,600 now reads `$1.0M` instead of `$1000K`, and 999,960,000 reads `$1.0B` instead of `$1000.0M` (B143).
- Doughnut charts no longer set `hoverBackgroundColor`, so Chart.js derives the hover colour (B144). Polar-area fills use `withAlpha(c, 0.8)` instead of appending `'cc'` to the hex (B145).
- `formatDateDDMMYYYY` reformats only an exact `YYYY-MM-DD` value and returns anything else unchanged; a missing value gives `''` instead of throwing (B148).
- `withAlpha` accepts `#RGB` as well as `#RRGGBB` and throws a `TypeError` for any other format, so a bad colour no longer renders silently wrong (B150).
- `getLanguageName('constructor')` (and other inherited keys) returns the code instead of a function (B151).

### Changed
- `.gitignore`: `*.tmp.test.ts` for ad-hoc unit tests.
- `BUG_BACKLOG.md`: B143–B145 and B148–B151 marked fixed, B15 partly fixed, §6 rows 53, 56–61, 75 and Batch K set to Fix ☑, §0 checks re-run.

### Notes
- B146 (language case variants) and B147 (commas inside names) stay open, as planned in 0.11.2.
- `getLanguageName` uses `Object.prototype.hasOwnProperty.call`, not `Object.hasOwn` as the design first said: the root tsconfig's `lib` is ES2020.

## [0.11.2] - 2026-11-20

Per-module review finished: every one of the 75 source modules in `BUG_BACKLOG.md` §6 now has a `/code-review` (high) and a `/security-review`. This release records the findings and the proposed fixes only. **No application code changed.**

### Added
- **11 OpenSpec changes proposing the review fixes**, one per batch. None is applied yet.

  | Batch | Area | Change | B-IDs |
  |---|---|---|---|
  | D | App shell | `fix-app-shell-review` | B94–B101 |
  | E | Contexts and hooks | `fix-contexts-hooks-review` | B102–B107 |
  | F | Dashboard | `fix-dashboard-review` | B108–B116 |
  | G | Movies page and filtering | `fix-movies-filtering-review` | B117–B123 |
  | H | Movies views, add/delete and export | `fix-movies-views-review` | B124–B130 |
  | I1 | Stats page, Overview and Explore tabs, Top 10 | `fix-stats-review` | B131–B135, plus older B4, B13, B24, B25, B34 |
  | I2 | People, Ratings, Runtime and Box Office tabs | `fix-stats-tabs-review` | B136–B138, plus older B6, B13, B18 |
  | J | Chart wrappers | `fix-chart-wrappers-review` | B139–B142, plus older B13 and B26 (fixed inside the wrappers) |
  | K | Utilities and types (adds `npm run test:unit`) | `fix-utils-types-review` | B143–B151 |
  | L | Server tests | `fix-server-tests-review` | B152–B161 |
  | M | End-to-end tests and helpers | `fix-e2e-review` | B162–B171 |

- `BUG_BACKLOG.md`: B94–B171 logged in §3g–§3q, with rejected findings and the reason for each. Older items covered by a proposed change are marked ◐ and point to the new ID.

### Changed
- `BUG_BACKLOG.md` §6: code review and security review are ticked for all 75 modules. The Fix column stays ☐ until each change is applied.

### Notes
- **No exploitable vulnerability found.** The security review of Batches I1–M found nothing at HIGH or MEDIUM confidence.
- **Two findings are logged but left open:**
  - B146: `'en'` and `'EN'` show as separate languages. The fix belongs with the row clean-up planned for B129.
  - B147: names that contain a comma are split into separate categories. This needs a CSV format decision first.
- **The proposed changes overlap.** Several edit the same files, so whichever is applied second needs a rebase.
- **B13 needs a decision.** The fix inside the chart wrappers makes the per-caller `useCallback` tasks in the Dashboard and Stats changes optional.

## [0.11.1] - 2026-11-14

Batch B (Python CSV writers) closed out: a high-effort re-review of `fix-python-csv-writers` (B79–B86, OpenSpec `harden-python-catalogue-io`), a `/simplify` pass, and a follow-up review (B87–B93). Both OpenSpec changes are archived, and their requirements are synced into the `catalog-persistence` main spec. The parked `upgrade-typescript-7` change was dropped; re-propose it once typescript-eslint supports TypeScript 7.

### Added
- Python unit tests: 19 → 38 (headers, escaping, column order, append races, backfill stops, non-UTF-8 files).
- Server tests: 111 → 112 (blank header cell in the middle of the header).

### Changed
- **`movie-search.py` keeps the window responsive.** Every TMDB fetch and the save's CSV writes run on a worker thread. Search, Save, Next Page and the language box are disabled until the result arrives. (B84, B90)
- A language-filtered search reads at most 10 TMDB pages per view, and Next Page continues from there. A rare language can show only a few matches per view. (B85)
- A save makes one TMDB request per movie (`append_to_response=credits,keywords`) instead of three.
- `catalogue_io.py` owns the shared rules: the TMDB GET (`get_tmdb_object`), formula escaping on append, the server's column order for a new file (`CATALOGUE_COLUMNS`, kept equal to `src/types/movie.ts` by a test), and one `CatalogueError` family with readable messages. (B86)
- A rejected TMDB key (401) is reported as an API-key problem in `movie-search.py`, not as a connection error. (B93)

### Fixed
- **A header name with stray spaces (`Poster URL `) no longer makes the Python tools add a duplicate column**, which then made the server refuse every add and delete. Python reads headers like the server: names trimmed, blank cells ignored. (B79)
- A header that repeats a column is refused by the Python tools too, instead of rewritten with one column's data lost. (B80)
- **A blank header cell in the middle of the header no longer shifts appended values one column left**, in both the server's import and the Python tools. (B87)
- `movie-search.py` builds a saved row only from the details fetched for that save, so a movie whose details failed while listing is no longer stored with a blank language, runtime and year. (B81)
- The backfill saves the posters it found when it is interrupted (Ctrl+C exits 130) or hits an unexpected error. A failed checkpoint (disk full, unreadable file) is retried instead of ending the run, and a failed final save says the posters were lost. (B82, B92)
- The Python duplicate check runs again right before appending and after adding a column, so a movie imported in the app at that moment isn't stored twice. (B83, B88)
- A title like "1917" no longer crashes the save summary in `movie-search.py`. (B89)
- A failed or empty search keeps the paging of the list still on screen. (B91)
- With the network down, a title search shows one error instead of "Connection Error" followed by "No Results".

## [0.11.0] - 2026-11-07

Results of the per-module review (`BUG_BACKLOG.md` §6) of Batch A (server runtime), Batch B (Python CSV writers) and Batch C (build/lint/test config). OpenSpec: `fix-server-batch-a-review` and `harden-build-test-config` (archived), `fix-python-csv-writers`. New main spec: `dev-quality-gates`.

### Added
- **`catalogue_io.py`**, one shared module for the Python tools' CSV I/O and TMDB session, following the same file rules as the server.
- Python unit tests: 19 stdlib `unittest` tests in `tests/python/`, run in CI after `ruff`, which now also lints the new module.
- Server tests: 95 → 111.
- **CI quality gates** (`harden-build-test-config`):
  - A committed `test.only` fails the e2e run in CI (`forbidOnly`). (B68)
  - Lint rejects specs that import `test` from `@playwright/test` instead of `tests/helpers.ts`, since only the helpers' fixture keeps e2e from writing the real CSV. (B69)
  - Lint bans `waitForTimeout` in tests. (B74)
  - `npm run build` also type-checks the e2e specs, helpers and build configs, through the new `tsconfig.node.json`. (B70)

### Changed
- **BREAKING: `TRUST_PROXY=true` is refused at startup.** It trusted any client-supplied `X-Forwarded-For`, so a client could pick its own rate-limit key (`express-rate-limit` 8 flags it). Use a hop count (usually `1`) or an address list. (B53)
- TMDB calls have a 15 s total deadline each, enforced by an abort signal (previously about 31.5 s, or about 63 s for an actor search). Only network errors and `429`/`5xx` are retried, and `Retry-After` is honoured. (B58)
- An import whose TMDB details response isn't a movie with a title (null, HTML, missing `title`) returns `502` and stores nothing. A null credits body still imports. (B54)
- Unexpected server errors and startup load failures are logged as one line. (B59)
- CSV escaping lives in one place, `src/utils/csvEscape.ts`, shared by the server and CSV export. A brand-new catalogue file gets its header in `CATALOGUE_COLUMNS` order. (B60)
- `movie-search.py`:
  - Result details are fetched in parallel and reused on save.
  - One error dialog per listing, and one summary dialog per save.
  - The CSV is read once per save. (B63)
- `npm run lint` fails on any warning (`--max-warnings 0`), and skips gitignored `*.tmp.*` throwaway files. The ESLint config uses `defineConfig` from `eslint/config`, replacing the deprecated `tseslint.config()`. (B72, B73, B77)
- The Vite dev server uses `strictPort`: if port 3000 is taken, `npm run dev` fails at once instead of moving to 3001 while Playwright waits on 3000. (B71)
- The bundle budget gzips at the default level, the same as the server's `compression()`, instead of level 9. Landing JS is still about 362 kB of 400. (B76)
- `backfill_posters.py` can be run while the app is open: each checkpoint re-reads the file and merges posters by `Movie ID`. (B61)

### Fixed
- **The Python tools handle Excel-saved (BOM) CSVs.** Before, duplicate checks never matched, the header migration added a second `Movie ID` column, and the backfill skipped every row. (B3)
- `movie-search.py` no longer saves a near-empty row when a TMDB request fails, which then blocked re-adding the movie. (B8)
- `movie-search.py` no longer glues a new row onto a last line that has no trailing newline. (B9)
- Backfill checkpoints no longer overwrite movies added while the backfill runs. (B61)
- `movie-search.py` Next Page no longer repeats results with a language filter, and no longer errors after an actor search. (B62)
- The backfill stops on a rejected API key (401) instead of requesting every remaining movie, and doesn't rewrite the file when it found nothing. (B64)
- A row with stray extra cells no longer crashes a Python rewrite. (B65)
- A briefly locked file (Excel, antivirus) no longer crashes a Python rewrite. (B66)
- The two scripts no longer share one fixed `.tmp` name. (B67)
- A value that really starts with an apostrophe before `=`, `+`, `-` or `@` (e.g. `'-ism`) keeps its apostrophe after a reload. Both the server and the Python tools now escape it once more on write.
- Two or more blank trailing header cells no longer take the catalogue offline. (B51)
- An import is served exactly as stored, so fields the file has no column for no longer show until a restart. (B52)
- Server rewrites and appends keep the file's BOM and CRLF/LF line endings. Before, Excel garbled non-ASCII titles after an in-app delete. (B55)
- The import's early `409` check sees rows removed by another tool. (B56)
- The docs no longer claim `npm run dev:lan` keeps the API local. Through Vite's `/api` proxy, devices on the LAN can list, add and delete movies, so only use it on a trusted network. (B78)
- After a failed startup, deleting the broken CSV recovers to an empty catalogue without a restart. (B57)

## [0.10.0] - 2026-11-06

### Added
- **One-process production mode.** `npm start` builds the app and the server, then serves the built SPA and `/api` together on port 5000. Client routes like `/movies` and `/stats?tab=people` fall back to `index.html`, so deep links and reloads work. Hashed `/assets/*` files are cached for a year (`immutable`), and `index.html` is `no-cache`, so a redeploy shows up on the next load. Unknown `/api/*` paths return a JSON `404`. `server:prod` takes a `--production` flag, which works in cmd, PowerShell and bash. (`prod-deploy`)
- `TRUST_PROXY` setting: behind a reverse proxy, rate limiting counts each original client instead of putting everyone in the proxy's bucket. It is off by default.
- `npm run dev:lan` opens the web app to your LAN (for testing on a phone). The API stays on loopback either way.
- **Bundle budget.** `npm run check:bundle` (`scripts/check-bundle.mjs`, also run in CI) fails if the landing page's initial JavaScript goes over 400 kB gzip, or if any chunk goes over 500 kB minified. (`reduce-bundle-size`)
- e2e tests for Add Movie, Delete, the Stats year slider and Reset, chart PNG download, the Dashboard empty state, the mobile bottom nav and grid sort. Every write and TMDB call is mocked, so e2e can't change `src/movies.csv`. CI also runs `ruff` on the Python tools. (`e2e-hardening`)
- Server tests: 62 → 95 (`bootstrap.test.ts`, `hosting.test.ts`).

### Changed
- **Dependencies on current majors** (`upgrade-major-deps`):
  - Express 5 and `express-rate-limit` 8
  - Vite 8 (Rolldown) and `@vitejs/plugin-react` 6
  - Ant Design 6 and `@ant-design/icons` 6
  - TypeScript 6.0.3 and `concurrently` 10
  - in-range bumps of the ESLint/Playwright tooling

  TypeScript 7 is blocked: typescript-eslint supports only versions below 6.1. It is parked as the OpenSpec change `upgrade-typescript-7`.
- **Landing page JS: about 517 → 362 kB gzip.** antd is no longer forced into one 988 kB vendor chunk, so each route loads only the components it uses. The Dashboard's movie drawer loads on first open. Chunks are configured through Rolldown's `codeSplitting.groups`, which replaces the deprecated `manualChunks`. Builds take about 2 s instead of 28 s.
- No visual change from antd 6. Tags keep their outlined v5 look through one `ConfigProvider` setting, and deprecated props moved to their v6 names (`Alert title`, `Drawer size`, `Modal destroyOnHidden`, `styles.*`).
- Async route handlers no longer need a wrapper: Express 5 passes their errors to the generic `500` handler. Routes still map storage and TMDB failures to their specific statuses.
- e2e tests use role queries where antd 6 renamed its classes (tab panes, Select value), have no fixed sleeps, and retry only in CI (`retries: 0` locally).
- `tsconfig.json` lists `types: ["vite/client"]`, and the server tsconfig uses `module`/`moduleResolution: "node16"` (TypeScript 6 deprecates `node10` resolution). The server build output is still CommonJS.
- Shared code: the Movies page search is `src/utils/search.ts` (`matchesSearch`), now used by the e2e helpers as well, so expected counts can't drift. Chart file names come from `src/utils/slugify.ts`. Server tests share `serverPool()`, `errnoError` and `sleep`.
- OpenSpec: `e2e-hardening`, `harden-server-entry`, `prod-deploy`, `reduce-bundle-size` and `upgrade-major-deps` are archived. New main specs: `app-hosting`, `frontend-performance`, `server-exposure`, `server-resilience`.

### Fixed
- **A CSV that fails to load no longer looks like an empty catalogue.** Health reports `error` and catalogue routes return `500` until a reload succeeds, retried on every request. Before, the Dashboard said you had no movies. (B42)
- A port already in use or an invalid `PORT` (`abc`, `5000abc`) prints one line and exits with code 1, instead of showing a stack trace or silently using port 5000. Shutdown waits for in-progress catalogue writes, up to 10 s. An `.env` that exists but can't be read is logged. (B43–B46)
- TMDB posters load in production: the Content-Security-Policy allows `image.tmdb.org` and Ant Design's inline styles.
- The flaky e2e test "director filter applies and shows a chip": the option list could scroll between reading an option and clicking it, so the test selected a different director than the one it checked for. (B48)

### Security
- **Local-only by default.** The API binds `127.0.0.1` (override with `HOST`) and the Vite dev server binds `localhost`, so nobody else on the same Wi-Fi can list or delete movies. (S10)
- `npm audit --audit-level=high` passes again (body-parser, follow-redirects, vite and zod advisories). (B1)

### Removed
- `framer-motion`: the hover lift on stat cards and grid cards is now a CSS transition.
- The unused CRA-era `public/index.html`.

## [0.9.2] - 2026-11-04

### Security
- **The TMDB API key no longer ends up in server logs.** Every TMDB failure (network reset, timeout, 429/5xx after retries, 401) used to log the whole axios error, which printed the key in plaintext about 6 times per entry. The TMDB client now throws a redacted `TmdbRequestError` (HTTP status, error code and request path only), and the server logs one-line messages instead of error objects. (B2)

### Fixed
- **A bad TMDB response can no longer crash the API.** Express 4 ignores errors thrown inside async route handlers, so a TMDB answer with an empty (`null`) body crashed the whole Node process. Every async route now passes errors to the generic `500` handler, and an empty body imports as a row of empty fields.
- **A CSV with a repeated column name can no longer lose data.** When a header names a column twice (e.g. two `Movie ID` columns after a BOM-prefixed file went through `movie-search.py`), the server only ever saw the later, empty column, and the next in-app delete wiped every row's ID for good. The server now refuses to add or delete until the header is fixed by hand, never rewrites the file in that state, and logs which column is duplicated. (Server half of B3; the Python `utf-8-sig` half is still open.)
- After a server restart, the browser can no longer get a "not modified" (`304`) answer for an out-of-date movie list: the `/api/movies` `ETag` now includes a per-process id. (B16)
- An in-app delete no longer overwrites rows that `movie-search.py` or `backfill_posters.py` write while the delete is in progress. The server checks the file again just before replacing it, and if it changed, redoes the delete on the new contents.
- On Windows, a delete no longer fails when antivirus, the search indexer or Excel briefly locks `src/movies.csv`: replacing the file retries `EPERM`/`EBUSY`/`EACCES` for about 750 ms.
- An add or delete whose write succeeded is no longer reported as a `500` when the file check after the write fails. Previously, retrying such an import returned `409`.
- `GET /api/movies/:id` and the Add Movie search now pick up rows another tool added to the file. Search no longer marks those movies as not yet imported, and it returns `503` while the catalogue is still loading.
- Searching by actor no longer lists a film twice when the actor has two roles in it, and results are ordered by popularity before the top-20 cut.

### Changed
- New OpenSpec main spec `server-resilience`, plus 6 new `catalog-persistence` requirements. The `harden-catalogue-server` change is archived (`openspec/changes/archive/2026-11-04-harden-catalogue-server/`).
- Server tests: 44 → 62, including a new `server/__tests__/hardening.test.ts`. `createApp()` takes an optional `fsHooks` test option (`rename`, `stat`) for simulating file-system failures.
- `BUG_BACKLOG.md` is now tracked: the open bug list (B1–B41) plus a per-module code-review/security-review tracker.

## [0.9.1] - 2026-10-28

### Fixed
- **Every chart now uses the shared muted palette.** The Dashboard trend/rating charts and every Stats tab still drew in the old bright hex colours (`#818cf8`, `#34d399`, …) next to the muted category charts. Single-series charts now use one palette colour each, profit/loss bars a semantic positive/negative pair, and line fills and the year × genre heatmap a translucent palette colour. `chartTheme.ts` gains `CHART_PRIMARY`, `CHART_POSITIVE`/`CHART_NEGATIVE` and `withAlpha()`; explicit hover colours are gone (Chart.js derives them).
- Explore's top-20 genre bar no longer repeats colours (bars 1/9/17 used to match). It is one colour now, and counts genres through the shared `groupByField`.
- The Dashboard genre breakdown shows the top 7 genres + "Other" via `topNWithOther`, matching the Stats tabs (it was a hand-rolled top 6).
- Mobile: doughnut legends no longer drop rows. Chart.js caps a bottom legend at half the chart height, so on phones every doughnut uses a compact legend, and the Dashboard genre card is taller (280px).
- Stat cards build their surface from the shared `getCardStyle()` instead of a hand-copied variant. The hero card keeps only its tinted background; its border is now the shared one.

### Changed
- Specs: the `design-system` spec scopes the palette rule to chart colours (stat-card accent colours are out of scope) and adds single-series and profit/loss scenarios. The shell scenario no longer asks for a corner radius on the full-width sidebar/top bar/bottom nav. The `dashboard-layout` spec gains scenarios for every Dashboard drill-down (rating bucket, year trend, recent release, Total Box Office, non-clickable "Other").
- `refine-app-ui` OpenSpec change archived (`openspec/changes/archive/2026-10-08-refine-app-ui/`) with a provenance note on its late-ticked QA tasks. Its specs are now the main `design-system` and `dashboard-layout` specs, and `docs/review-findings-2026-10-15.md` records the review (R1–R7, all resolved).

## [0.9.0] - 2026-10-08

### Fixed
- **CI green again.** `npm audit --audit-level=high` was failing (11 vulnerabilities: 3 critical, 5 high, 3 moderate) — resolved with in-range bumps (`axios`, `compression`, `express`/`body-parser`/`qs`/`proxy-addr`, `nanoid`, `brace-expansion`, `source-map-js`) plus `"overrides": { "shell-quote": "^1.12.0" }` (a plain `npm audit fix` had downgraded `concurrently` to 9.2.1, which pins the vulnerable `shell-quote@1.8.3`; `concurrently` is kept at `^9.2.4`). e2e tests also stopped matching the Movies search box after its placeholder copy changed in 0.7.0 — the input now has `aria-label="Search movies"` and tests select it by role.
- **Catalogue writes can no longer lose or duplicate rows.** Imports, deletes, and the list reload now run through one serialized op queue, so concurrent deletes or an import landing mid-delete can't clobber each other. Before each write the server re-reads `src/movies.csv` if its `mtime`/size changed, so rows/columns added by `movie-search.py` or `backfill_posters.py` while the server runs are no longer wiped by the next in-app delete. Duplicate imports (double-click, two tabs, or a row added externally while TMDB is fetched) are rejected with `409` and stored once.
- **Just-added/deleted movies show up immediately.** `GET /api/movies` was served with `Cache-Control: public, max-age=60`, so `refetch()` after Add/Delete could show a stale list for up to a minute — now `no-cache` + `ETag` (`304` when unchanged).
- Hand-edited / Excel-saved CSVs: a UTF-8 BOM no longer breaks every `Movie ID` lookup; importing into a file without a trailing newline no longer glues the new row onto the last one; imports refuse (rather than misalign) when the file has no readable header and wait (`503`) until the initial load finishes.
- Titles starting with `=`/`+`/`-`/`@` (e.g. "+1") no longer display with a stray `'` and no longer pick up extra escaping on every rewrite — values are still escaped on disk for spreadsheet safety, but un-escaped on read.
- **Chart drill-downs open exactly what the chart counted.** Every Stats drill-down now carries the page's Release Year Range (a decade/year click is intersected with it) via a new `useDrillDown()` hook (`src/contexts/DrilldownContext.tsx`). Bucketed charts (Dashboard rating, Ratings vote distribution, Runtime length) share one bucket definition between count and click, so a 4.0 rating is no longer in both "2–4" and "4–6" and a 90-min film no longer in both "60–90" and "90–120" (drill-down ranges are tightened to e.g. `[2, 3.999]` / `[90, 119]`; chips show those bounds; the "> 180 min" bucket ends at the dataset's real max runtime). "Other"/"Unknown" slices are no longer clickable and show no pointer cursor (new optional `isClickable` prop on the chart wrappers).
- Range filters exclude unknown values while active: revenue `≤ 0` (1,060 of the 1,961 rows in the real dataset have no recorded revenue and used to pass any range starting at $0) and vote `0` (unrated) — matching how a missing runtime was already handled.
- Stats: an unknown `?tab=` value now shows Overview instead of an empty tab bar, and arriving via a Dashboard link writes `?tab=` immediately so the URL is shareable/reloadable without switching tabs first.
- Money labels: the zero tick on box-office axes and a break-even profit read `$0` (was "N/A"); losses read `-$X`.
- Category charts (language, production company, country, genre polar) cap at 7 named slices + "Other", so the 8-colour palette no longer repeats within a chart; Overview's language chart dropped its leftover 15-colour palette.
- Dashboard "Movies Released" trend is now a continuous 10-year span ending at the latest release year (empty years show 0) — it used to show the last 10 years *that had data*, so the title's range could span gaps.
- **Add/delete no longer resets the Movies page.** A catalogue refresh used to swap the whole page for a loading skeleton, wiping the Add Movie modal's search results and the table's sort/page; refreshes now happen in the background (TopBar spinner; on failure a retry button and the last data stays). Table sort/pagination are kept across refreshes, and both views reset to page 1 only when the search/filters change.
- Export CSV writes rows in the order the table/grid currently shows them (was unsorted despite its tooltip), always includes every catalogue column (was the first row's keys only), and guards formula-like cells.
- Range sliders (filters drawer, Stats year range) apply on release instead of refiltering and re-saving on every drag tick. Restored filters are shape-checked (a corrupted saved value no longer crashes the Movies page) and clamped to the current data span. The theme survives blocked browser storage and, on a first visit, follows the OS light/dark preference.
- **Accessibility & polish.** Icon-only buttons (theme toggle, template download, chart PNG download) have accessible names, and the template download is one link-button instead of a button nested in a link; the Filters button announces "Filters, active" (the badge dot was colour-only); heading/tab emoji are hidden from screen readers. Table rows keep their table semantics — the movie name is now a real button (Enter/Space open the details) instead of overriding the row's role. Light-theme Top-10 ranks 6–10 are readable; "Highest Rated" needs ≥50 votes (no more 10/10-from-one-vote leaders); chart PNG exports have an opaque theme background (dark ones were unreadable); every release date shows as DD-MM-YYYY. Add Movie rejects non-4-digit years with inline feedback (the server silently ignored them) and falls back to the placeholder for broken posters. The mobile bottom nav no longer flashes on desktop at load; `/movies/` highlights its nav item; the error screen fits the content area, clears on navigation, and its "Try Again" reloads the catalogue first; the count badge shows 0 for an empty catalogue.
- Accurate error responses: unknown TMDB id → `404` (was `502`); CSV write failure on import → `500 "Failed to save movie"` (was reported as a TMDB failure); malformed JSON → `400` and oversized body → `413` (were `500`).
- Add Movie: out-of-order search responses can no longer overwrite newer results, and Enter can't fire a second search while one is running; each result row tracks its own import spinner. Movie drawer: delete URL-encodes the id, and deleting a movie that's already gone (e.g. removed in another tab) refreshes and closes instead of showing an error.
- **One CSV value format across all writers.** Missing values are now stored empty everywhere — `movie-search.py` used to write a literal `"N/A"` (79 in the existing dataset: 57 directors, 16 release years), which showed up in charts as a director/year called "N/A"; the server now reads a legacy `N/A` as empty. Production Country/Company are all names, comma-joined (README mapping table and `public/movies.template.csv` previously showed first-entry-only ISO codes like `US`), and the Stats country/company charts split them like Genres — a UK/US co-production now counts toward both countries instead of forming its own "United Kingdom, United States of America" slice.
- `backfill_posters.py` checkpoints and `movie-search.py`'s header migration now write to a temp file and `os.replace()` it into place — interrupting them can no longer truncate `src/movies.csv`.

### Added
- **Server API test suite** — `npm run test:server`: 44 tests on Node's built-in `node:test` (via `tsx --test`, no new framework) covering every route, helmet headers, rate limiting, TMDB retry/backoff, and each catalogue-safety guarantee above (incl. failed-write rollback and import-before-ready). Tests run against per-test temp CSVs with a stubbed TMDB client — they never touch `src/movies.csv` or the network. Runs in CI.
- CI now also type-checks the server (`npm run type-check:server`) — previously `npm run build` only checked `src/`, and `tsx` never type-checks.
- E2E: new "Drill-down consistency" suite (59 tests total) — Dashboard rating bar → list count, scoped Stats drill-down → year + vote chips and count, `?tab=bogus` fallback.
- `docs/audit-findings-2026-10-08.md` — full codebase audit, with the remaining findings queued as OpenSpec changes under `openspec/changes/`; main specs published under `openspec/specs/` (`catalog-persistence`, `catalog-data-format`, `analytics-drilldown`, `movie-browsing`, `accessible-ui`).

### Changed
- Server split for testability: `server/app.ts` exports `createApp({ csvPath, tmdbApiKey, tmdb?, … })` (all routes + catalogue state, no module-level globals), `server/tmdb.ts` holds the retrying axios TMDB client, and `server/server.ts` is now just the entry point (env, `createApp`, `listen`). No behaviour change; the CSV path is still resolved from `process.cwd()`.
- Playwright's `webServer` now waits on the proxied `/api/health`, so tests can't start before Express is up. The config also pins `colorScheme: 'dark'` (the first-visit theme now follows the OS), and heading assertions select by the emoji-free accessible name (`{ name: 'Movies', exact: true }`).
- Delete temp files are uniquely named (`movies.csv.<pid>.<ts>.tmp`); `.gitignore` covers `src/movies.csv*.tmp`.

## [0.8.0] - 2026-08-04

### Changed
- **Design system refinement.** `src/utils/chartTheme.ts`'s `getCardStyle` no longer hardcodes its own per-theme `rgba(...)` values — it now builds from the same CSS custom properties (`var(--glass-bg/border/shadow)`, `src/index.css`) every other glass surface (`StatCard`, `Sidebar`, `TopBar`, `BottomNav`) already used, closing a drift where Dashboard cards looked subtly different from the rest of the app. Token values themselves were also tuned for a calmer look: lower-contrast borders, softer shadows (both themes), and a toned-down hero stat card gradient/border on `StatCard`.
- `CHART_PALETTE` (`chartTheme.ts`) cut from 15 bright/saturated colors to 8 muted ones — every current chart consumer already caps at ≤8 categories via "top N + Other" grouping, so nothing lost distinguishability.
- New `SPACING`/`FONT_SIZE` constants in `chartTheme.ts`, applied wherever a component's existing raw spacing/font-size number already matched one of the new values exactly (`Sidebar`, `TopBar`, `DashboardSection`, `Dashboard.tsx` and its `HighlightCard`/`MiniChartCard`/`CtaCard`) — a light formalization of already-repeated values, not a new scale invented from scratch. `BottomNav.tsx` needed no changes; none of its raw numbers matched.
- Scope was deliberately the app shell + Dashboard only — `Movies.tsx`/`Stats.tsx` page-specific styling untouched. No routing, data-flow, or interactive/drill-down behavior changed.

## [0.7.0] - 2026-07-29

### Added
- **Add Movie year filter.** `AddMovieModal.tsx` gained an optional Year input alongside name/actor. Backend: `GET /api/tmdb/search` accepts `year` (validated `\d{4}`), passed as `primary_release_year` to TMDB's `/search/movie`, and applied as a `release_date` prefix filter when searching by actor credits — narrows results when a common title/actor returns too many hits.
- **Dashboard empty state.** `Dashboard.tsx` now renders an `Empty` (Ant Design, `PRESENTED_IMAGE_SIMPLE`) with a "Go to Movies" CTA instead of stat cards/charts full of zeros when the catalogue has 0 movies.
- **Movies search widened.** `SEARCHABLE_FIELDS` gained `Production Country` and `Release Year`; search also matches the human-readable language name via `getLanguageName` (not just the raw ISO code), so e.g. "french" or "2019" now matches.
- **Stats tab deep-linking via URL.** `Stats.tsx`'s active tab is now synced to a `?tab=` query param (`useSearchParams`, `replace: true`) in addition to the existing `location.state` hand-off from Dashboard/Movies drill-down clicks — the current tab survives a page reload or a shared/bookmarked link.
- **Year Range reset button.** `Stats.tsx`'s Release Year Range slider shows a small "Reset" button next to the current range/count once it's been narrowed from the full dataset span.
- `PosterThumb.tsx` — poster `<img>` (with fallback-on-error) extracted out of `Dashboard.tsx`'s two duplicated inline copies (Highlight cards, Recent Releases) into one shared component.

### Fixed
- `OverviewTab.tsx`'s count-up animation effect captured `intervalsRef.current` in a local variable at the top of the effect instead of re-reading the ref repeatedly inside callbacks/cleanup — avoids a stale-ref read if the ref's contents changed between the effect running and its cleanup firing.

### Changed
- `useMoviesContext`/`useTheme` hook exports now carry an explicit `eslint-disable-next-line react-refresh/only-export-components` (with a reason comment) instead of silently relying on lint config — both are intentionally co-located with their provider in the same file.
- Movies page toolbar restructured: search stays left-aligned, Filters/view-toggle/Export/Add Movie now grouped in a wrapping flex container on the right (`justifyContent: 'space-between'` on the row) instead of everything jammed into one `flex-end` group — holds up better at narrow widths.

## [0.6.0] - 2026-07-28

### Added
- **Add Movie from TMDB, in-app.** `src/components/AddMovieModal.tsx` (opened via a new "Add Movie" button in the Movies page toolbar) — search by movie name and/or actor, see poster/year/language per result, one-click import. Backend: `GET /api/tmdb/search` and `POST /api/tmdb/import` in `server/server.ts`, using the same `TMDB_API_KEY` env var as `movie-search.py` (loaded server-side via `process.loadEnvFile('.env')`; the key never reaches the client). Import fetches movie details + credits from TMDB, dedupes against the in-memory catalogue, appends a sanitized row (same formula-injection guard as `movie-search.py`) to `src/movies.csv`, and updates the running app immediately — no restart needed. `movie-search.py` is unchanged and still there for bulk/offline use.
- **Delete Movie.** `MovieDrawer` gained a `Delete` button (footer, `Popconfirm`-gated, "This can't be undone"). Backend: `DELETE /api/movies/:id` in `server/server.ts` — removes the row from the in-memory catalogue and regenerates `src/movies.csv` from what's left (`rewriteCsvFile()`, write-to-`.tmp`-then-rename so a crash mid-write can't truncate the file; in-memory removal rolls back if the write fails). `.gitignore` gained `src/movies.csv.tmp`.
- Stats page: a global Release Year Range slider (`src/pages/Stats.tsx`) scopes the movies passed to all 6 tabs at once, instead of each tab always analyzing the full dataset.
- Stats page: every chart card (`src/components/StatsTabs/ChartBlock.tsx`, deduplicated out of all 6 tab files) gained a PNG-download button — queries the card for a `<canvas>` and calls `toDataURL('image/png')`; hidden automatically on non-chart cards (e.g. the Explore tab's Top N Explorer) since none is found.
- Drill-down click-through, extended to most of the Stats page (previously only the Dashboard had this): `HorizontalBarChart` and `PolarAreaChart` gained an `onElementClick` prop matching the pattern already used by `BarChart`/`DoughnutChart`/`LineChart`. Wired up: Overview (language bar, year line), People (top directors), Ratings (vote-average bucket, avg-vote-by-year, avg-vote-by-genre), Runtime (genre polar, runtime-length bucket, avg-runtime-by-decade), Box Office (avg-revenue-by-genre), Explore (genre distribution) — each click navigates to `/movies` pre-filtered. Skipped for actor/production-company/country charts since `FilterState` has no matching field.
- New Stats charts: Box Office gained "Top 20 Most Profitable Films" (revenue − budget) and "Top 20 by ROI" (revenue / budget, floored at a $100K budget to keep tiny-budget outliers from dominating); Ratings gained "Average Vote by Year" (trend line) and a "Vote Count vs Vote Average" scatter plot (new `src/components/Charts/ScatterChart.tsx`, `ScatterController` registered in `src/main.tsx`) to surface few-vote rating outliers; Runtime gained "Avg Runtime by Decade"; People gained "Highest Rated Directors" and "Highest Rated Actors & Actresses" (both floored at 2+ films to avoid one-film outliers dominating).
- `MovieCardGrid` cover image height raised from `180` to `260` to show more of the poster.

### Changed
- `server/server.ts`'s TMDB calls now go through `axios` instead of the native `fetch` (undici) — on some Windows setups undici's TLS connection was getting reset mid-handshake by AV/proxy HTTPS inspection, consistently, not just transiently; axios uses Node's classic `http`/`https` core adapter instead, which isn't affected. Also added a retry-with-backoff (3 attempts, 500ms/1000ms, retrying network errors and `429`/`5xx`) mirroring `movie-search.py`'s `Retry(total=3, backoff_factor=2, status_forcelist=[429,500,502,503,504])` — the Node port had dropped that resilience.

## [0.5.0] - 2026-07-27

### Added
- `MovieCardGrid` gains its own sort dropdown (Name A–Z/Z–A, Year Newest/Oldest, Rating High–Low/Low–High, Runtime Long–Short/Short–Long) — previously only `MovieTable`'s column sorters could reorder results, so switching to Grid view silently dropped sort capability.

- Poster images throughout the app: `MovieCardGrid` cards, `MovieDrawer`, Dashboard Highlight cards, and Dashboard Recent Releases list. CSV gains an optional `Poster URL` column (`src/types/movie.ts`, `public/movies.template.csv`); `src/utils/poster.ts` exports `POSTER_FALLBACK`, a placeholder shown when a movie has no poster or the image fails to load. `movie-search.py` now writes `Poster URL` on new appends and migrates an existing CSV that predates the column (adds the header, backfills blank).
- `backfill_posters.py` — one-off script to fill `Poster URL` for rows already in `src/movies.csv` that predate the column. Looks each row up on TMDB by `Movie ID`, checkpoints every 100 rows, and reports a specific skip reason per row (`not_found_on_tmdb (404)`, `no_poster_on_tmdb`, `request_timeout`, `request_error (...)`, `missing_movie_id`).
- Dashboard: hero-styled "Total Movies" stat card and icons on all Overview stat cards (`StatCard` gained `hero`/`icon` props).
- `LoadingError.tsx` renders a skeleton placeholder layout (Ant `Skeleton`) instead of a bare spinner while movies are loading.
- `MovieCardGrid` gains a 6-cards-per-row layout at the `xl` (≥1200px) breakpoint, with denser card padding/fonts/poster height — previously capped at 4/row on all wide screens.
- `BottomNav`'s active link now sets `aria-current="page"`; Dashboard's Recent Releases list items gained `role="button"`, `tabIndex`, `onKeyDown` (Enter/Space), and `aria-label`, matching the keyboard-accessibility pattern already used by `MovieCardGrid`/`MovieTable`.
- Dashboard drill-down interactivity: Highlight cards (Top Rated/Most Popular/Newest) are now clickable/keyboard-activatable, opening that movie's `MovieDrawer` (`StatCard` and `HighlightCard` gained an `onClick` handler with matching `role`/`tabIndex`/`onKeyDown`). The Total Box Office stat card navigates to the Stats page's Box Office tab. The three "Trends & Breakdown" mini-charts (year trend line, genre doughnut, rating bar) gained an `onElementClick` handler (`src/components/Charts/{LineChart,DoughnutChart,BarChart}.tsx`, wired via Chart.js's native `onClick`/`onHover` options) — clicking a point/slice/bar navigates to `/movies` pre-filtered to that year, genre, or vote range via `react-router`'s `navigate(path, { state })`, consumed once on mount by a new effect in `Movies.tsx` and then cleared from history state. `Stats.tsx`'s `Tabs` is now controlled (`activeKey`) so it can be deep-linked to a specific tab the same way.
- "Movies Released — Last 10 Years" Dashboard chart title is now computed from the actual year span shown (e.g. "Movies Released — 2016–2026") instead of a hardcoded "Last 10 Years" that could be inaccurate for smaller datasets.
- 2 new Playwright tests (53 → 55) covering highlight-card click-to-drawer and Total Box Office click-to-tab; the three chart-drill-down click handlers are exercised only via `tsc` type-checking, not e2e — canvas pixel-coordinate clicks are too fragile for reliable Chart.js element-hit testing in Playwright.
- 1 new Playwright test (55 → 56) for the grid sort control (A–Z vs Z–A produces a different first card).

### Changed
- `FiltersDrawer.tsx` footer dropped its own "Clear all" button (duplicated `ActiveFilters.tsx`'s page-level "Clear all" chip-row button, doing the identical `onChange(DEFAULT_FILTERS)` reset) — footer is now just "Done".
- Movies page search input's `maxWidth` raised from `260` to `360` (`flex-basis` `200`→`240`) — the toolbar is now right-aligned (`justifyContent: 'flex-end'`) with room to spare, and 260px read as unnecessarily cramped.
- Filter persistence (`usePersistedFilters.ts`) moved from `localStorage` to `sessionStorage` — filters now survive in-app navigation within a tab/session but reset on a new tab or browser restart, instead of surviving indefinitely (including across server restarts, which was the reported surprise).
- Chart.js registration (`src/main.tsx`) now imports only the specific controllers/elements/scales/plugins actually used by `src/components/Charts/*`, instead of `registerables` (the entire library) — smaller `vendor-charts` bundle.
- Every `src/components/Charts/*` wrapper memoizes its `options` object via `useMemo`, so an unrelated parent re-render no longer forces the chart to rebuild and re-diff its full options tree on every render.
- CI dependency-audit gate (`.github/workflows/ci.yml`) tightened from `npm audit --audit-level=critical` to `--audit-level=high` — this surfaced 3 advisories the `critical` gate had been masking, all now resolved: `tsx` bumped to `4.23.1` (pulls a patched `esbuild`, fixing a Windows dev-server path-traversal advisory), and `react-router-dom` (frozen at `7.18.1`, itself just `export * from "react-router"`) replaced with `react-router@^8.3.0` directly, fixing a CSRF advisory in react-router's unstable RSC mode (unused by this app, but no non-breaking fix existed on v7). `npm audit` is clean (0 vulnerabilities) as of this release.
- **Node.js floor raised from 20+ to 22.22+** — required by `react-router@8`. `.github/workflows/ci.yml` and `package.json#engines` updated to match.
- All 5 `react-router-dom` imports (`App.tsx`, `BottomNav.tsx`, `ScrollToTop.tsx`, `Sidebar.tsx`, `Dashboard.tsx`) and the `vite.config.ts` `manualChunks` vendor-react entry now reference `react-router` — same APIs (`BrowserRouter`, `Routes`, `Route`, `Link`, `useLocation`, `useNavigate`), no other code changes needed.
- `chartjs-chart-treemap` dependency removed — unused in `src/` (never imported), was still listed in `package.json` and `vite.config.ts`'s `vendor-charts` chunk.
- `MatrixChart.tsx` — `chartData` (not just `options`) now memoized via `useMemo`, closing the gap from the earlier chart-memoization pass.
- `Sidebar.tsx`'s nav `Link`s now set `aria-current="page"` for the active route, matching `BottomNav`.
- `movie-search.py` sanitizes CSV field values starting with `=`, `+`, `-`, or `@` (prefixes a `'`) to prevent formula injection if the CSV is later opened in Excel/Sheets.
- 6 new Playwright tests (47 → 53) across 2 new suites — **Movies Grid View** (poster image renders, card keyboard-activatable, grid page-size changer) and **Movies Advanced Filters** (director filter chip, runtime/revenue range sliders) — closing coverage gaps left by this release's UI additions.

### Fixed
- `server/server.ts` resolved the CSV path via `__dirname`, which pointed at the wrong directory once compiled (`server/dist/server/`) — the compiled production server silently served an empty dataset. Now resolved via `process.cwd()`, correct under both `tsx watch` (dev) and the compiled build.
- `movie-search.py` was appending to `movies.csv` in the process's working directory instead of `src/movies.csv`, silently diverging from the file the server actually reads. TMDB API key is now always passed via `requests`' `params=` (previously string-interpolated into the URL for 3 of the 5 endpoints); network-error dialogs no longer echo the raw exception back to the user, which could have surfaced the request URL (and key) on-screen.
- `MovieCardGrid` cover image was missing `width: 100%`, so posters could render at their natural width and break card alignment.
- `MovieDrawer` now always renders the poster block (with fallback) instead of omitting it entirely when `Poster URL` is blank, and sets a fixed image `height` to stop layout shift while it loads.

## [0.4.0] - 2026-07-25

### Added
- Mobile bottom navigation (`src/components/BottomNav.tsx`) — replaces `Sidebar` below the `sm` breakpoint (Ant Design `Grid.useBreakpoint()`); Dashboard/Movies/Stats links with active-route highlighting, safe-area padding for notched devices.
- `src/components/LoadingError.tsx` — shared loading spinner / error alert wrapper, factored out of `Dashboard.tsx`, `Movies.tsx`, `Stats.tsx` (each previously duplicated the same loading/error branch).
- `src/utils/formatDate.ts` (`formatDateDDMMYYYY`) — release dates now render as `DD-MM-YYYY` in `MovieTable` and `MovieDrawer`.
- Backend hardening: `helmet()` for security headers, `express-rate-limit` on `/api` (300 req/min), CORS restricted to `CLIENT_ORIGIN` env var (defaults to `http://localhost:3000`) instead of open `cors()`, `Movie ID` param validated (max length) before lookup, and a catch-all error-handling middleware so unhandled route errors return a `500` JSON body instead of leaking a stack trace.
- CI: `npm audit --audit-level=critical` step runs before lint/build/e2e.
- Keyboard accessibility on `MovieTable` rows and `MovieCardGrid` cards — `role="button"`, `tabIndex`, `aria-label`, and Enter/Space activation alongside click.
- `MovieTable` gained sorters on ID, Genres, Actors, Production Company; `Genres`/`Actors`/`Production Company`/`Country` columns hide progressively on narrower viewports (`responsive: ['md'|'lg']`).

### Changed
- `TopBar` no longer renders a per-page title — `Dashboard`, `Movies`, and `Stats` each render their own page heading inline instead, matching the mobile bottom-nav pattern of not relying on the header for page identity.
- Sidebar is now conditionally rendered (`screens.sm`) instead of always-mounted-but-collapsed; its logo links back to `/`.
- `Movies.tsx` defaults to grid view on first load under the `sm` breakpoint (table view remains default on larger screens).
- `MovieDrawer` and `FiltersDrawer` go full-width (`100%`) below the `sm` breakpoint instead of a fixed `480`/`400`px width.
- `MovieCardGrid` pagination switches to Ant's `simple` mode and drops the size-changer/total-count text below `sm`.
- `eslint.config.mjs` ignores `.claude/**`.

## [0.3.0] - 2026-07-25

### Added
- `src/pages/Movies.tsx` (`/movies`) — the filterable catalogue split out of `Dashboard`, with a table/grid view toggle (`Segmented`). `src/components/MovieCardGrid.tsx` is the new card-grid view, alongside the existing `MovieTable`.
- Director multi-select filter, runtime range slider, and box-office revenue range slider, plus removable chips summarizing every active filter. `FilterState` (`src/types/movie.ts`) gained `directors`, `runtimeRange`, `revenueRange`.
- Sidebar gained a "Movies" nav entry; sidebar is now sticky-positioned.
- `src/components/DashboardSection.tsx` — shared title + content wrapper standardizing spacing across all Dashboard sections.
- Dashboard gained a "Trends & Breakdown" section: 10-year release trend (line), top-6 genre breakdown (doughnut), rating distribution (bar), and a clickable Recent Releases list — all compact previews, with a "Full analytics" link to `/stats`.
- `src/components/FiltersDrawer.tsx` — category (language/genre/director) and range (year/vote/runtime/revenue) filters moved into a right-side drawer opened via a "Filters" button (dot badge when active), replacing the inline collapsible filter card. `src/components/ActiveFilters.tsx` renders removable chips + "Clear all" directly on the page; search stays an always-visible toolbar input. Shared chip/active-state logic factored into `src/utils/filterChips.ts`.
- 7 new Playwright tests (40 → 47) covering the Movies page split, table/grid toggle, drawer-from-card, and the Filters drawer open/close flow.

### Changed
- `Dashboard.tsx` (`/`) is now a landing summary — stat cards, highlights, trend/breakdown charts, and CTA cards to Movies/Stats — instead of hosting the movie table directly.
- Express API routes moved under `/api` (`/api/health`, `/api/movies`, `/api/movies/:id`) so Vite's dev proxy can't collide with the client-side `/movies` route. `vite.config.ts` proxy and `MoviesContext`'s fetch updated to match.
- `vite.config.ts` dev server now binds with `host: true` (LAN-accessible during dev).

## [0.2.1] - 2026-07-16

### Fixed
- Mobile/narrow-viewport layout — `Sidebar` now auto-collapses to icon rail below 768px via Ant Design's `Grid.useBreakpoint()`, instead of staying expanded and squeezing the table unusably narrow. Manual collapse toggle still works within a breakpoint. Implemented as a render-phase state sync (not a `useEffect`) to satisfy `eslint-plugin-react-hooks`'s `react-hooks/set-state-in-effect` rule. (`src/App.tsx`)

## [0.2.0] - 2026-07-16

### Added
- `LICENSE` — MIT.
- `.github/workflows/ci.yml` — GitHub Actions CI: lint, build, and Playwright e2e (seeded from `public/movies.template.csv`) on push/PR to `main`.
- `docs/screenshots/` — dashboard, stats overview, movie drawer, and mobile screenshots, embedded in `README.md`.
- `engines.node` (`>=20`) in `package.json`.
- README overhaul: real CI/license badges, Highlights section, screenshots, no-hosted-demo note, `src/` vs `public/` rationale for `movies.csv`, TMDB attribution note, corrected `movie-search.py` duplicate-handling docs (skips, doesn't update), grouped Scripts table, architecture diagram, documented API error responses (`404`/`503`), Performance/Deployment/Contributing/Roadmap sections.

### Fixed
- `src/components/Charts/MatrixChart.tsx` — replaced three `as any` casts (flagged by the new CI lint step) with `as unknown as <ConcreteType>` per the pattern in `CLAUDE.md`, since `chartjs-chart-matrix`'s `'matrix'` type isn't in Chart.js's base type registry.

## [0.1.2] - 2026-07-15

### Added
- `movie-search.py` — Tkinter GUI to search TMDB by movie/actor name and language, then append picked results straight to `src/movies.csv`. Handles pagination, retries, and duplicate detection.
- `requirements.txt` — `requests`, `python-dotenv` for the search script.
- `.env.example` — placeholder for `TMDB_API_KEY`.

### Security
- `movie-search.py` reads `TMDB_API_KEY` from a local `.env` (via `python-dotenv`) instead of a hardcoded key; script now exits with a clear error if the var isn't set. `.env` was already covered by `.gitignore`.

## [0.1.1] - 2026-07-14

### Fixed
- Overview stat cards (Total Movies, Average/Longest/Shortest Runtime, Total Time Spent, Hours/Days/Years Watched) could get stuck at `0` and never animate. React 18 StrictMode's dev-only mount → cleanup → remount cycle cleared the count-up `setInterval`s and left a stale "already animated" ref, so the remount saw no change and never restarted the animation. Cleanup now resets that ref, so remounts re-arm correctly. (`src/components/StatsTabs/OverviewTab.tsx`)

### Added
- `CLAUDE.md` — repo guidance for Claude Code sessions (stack, commands, architecture, gotchas).
- `CHANGELOG.md` (this file).
- `features.txt` — plain-text feature list.
- `Thumbs.db` / `desktop.ini` added to `.gitignore`.

## [0.1.0] - 2026-07-03

Initial tracked baseline: React 19 + TypeScript + Vite dashboard with filterable movie table, detail drawer, CSV export, 6-tab statistics page (Overview, People, Ratings, Runtime & Geography, Box Office, Explore), light/dark theme, Express/CSV backend, ESLint, and 40 Playwright E2E tests.
