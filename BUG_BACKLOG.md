# Bug Backlog

Last full sweep: **2026-10-28** (v0.9.1, working tree on `main`). Last updated **2026-11-07**, v0.11.0 (Batch A review: B51–B60 added and fixed, §3c, §6 batch column; Batch B review: B61–B67 added and fixed with B3/B8/B9, §3d; Batch C review: B68–B78 added, all but B75 fixed, §3e; §6 Fix column + batch status). Updated **2026-11-14**, v0.11.1: Batch B re-review B79–B86 and follow-up B87–B93 added and fixed, §3f. Updated **2026-11-20**, v0.11.2 (all 75 §6 modules reviewed; fixes proposed, none applied yet): Batch D review (app shell) B94–B101 added, §3g, owned by `fix-app-shell-review`; Batch E review (contexts + hooks) B102–B107 added, §3h, owned by `fix-contexts-hooks-review`; Batch F review (Dashboard) B108–B116 added, §3i, owned by `fix-dashboard-review`; Batch G review (Movies page + filtering) B117–B123 added, §3j, owned by `fix-movies-filtering-review`; Batch H review (Movies views + mutations + export) B124–B130 added, §3k, owned by `fix-movies-views-review`; Batch I1 review (Stats page) B131–B135 added, §3l, owned by `fix-stats-review`; Batch I2 review (Stats tabs) B136–B138 added, §3m, owned by `fix-stats-tabs-review`; Batch J review (chart wrappers) B139–B142 added, §3n, owned by `fix-chart-wrappers-review`; Batch K review (utils + types) B143–B151 added, §3o, mostly owned by `fix-utils-types-review` (B146/B147 open); Batch L review (server tests) B152–B161 added, §3p, owned by `fix-server-tests-review`; Batch M review (e2e spec + helpers) B162–B171 added, §3q, owned by `fix-e2e-review`. Updated **2026-11-21**, v0.11.3: `fix-utils-types-review` applied and archived; B143–B145 and B148–B151 fixed, B15 partly fixed (new `npm run test:unit`), §6 rows 53, 56–61, 75 and Batch K Fix ☑. Updated **2026-11-21**, v0.11.4: `fix-contexts-hooks-review` applied and archived; B102–B107 (and B22, same as B102) fixed, §6 rows 17–22 and Batch E Fix ☑. Updated **2026-11-21**, v0.11.5: `fix-app-shell-review` (B94–B101, B27) and `fix-chart-wrappers-review` (B139–B142, B13 at wrapper level, B26) applied and archived; §6 rows 9–16, 44–51 and Batches D and J Fix ☑ (the Batch D row's extra cell repaired). v0.11.8 (2026-11-21): `fix-movies-filtering-review` (B117–B123, B5, B20 trim part) applied and archived; §3j fixed; §6 rows 24, 30–32, 54, 55, 74 and Batch G Fix ☑; §6 tidied (legend, Batch F/G cells, stale §0/§5 rows, Batch N rows 76–80). v0.11.7 (2026-11-21): `/code-review` + `/simplify` of the staged 0.11.3–0.11.6 changes; B172–B176 added and fixed, §3r. v0.11.6 (2026-11-21): `fix-movies-views-review` (B124–B130, B14, B17, B19, B21, B31, B37; B24/B30 drawer and grid parts) applied and archived; §6 rows 26–29, 52 and Batch H Fix ☑. Same day as v0.11.2: older open items that the Batch D–H entries duplicate were cross-referenced both ways (◐ prefix = owned by an in-flight change). Read-only sweep: four parallel reviewers (server/scripts/CI, Movies page, analytics, shell/tests), then a merge pass. Earlier records: `docs/audit-findings-2026-10-08.md` (S/F/C/T IDs) and `docs/review-findings-2026-10-15.md` (R1–R7, all resolved). Updated **2026-11-22**, v0.11.9: `fix-dashboard-review` applied and archived; B108–B116 fixed (B109's error is an inline `Alert`, not antd `message`, to keep the landing bundle flat), B7 and B30 closed, Dashboard parts of B13/B24 done, B10 still open; §6 rows 23, 33–35 and Batch F Fix ☑; new row 81 (`ChunkErrorBoundary.tsx`, unreviewed). Same day: `fix-stats-review` applied and archived; B131–B135 fixed, B4, B24, B25, B34 closed, OverviewTab/ExploreTab part of B13 done; §6 rows 25, 36–38, 43 and Batch I1 Fix ☑. Same day: `fix-stats-tabs-review` applied and archived; B136–B138 fixed, B6 and B18 closed, the last (People/Ratings/Runtime/BoxOffice) caller part of B13 done; §6 rows 39–42 and Batch I2 Fix ☑. Same day: `fix-server-tests-review` applied and archived; B152–B161 fixed (tests only, plus an `fsHooks.appendFile` seam); §6 rows 62–66, 68, 70, 71 and Batch L Fix ☑. 2026-11-23 (v0.11.10): `fix-e2e-review` archived; B162–B171 fixed (tests only, plus `src/utils/chartBuckets.ts`); §6 rows 67, 73 and Batch M Fix ☑. 2026-11-23 (v0.11.12): `/code-review` (high) of the staged 0.11.8–0.11.11 diff logged B187–B193 (§3u); B187–B190 and B193 fixed, B191 accepted, B192 open. This file lists only **open** items. Line numbers are pointers, so re-check them before editing.

Severity: **High** = broken today / data loss / security / CI red · **Med** = wrong behavior users will hit · **Low** = polish, a11y, edge cases.
Confidence: **H** = traced through the code and/or reproduced · **M** = needs a specific data shape or environment.

---

## 0. Automated checks (2026-11-21, v0.11.8; rows marked 0.10.0 were not re-run)

| Check | Result |
|---|---|
| `npm run lint` | ✅ clean |
| `npm run build` | ✅ passes, no chunk-size warning (Vite 8; it warns that `vite.config.ts` is ESM loaded as CommonJS, for the future native config loader) |
| `npm run check:bundle` | ✅ 363.32 kB gzip landing (budget 400; measured 0.11.8) |
| `npm run type-check` / `type-check:server` / `build:server` | ✅ clean (TypeScript 6.0.3) |
| `npm run test:server` | ✅ 112/112 |
| `npm run test:unit` | ✅ 29/29 (new in 0.11.3; `fix-movies-filtering-review` adds `filterSpans.test.ts`) |
| `python -m unittest discover -s tests/python` | ✅ 38/38 |
| `npm run test:e2e` | ✅ 100/100 (`CI=1`, real CSV, with `fix-movies-filtering-review`; no retries needed) |
| `npm audit --audit-level=high` | ✅ passes (10 moderate: `minimatch` under typescript-eslint) (0.10.0) |

---

## 1. High

- ✅ *Fixed 2026-11-04 by `upgrade-major-deps` Phase 1 (in-range `npm audit fix`; vite later moved to 8).* **B1 — CI audit gate red again.** New advisories since 0.9.0:
  - `body-parser <1.20.9` (high)
  - `follow-redirects 1.16.0` via axios (high, credential-header leaks on redirect)
  - `vite <=6.4.3` (high)
  - `qs` (moderate)

  `npm audit fix` reports fixes are available. *Fix:* in-range bumps, as 0.9.0 did (check `concurrently` doesn't get downgraded again). The vite advisory may be fixable only via `upgrade-major-deps` Phase 3. If so, record that and pin. *(H)*

- ✅ *Fixed 2026-11-04 by `harden-catalogue-server`.* **B2 — TMDB API key written to server logs on every TMDB failure.** `server/app.ts:367` (search) and `:407` (import) pass the whole AxiosError to `logger.error`. `server/tmdb.ts:37` puts `api_key` in `params`, so the key appears in `config.params`, `request._header` and `responseUrl` (~7 copies per entry). Any TMDB outage or 5xx prints the key to the console or logs. This breaks the project's key-hygiene rule (the Python tools show generic messages for the same reason). *Fix:* log a redacted summary (`err.code`, `err.response?.status`, path without query), or use a `redactAxiosError()` helper. Add a server test asserting the stub logger never sees the key. *(H, reproduced)*

- ✅ *Server half fixed 2026-11-04 by `harden-catalogue-server` (duplicate header → mutations refused, file never rewritten); Python `utf-8-sig` half fixed 2026-11-07 by `fix-python-csv-writers` (`catalogue_io.read_catalogue`).* **B3 — BOM-prefixed CSV + `movie-search.py` → duplicate `Movie ID` column → the next in-app delete erases every old row's ID.**
  - `movie-search.py:109,140` and `backfill_posters.py:70` read with `encoding="utf-8"`, not `utf-8-sig`. After an Excel "CSV UTF-8" save, the first header is `\uFEFFMovie ID`.
  - `is_duplicate()` never matches.
  - The header migration then appends a second `Movie ID` column.
  - The server strips the BOM, sees two `Movie ID` headers, and csv-parser keeps the last (empty) one for old rows. Get, delete and dedupe all break.
  - The next delete runs `rewriteCsvFile`, which writes `''` into both columns, so the IDs are permanently lost.
  - `backfill_posters.py` skips every row as `missing_movie_id`.

  *Fix:* use `utf-8-sig` at all Python read sites. The server should refuse to load or write a header with duplicate column names. *(H, reproduced)*

- ✅ *Fixed 2026-11-22 by `fix-stats-review` (continuous, ascending per-year chart; undated movies left off).* **B4 — Stats "Movies Released per Year" axis misordered, with an "Unknown" point.** `OverviewTab.tsx:121-122`. `groupByField(…, 'Release Year')` buckets blank years as `'Unknown'`, and the comparator `parseInt(a) - parseInt(b)` returns `NaN` for it. V8's sort then misorders the axis, e.g. `1999 2001 Unknown 1985 2005 2010`. It triggers on the real CSV (16 blank years). *Fix:* drop non-numeric keys before sorting (as Dashboard/RatingsTab do), and zero-fill gap years like the Dashboard trend. *(H, reproduced)*

---

## 2. Medium

### Data quality / "unknown" values
- ✅ *Fixed 2026-11-21 by `fix-movies-filtering-review` (as B119).* **B5 — Runtime `0` treated as a real runtime.** TMDB writes `0` for unknown runtimes, and the real CSV has 92 such rows.
  - `Movies.tsx:135-140` excludes only `NaN`, and `filterSpans.ts:21-22` counts `0` in the slider span. So `[0, 90]` and the Runtime tab's "< 60 min" drill-down (`[0, 59]`) list unknown-runtime films.
  - `RuntimeTab.tsx:45-47` ("Avg Vote by Runtime Length") also files runtime 0 under "< 60 min".
  - Dashboard, Overview and the other runtime stats already use `r > 0`.
  - The 0.9.0 "range filters exclude unknown values" fix is therefore incomplete for runtime. *Fix:* `r > 0` everywhere, via a shared `parseRuntime()`. *(H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-tabs-review` (shared `parseVote()`; `MIN_FILMS` counts rated films only).* **B6 — Rating averages include unrated (vote 0) movies.** `RatingsTab.tsx:39,64,89` (genre / language radar / year), `PeopleTab.tsx:37,57` (director / actor) and `RuntimeTab.tsx:47` filter only `!isNaN(v)`. Unrated 0.0 values drag averages down and count toward `MIN_FILMS`: a director with one 8.0 film and one unrated film shows 4.0 and qualifies for "2+ films". This violates "vote 0 = unrated, charts skip them". *Fix:* `v > 0`, via a shared `parseVote()`. *(H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review` (logged again as B108; shared `ratingPool()`).* **B7 — Dashboard "Top Rated" highlight has no vote-count floor.** `Dashboard.tsx:144-145`: a 10.0 from one vote wins. `TopNExplorer` already uses `MIN_VOTES_FOR_RATING` (50, with a fallback when <10 qualify). *Fix:* export that rule from one place and reuse it. *(H)*

### Python tools (`movie-search.py`)
- ✅ *Fixed 2026-11-07 by `fix-python-csv-writers`.* **B8 — A failed TMDB fetch still saves an incomplete row, and retry is then blocked.** `movie-search.py:77-105,215-247`. On a network error the fetchers show a dialog and return `{}`/`[]`, but the save continues with empty Genres/Director/Cast/Revenue/Budget/Votes/Poster. `is_duplicate` then refuses a re-add, so the CSV has to be hand-edited. (The server import correctly returns 502 and writes nothing.) *Fix:* fetchers return `None` on failure; skip the append if any fetch failed. *(H)*
- ✅ *Fixed 2026-11-07 by `fix-python-csv-writers`.* **B9 — Append glues the new row onto the last row when the file lacks a trailing newline.** `movie-search.py:156-163`. This is the bug the server fixed as S7, still present in the other writer. *Fix:* check the last byte and write a newline first. Share a helper with B3. *(H)*

### App shell / recovery
- **B10 — A failed lazy-chunk load can't be recovered without a full reload.** `App.tsx:13-14`, `ErrorBoundary.tsx`. `React.lazy` caches the rejected import, so "Try Again" and navigating away and back both re-show "Failed to fetch dynamically imported module". Trigger: restart Vite or deploy new hashed chunks, then open Movies/Stats. *Fix:* reload the page on chunk-load errors, or wrap `lazy` in a retrying loader. *(H)* *(The Dashboard drawer's instance of this, B109, was fixed 2026-11-22 by `fix-dashboard-review` with a local `ChunkErrorBoundary` and a re-created `React.lazy`; the route chunks here are still open.)*
- **B11 — ErrorBoundary "Try Again" re-renders before the catalogue reloads.** `ErrorBoundary.tsx` `handleReset`. The accessible-ui spec says retry SHALL reload the catalogue *before* re-rendering. Instead, `onReset()` only schedules `refetch()` and `hasError` clears immediately, so a crash caused by the data recurs, and the user must click again after the fresh data arrives. *Fix:* add a "retrying" state cleared when the refetch settles (have `refetch` return a promise). *(H)*
- **B12 — The Sidebar collapse trigger isn't keyboard-operable.** `Sidebar.tsx:43-46`. Ant's `Sider` trigger is a bare `<div onClick>` with no role, tabIndex or name. Between 576 and 768px the sidebar auto-collapses, and keyboard/SR users can't expand it. *Fix:* `trigger={null}` plus a real `<Button aria-label="Expand sidebar"/"Collapse sidebar">`. *(H)*

### Performance
- ✅ *Fixed 2026-11-21 in the chart wrappers by `fix-chart-wrappers-review` (`useLatest` ref; covers every caller, incl. B113). The caller `useCallback` tasks below are now optional cleanups: Dashboard part done 2026-11-22 by `fix-dashboard-review` (B113, `useCallback`); OverviewTab and ExploreTab call sites done 2026-11-22 by `fix-stats-review`; People/Ratings/Runtime/BoxOffice call sites done 2026-11-22 by `fix-stats-tabs-review`. Wrapper-level ref fix (covers every caller, makes those `useCallback` tasks optional) owned by `fix-chart-wrappers-review`. If the wrapper-level ref fix below is chosen instead, B113 becomes part of it.* **B13 — Chart options memoization defeated by inline callbacks.** The wrappers list `onElementClick`/`isClickable` as `useMemo` deps, but callers pass fresh functions every render (`Dashboard.tsx:204-221,311`, `OverviewTab.tsx:137-147,207,210`, every tab's `handleXClick`, every inline `isClickable`). Each parent render then rebuilds the options, and react-chartjs-2 5.3 calls `chart.update()`. Examples:
  - OverviewTab's count-up animation re-renders every ~10–20 ms for ~1 s, so both Overview charts update ~100× and stutter.
  - Opening the MovieDrawer on the Dashboard updates every chart.

  This contradicts CLAUDE.md's memoization claim. *Fix:* the wrappers keep the callbacks in a ref and drop them from the deps (one change for all charts), rather than adding `useCallback` at every site. *(H)*

### Export
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B14 — Export CSV has no UTF-8 BOM, so Excel garbles non-ASCII text.** `exportCsv.ts:38-39`. Excel on Windows opens a BOM-less CSV in the ANSI codepage, so "Amélie" etc. come out garbled (150 of 1,961 real rows). *Fix:* prepend `String.fromCharCode(0xFEFF)`, built that way per the CLAUDE.md BOM gotcha. The server loader already strips it on re-import. *(H)*

### Tests
- ◐ *Partly fixed 2026-11-21 by `fix-utils-types-review` (added `npm run test:unit` and covers `formatRevenue`, `withAlpha`, `groupByField`, `topNWithOther`, `bucketToRange`/`countIntoBuckets`, `formatDate`, `getLanguageName`; the rest can use the same runner).* **B15 — No frontend unit tests.** The pure logic the specs depend on is reachable only through e2e, and mostly untested there:
  - `bucketToRange` / `countIntoBuckets`
  - `sanitizeFilters` / `clampFiltersToSpans`
  - `groupByField` / `MULTI_VALUED_FIELDS`
  - `topNWithOther`
  - `formatRevenue`
  - the `exportCsv` formula guard
  - `withAlpha`

  *Fix:* `tsx --test` specs for `src/utils/*` and `src/hooks/usePersistedFilters.ts`, matching the server's `node:test` setup. *(H)*

---

## 3. Low

### Correctness / edge cases
- ✅ *Fixed 2026-11-04 by `harden-catalogue-server`.* **B16 — `/api/movies` ETag can repeat across server restarts.** `server/app.ts:125,263-268`. `W/"v${catalogueVersion}"` restarts at 0 in each process, so a browser holding `v3` from an old process gets a `304` (stale list) once the new process reaches v3 with different data. This brings back S1 by another route. *Fix:* include a per-process boot id or the file fingerprint in the ETag. *(H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review` (every site, by normalising missing fields in `MoviesContext`, with B129).* **B17 — Unguarded `.split` can crash a whole Stats tab.** `PeopleTab.tsx:24,75` and `ExploreTab.tsx:35,60` call `m['Actors/Actresses'].split` / `m.Genres.split` directly. csv-parser omits keys on short rows, and import drops fields that have no column. The resulting TypeError goes to the ErrorBoundary. *Fix:* `(m[field] ?? '').split`, or route all counting through `groupByField` (add `Actors/Actresses` to `MULTI_VALUED_FIELDS`). *(M)*
- ✅ *Fixed 2026-11-22 by `fix-stats-tabs-review` (top 8 from languages with rated films).* **B18 — Language radar can plot a fake 0.0 "Unknown" spoke.** `RatingsTab.tsx:71-73`: `top8` includes `'Unknown'` but `sums` keys only truthy languages. *Fix:* filter with `isDrillableLabel`. *(H, needs rows with empty Language)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B19 — Delete still in flight acts on a different movie's drawer.** `MovieDrawer.tsx:31-60`. `deleting` isn't reset when the movie changes. Repro: confirm Delete on A, close the drawer, open B → B shows a spinner, then A's completion closes B's drawer (or shows A's error in it). *Fix:* capture the id at call time and act only if it still matches; reset `deleting` in the `lastMovieId` render-phase block. *(H)*
- ◐ *Trim part fixed 2026-11-21 by `fix-movies-filtering-review` (as B120); accent folding still open.* **B20 — Search isn't trimmed or accent-folded.** `Movies.tsx:93-98`: "nolan " (trailing space) finds nothing, whitespace-only text turns on the chip and "Filters, active", and "amelie" ≠ "Amélie". *Fix:* `.trim()` for matching and the active check; optionally NFD-normalize both sides. *(H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B21 — Hidden responsive column keeps sorting the export.** `MovieTable.tsx:70-147`. Sort by Genres/Actors at ≥992px, then narrow the window: Ant drops the hidden column's sort from the screen, but `sortedMovies` (and Export) keep it, and the sort silently returns when the window widens. *Fix:* clear `sort` when its column isn't visible at the current breakpoint, or drop `responsive` from sortable columns. *(M)*
- ✅ *Fixed 2026-11-21 by `fix-contexts-hooks-review` (logged again as B102).* **B22 — `ThemeContext` saves the OS-derived default on first render, so later OS theme changes are never followed.** `ThemeContext.tsx:39-44`. *Fix:* persist only in `toggleTheme`; optionally listen to `matchMedia` while nothing is saved. *(H)*
- **B23 — The outer ErrorBoundary can't recover.** `main.tsx:50-54`. It sits outside Router/Theme/ConfigProvider with no `onReset`. A crash in TopBar/Sidebar/a provider shows an unthemed fallback on a white body with no nav, and "Try Again" re-renders the same tree. *Fix:* make its action `location.reload()`. *(H)*

### Display of missing values
- ✅ *Dashboard part fixed 2026-11-22 by `fix-dashboard-review` (B114); MovieDrawer and MovieCardGrid parts fixed 2026-11-21 by `fix-movies-views-review`; Stats Overview part fixed 2026-11-22 by `fix-stats-review` ("—").* **B24 — Blank/zero values render as junk.**
  - `MovieDrawer.tsx:151,155,179-180` shows "Release  ()" for 16 blank-date rows, "0 mins" for 92 unknown runtimes, and a red "⭐ 0" for 303 unrated movies.
  - `MovieCardGrid.tsx:140,157` shows " · English" and "0 mins".
  - `Dashboard.tsx:353` Recent Releases shows "⭐ 0" / "⭐ ".
  - Stats Overview shows Earliest/Latest Release "0" when the year scope is empty (`OverviewTab.tsx:74-75`).

  *Fix:* render "—" or omit the field when it's blank/≤0; reuse the grid's `vote > 0` guard. *(H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-review` (empty catalogue → Go to Movies; empty range → Reset range).* **B25 — Stats has no empty state.** `Stats.tsx`. With an empty catalogue, or a year scope with no releases, the slider reads "1900 – 2026 · 0 movies" and the tabs show zeros. The Dashboard has an `Empty` state for this. *(H)*
- ✅ *Fixed 2026-11-21 by `fix-chart-wrappers-review` (also guards `null` values).* **B26 — Count tooltips show 2 decimals.** `HorizontalBarChart.tsx:92` uses `raw.toFixed(2)` when there's no `formatValue`: "Appearances: 5.00", "142.00 mins". *Fix:* print integers as-is. *(H)*
- ✅ *Fixed 2026-11-21 by `fix-app-shell-review` (logged again as B95).* **B27 — TopBar count badge shows "0 movies" after a failed first load.** `TopBar.tsx:32-49`. The count is unknown, not zero. *Fix:* hide it or show "–" when `error` is set. *(H)*

### Accessibility
- **B28 — Filter chips can't be removed from the keyboard, and every close icon is named "Close".** `ActiveFilters.tsx:20`. The Ant `Tag` close icon is `tabIndex=-1`. *Fix:* a focusable close button with `aria-label="Remove <chip>"`. *(H)*
- **B29 — Range slider handles have no accessible name.** `FiltersDrawer.tsx:141-179`, `RangeSlider.tsx:28`: 8 unnamed `role="slider"` handles. *Fix:* `ariaLabelForHandle` / `ariaLabelledByForHandle`. *(H)*
- ✅ *StatCard and Dashboard parts fixed 2026-11-22 by `fix-dashboard-review` (B111, B112); MovieCardGrid part fixed 2026-11-21 by `fix-movies-views-review` (`aria-describedby`).* **B30 — `aria-label` overrides hide visible data.**
  - `StatCard.tsx` ("Total Box Office: view details", so the amount is never read).
  - Dashboard highlight cards and Recent Releases items (drop the category, rating and date).
  - `MovieCardGrid.tsx:107-109` (`role="button"` + label means grid cards announce only the title; grid is the default view on mobile).

  *Fix:* include the values in the name, use `aria-describedby`, or use a real `<button>` on the title as `MovieTable` does. *(H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B31 — MovieDrawer heading reads its 🎬 emoji.** `MovieDrawer.tsx:83`. This was missed by the 0.9.0 emoji sweep. *Fix:* `<span aria-hidden="true">`. *(H)*
- **B32 — No `<nav>` landmark on desktop.** `Sidebar.tsx`. `Sider` is an `<aside>` and Ant `Menu` is `role="menu"`, while the mobile `BottomNav` is a `<nav>`. *Fix:* wrap the menu in `<nav aria-label="Main">`. *(H)*
- **B33 — `document.title` never changes and route changes aren't announced.** Every route, including 404, is titled "MovieDash". Focus stays on the nav link, and the 404 `Result` title isn't a heading. The e2e test "page title updates on navigation" only checks in-page headings, so its name is misleading. *Fix:* per-page `document.title`; move focus to the page `<h1>` on pathname change. *(H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-review` (text uses `--text-primary`/`--text-secondary`).* **B34 — Low-contrast light-theme text in TopNExplorer.** `TopNExplorer.tsx:246,263,322` uses a hardcoded `rgba(30,30,63,0.45)` (≈2.9:1). This is the same faintness the file's own comment rejects for ranks 6–10. *Fix:* `var(--text-secondary)`. *(M)*

### Visual / platform
- **B35 — White flash before first paint and light browser chrome in dark theme.** `index.html`/`index.css`: no pre-hydration `data-theme`, no `body` background, no `color-scheme`. Dark users see a white page while the bundle loads, white overscroll, and light native scrollbars in Firefox. *Fix:* inline theme script, `body` background, `color-scheme` per theme. *(H)*
- **B36 — Create React App leftovers.** `public/favicon.ico` is the stock React logo; `manifest.json` ("Create React App Sample"), `logo192.png` and `logo512.png` aren't referenced anywhere. `prod-deploy` task 4.1 removes only `public/index.html`. *Fix:* fold them into that cleanup. *(H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B37 — Add Movie keeps showing "Added" for a movie deleted afterwards.** `AddMovieModal.tsx:81,150` (modal stays mounted). *Fix:* derive "added" from the current catalogue instead of local state. *(H)*

### Tooling
- **B38 — Tests and configs are never type-checked.** `server/__tests__/*.ts`, `tests/app.spec.ts`, `vite.config.ts` and `playwright.config.ts` are in no tsconfig; `tsx --test` and Playwright strip types without checking. S9 fixed server source only. *Fix:* `tsconfig.test.json` plus a CI `tsc --noEmit -p` step. *(H)*

### Loose ends from the 0.9.1 work
- **B39 — Stat-card accent colors are off-palette hex** (`Dashboard.tsx`, `OverviewTab.tsx`). Deliberately excluded from the `design-system` palette rule. Revisit if a unified look is wanted.
- **B40 — Each chart wrapper hardcodes its own per-theme text/grid/tick `rgba`** (`src/components/Charts/*`) instead of reading shared tokens.
- **B41 — Duplicated aggregation code.** Comma-split genre/actor counting is hand-rolled in `BoxOfficeTab`, `ExploreTab`, `RatingsTab`, `PeopleTab` and `FiltersDrawer`; `Object.entries().sort().slice(0, N)` is repeated in many tabs. Overlaps B17. *Fix:* `groupByField` plus a shared `topN()`.
- **B47 — `docs/screenshots/` predate the 0.9.1 palette** (renumbered from a second B42 on 2026-11-06) and likely show the old bright chart colors.

### Found 2026-11-06 (`upgrade-major-deps` + `/simplify` review)
- ✅ *Fixed 2026-11-06.* **B48 — Flaky e2e "director filter applies and shows a chip".** `tests/helpers.ts` `selectInDrawer` read the first option's title and then clicked `.first()` again. The virtual option list scrolled in between, so the click selected a neighbouring row (e.g. read "A V Seshagiri Rao", selected "A. P. Arjun"). It failed 3/5 in isolation. *Fixed:* the helper returns the label the Select actually shows as selected. *(H, reproduced)*
- **B49 — antd `List` is deprecated in v6** (removed in v7). Dashboard Recent Releases and AddMovieModal results still use it, and it logs a deprecation warning. The replacement `Listy` is virtualized and has no `List.Item`/`List.Item.Meta`, so this is a rewrite of both lists plus the e2e `.ant-list-item` selectors. Do it before antd 7. *(H)*
- **B50 — Some e2e assertions are tied to layout or antd internals.** `tests/app.spec.ts` reads table cells by position (`td:nth-child(3)`/`(6)`, valid only at md+), and finds filter chips as `.ant-tag` filtered by text, in about 10 places; one filters on just a language name. Reordering or hiding a column, or another antd rename, breaks these silently. *Fix:* a `columnCells(page, header)` helper that resolves the index from the `columnheader` name, and an accessible name/list role on `ActiveFilters` chips with a `filterChip(page, label)` helper. *(M)*

---

## 3b. Found 2026-11-04 (`server/server.ts` review), all fixed by `harden-server-entry`

- ✅ **B42 — A failed startup load served an empty catalogue.** The boot load's catch set `isReady` anyway, so a duplicate header, permission error or lock gave health `ok, movies: 0` and `200 []`, and the Dashboard showed "empty catalogue". *Fixed:* `loadError` state, health `error`, catalogue routes `500`, retried per request. *(H, reproduced)*
- ✅ **B43 — `EADDRINUSE` crashed with a raw stack trace.** Under `concurrently`, Vite kept proxying to the stale process holding :5000. *Fixed:* `listen()` rejects; one-line message + exit 1. *(H, reproduced)*
- ✅ **B44 — Shutdown didn't wait for catalogue writes and had no time limit.** *Fixed:* `installShutdown` + `drain()`, 10s cap, exit at once on a second signal. *(M)*
- ✅ **B45 — `.env` read errors were swallowed.** *Fixed:* only ENOENT is silent. *(M)*
- ✅ **B46 — `PORT` not validated** (`abc` → `ERR_SOCKET_BAD_PORT`, `5000abc` → 5000). *Fixed:* strict `parsePort`. *(H, reproduced)*
- ✅ **S10 (LAN exposure of unauthenticated mutations)**, moved here from `prod-deploy`. *Fixed:* Express `127.0.0.1`, Vite `localhost`, `npm run dev:lan`. Checked by hand against the LAN IP for both `dev` and `dev:lan`.
- Not fixed, by decision: an empty `CLIENT_ORIGIN` opening CORS (false positive, tested: no ACAO header is sent); DNS rebinding (security verifier 3/10); `trust proxy` (stays in `prod-deploy`).

## 3c. Found 2026-11-07 (Batch A review: `server/app.ts`, `server.ts`, `tmdb.ts`, `bootstrap.ts`), all fixed by `fix-server-batch-a-review`

All 10 were checked against the code before fixing. The security review of the same files kept 0 at ≥8 confidence; its one suggestion is B59.

- ✅ **B51 — Two or more blank trailing header cells took the catalogue offline.** `findDuplicateHeader` saw `''` twice → `DuplicateHeaderError` → every catalogue route `500`. *Fixed:* blank header cells are skipped columns. *(H)*
- ✅ **B52 — Import served fields the file had no column for.** Memory held the full row while `appendMovieToCsv` wrote only the header's columns, so a poster/date showed until a restart. *Fixed:* `projectRow(row, csvHeaders)` is served and kept. *(M)*
- ✅ **B53 — `TRUST_PROXY=true` let any client pick its rate-limit key** (`express-rate-limit` 8 flags it as `ERR_ERL_PERMISSIVE_TRUST_PROXY`). *Fixed:* `ConfigError` at startup. **Breaking** for configs using `true`. *(M)*
- ✅ **B54 — A null/HTML/title-less TMDB details body was saved as a blank row** and then blocked re-import with `409`. *Fixed:* `502`, nothing written; null credits still import. *(M)*
- ✅ **B55 — Rewrites dropped the file's BOM and wrote LF into CRLF files**, so Excel garbled non-ASCII titles after an in-app delete (server-side twin of B14). *Fixed:* BOM and EOL probed at load and reproduced. *(M)*
- ✅ **B56 — The import's early `409` used stale memory**, so a row removed by another tool couldn't be re-imported until some other request reloaded. *Fixed:* `reloadForRead()` first. *(L)*
- ✅ **B57 — After a failed boot, deleting the broken file never recovered** (null vs null fingerprint looked unchanged). *Fixed:* forced reload while `loadError` is set. *(L)*
- ✅ **B58 — TMDB calls could take ~31.5 s each (~63 s for an actor search)**: timeouts and non-network errors were retried, `Retry-After` ignored. *Fixed:* 15 s deadline per call, only network/`429`/`5xx` retried, `Retry-After` honoured. *(L)*
- ✅ **B59 — The error middleware logged the whole error object** (CLAUDE.md requires `describeError`; no key path today), and the boot catch could log `undefined`. *Fixed:* one line via `describeError`. *(L)*
- ✅ **B60 — CSV escaping duplicated in `exportCsv.ts`**, and new-file headers followed `Object.keys` order. *Fixed:* shared `src/utils/csvEscape.ts`; `CATALOGUE_COLUMNS` header. *(cleanup)*

## 3d. Found 2026-11-07 (Batch B review: `movie-search.py`, `backfill_posters.py`), all fixed by `fix-python-csv-writers`

CR found 10, all checked against the code (BOM, `extrasaction`, CRLF reproduced in Python 3.13). 3 were existing B3/B8/B9; 7 new below. SR kept 0 at ≥8 confidence (key leak 1, formula injection 2, tab/CR prefix 3, Tcl 1).

- ✅ **B61 — Backfill checkpoints overwrite rows added while it runs.** `backfill_posters.py:71,104,107` reads the CSV once and rewrites from that copy, so a movie imported in-app (or by `movie-search.py`) during the run is lost. No changed-file check, unlike the server. *Fix:* re-read at checkpoint, merge posters by `Movie ID`, stale check before replace. *(High, H)*
- ✅ **B62 — `movie-search.py` paging repeats or errors.** `:266` language scan never advances `current_page`, so Next Page rescans pages already shown; Next Page after an actor search runs an empty title search (error dialog) once a prior search set `total_pages > 1`. *(Low, H)*
- ✅ **B63 — `movie-search.py` result list freezes and cascades dialogs.** `:194` fetches details serially on the Tk main thread, one dialog per failure (20 on an outage); save refetches the details (`:215`) and reads the CSV twice (`:109`, `:140`). *(Low, H)*
- ✅ **B64 — Backfill ignores a bad API key and rewrites when nothing changed.** `backfill_posters.py:55,107`: 401 is counted as `request_error` and every remaining row is requested; the final `write_csv` always runs, converting LF to CRLF and bumping mtime. *(Low, H)*
- ✅ **B65 — A row with stray extra cells crashes Python rewrites.** `DictReader` puts extras under key `None`; `DictWriter`'s default `extrasaction="raise"` throws `ValueError: dict contains fields not in fieldnames: None` (`backfill_posters.py:64`, `movie-search.py:152`), losing checkpoint progress and leaving `.tmp`. *(Med, H)*
- ✅ **B66 — Python `os.replace` has no lock retry.** `backfill_posters.py:67`, `movie-search.py:155`: Excel/AV holding the file → `PermissionError` crash (up to 99 rows of backfill progress lost). Server retries EPERM/EBUSY/EACCES. *(Med, H)*
- ✅ **B67 — Python session/temp-file code duplicated; fixed `.tmp` name shared.** Both scripts copy the session/Retry/`CSV_PATH`/rewrite code and use `CSV_PATH + ".tmp"`, so concurrent runs collide. *(cleanup)*

## 3f. Found 2026-11-14 (Batch B re-review: `git diff 6e45db5 d79ac6a` on `catalogue_io.py`, `movie-search.py`, `backfill_posters.py`), fixed by `harden-python-catalogue-io`

CR (high) found 8, all confirmed by reading the code; B85 also seen live (Hindi + "love" scanned 87 TMDB pages for one view). SR kept 0 at ≥8 confidence (formula injection 1, key leak 1, temp file 1, path-only SSRF 1). The manual GUI check of `fix-python-csv-writers` found one more bug, fixed before its archive: a failed title search showed "Connection Error" then "No Results".

- ✅ **B79 — Python reads header names raw.** `catalogue_io.py:96`: no trim, blank cells not skipped, unlike the server's `mapHeaders`. A `Poster URL ` header makes backfill/search add a second `Poster URL`; the server then fails every add/delete with `DuplicateHeaderError`. A `Movie ID ` header defeats the duplicate check. *(High, H)*
- ✅ **B80 — Python rewrites a file whose header repeats a column.** `catalogue_io.py:164`: `DictReader` keeps the last value of a repeated key, so a rewrite copies it into both columns and the first column's data is lost. The server refuses this file. *(Med, H)*
- ✅ **B81 — Search tool saves Language/Runtime/Year from the list cells.** `movie-search.py:206`: if that movie's details fetch failed while listing, a later save stores those blank even though details now succeed. B63's no-partial-row rule is half kept. *(Med, H)*
- ✅ **B82 — Backfill loses found posters on an early stop.** `backfill_posters.py:112`: Ctrl+C, a non-object TMDB body (`AttributeError` at `:55`), a disk error or a bad encoding at a checkpoint ends the run with no final save. *(Med, H)*
- ✅ **B83 — Python duplicate check and append are not re-checked against the file.** `catalogue_io.py:138`: an in-app import between them gives a duplicate row; a small gap remains between a rewrite's fingerprint check and `os.replace`. *(Low, M)*
- ✅ **B84 — Search window still freezes during fetches.** `movie-search.py:125`: the pool's `with` block runs on the Tk thread; save fetches credits/keywords serially. *(Low, H)*
- ✅ **B85 — Language scan has no page cap.** `movie-search.py:267`: a broad query with a rare language reads every page on the Tk thread. *(Low, H)*
- ✅ **B86 — Shared rules duplicated.** TMDB GET code in both scripts (already diverged); formula escaping only in `movie-search.py`; a new file's column order differs from `CATALOGUE_COLUMNS`. *(cleanup)*

Follow-up `/code-review` (high) of the uncommitted `harden-python-catalogue-io` work, 2026-11-14: 7 found, all confirmed (B89 reproduced: ttk returns `'1917'` as int), all fixed in the same working tree (no OpenSpec change; verified by unit tests, a new server test and the live GUI driver).

- ✅ **B87 — A blank header cell in the middle shifts appended values one column left.** Python `append_row` wrote only the named columns, and so did the server's `appendMovieToCsv` (`toCsvLine(row, csvHeaders)`): `Movie ID,,Name,…` put the name in the blank column. Both now write by position (`Catalogue.layout` / `csvLayout`). Server half was pre-existing. *(High, H)*
- ✅ **B88 — `add_row_if_new` skipped the duplicate check after a header migration.** It re-read and appended directly; an in-app import of the same movie in between gave a duplicate. Now loops back to the check. *(Med, H)*
- ✅ **B89 — Numeric titles crash the save summary.** Treeview returns `1917` as int; `', '.join` raised `TypeError` on the failed path, so no dialog appeared. *(Med, H)*
- ✅ **B90 — Saves still did CSV I/O on the Tk thread.** One full read per selected movie plus up to ~1.5 s of lock retry. Appends now run in the save worker. *(Low, H)*
- ✅ **B91 — A failed or empty search reset paging for the list still shown.** Next Page said "no more pages" and the language box re-ran the failed query. State now changes only when results arrive. *(Low, H)*
- ✅ **B92 — Backfill's failed final save said "will retry at the next one".** On Ctrl+C/401 there is none; it now says the posters are lost and to re-run. *(Low, H)*
- ✅ **B93 — A rejected TMDB key showed "Check your connection" in `movie-search.py`.** `401` is now named as an API-key problem. *(Low, H)*

## 3e. Found 2026-11-07 (Batch C review: `vite.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `scripts/check-bundle.mjs`), fixed by `harden-build-test-config` (B75 deferred)

CR found 10, all checked against the code: 9 confirmed, 1 plausible but never observed (B75, deferred). SR kept 0 at ≥8 confidence (`dev:lan` proxy reach 4, by design; DNS rebinding 1, Vite 8.3.5 host check runs before the proxy; `/@fs` `.env` read 2, default `fs.deny`). Its doc-accuracy note is B78.

- ✅ **B68 — A committed `test.only` shrinks CI e2e to one passing test.** `playwright.config.ts` has no `forbidOnly`. *(High, H)*
- ✅ **B69 — Nothing enforces importing `test` from `tests/helpers.ts`.** A spec importing from `@playwright/test` skips the write-guard fixture; clicking Delete in e2e would rewrite the real `src/movies.csv`. *(High, H)*
- ✅ **B70 — e2e specs, helpers and build configs are never type-checked.** The root tsconfig includes only `src`, and Playwright and Vite strip types without checking them. They compile cleanly today. *(Med, H)*
- ✅ **B71 — Vite has no `strictPort`.** If 3000 is busy, Vite moves to 3001 while Playwright waits on, or reuses, whatever holds 3000. *(Med, H)*
- ✅ **B72 — Gitignored `*.tmp.*` files are linted.** ESLint 10 flat config doesn't read `.gitignore`, so a throwaway `shots.tmp.mjs` fails `no-undef` on `process`. *(Low, H)*
- ✅ **B73 — Lint warnings never fail CI.** `eslint .` has no `--max-warnings 0`. *(Low, H)*
- ✅ **B74 — `waitForTimeout` isn't banned in tests**, despite the CLAUDE.md rule. *(Low, H)*
- **B75 — All dev-proxy traffic shares one rate-limit bucket.** Proxied `/api` requests arrive from 127.0.0.1, so the whole e2e run and every `dev:lan` device share 300 req/min. Never seen to cause a 429. *Deferred: raising the dev limit would also loosen `dev:lan`.* *(Low, M)*
- ✅ **B76 — The bundle budget gzips at level 9, but the server sends level 6** (`compression()` default), so the check under-reports. *(Low, H)*
- ✅ **B77 — `tseslint.config()` is deprecated** in typescript-eslint 8.72, which recommends `defineConfig()` from `eslint/config`. *(cleanup)*
- ✅ **B78 — Docs say `dev:lan` keeps the API local.** README Security says "`npm run dev:lan` opens only the web app", and CLAUDE.md and the `vite.config.ts` comment say "the API stays loopback". Through the dev proxy, LAN devices can list, add and delete movies; only port 5000 itself stays loopback. *(Low, H, from SR)*

## 3g. Found 2026-11-20 (Batch D review: app shell, §6 rows 9–16), owned by `fix-app-shell-review`

CR (high) of `main.tsx`, `App.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx`, `ErrorBoundary.tsx`, `LoadingError.tsx`, `ScrollToTop.tsx` found 8, all confirmed by reading the code (B94 and B99 against `node_modules/antd` 6.7.0). SR found nothing (no HTML injection, eval or dynamic `href`; error text renders as escaped React text; theme storage is only compared to a fixed string). Already-logged B10, B11, B12, B23, B35 were re-checked: still open, not in this change.

- ✅ *Fixed 2026-11-21 by `fix-app-shell-review`.* **B94 — Tablet-width loads show the sidebar expanded.** `App.tsx:44`. antd 6.7 `useBreakpoint` reads `matchMedia` on the first render, so `prevMd === screens.md` and the render-phase collapse never runs; the `App.tsx:48-49` comment and CLAUDE.md ("`{}` on the first render") are stale. *Fix:* `useState(() => screens.md === false)`. *(Med, H)*
- ✅ *Fixed 2026-11-21 by `fix-app-shell-review`.* **B95 — A failed first load shows a "0 movies in catalogue" badge.** *(Same as B27.)* `TopBar.tsx:33` checks `loading` only, and `showZero` shows the empty array next to the error alert, so the data looks gone. *Fix:* no badge while `error` is set. *(Med, H)*
- ✅ *Fixed 2026-11-21 by `fix-app-shell-review`.* **B96 — Load errors show axios's generic "Request failed with status code 503".** `MoviesContext.tsx:62` → `LoadingError.tsx:51`: the server's `{ error }` text ("Data still loading") is dropped, and the dev start-up race needs a manual Retry. *Fix:* prefer `response.data.error`; retry a first-load 503 once. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-app-shell-review`.* **B97 — Crashed page stays in error when its own nav link is clicked.** `App.tsx:103`: the boundary is keyed on `pathname` only, so `/stats?tab=people` → `/stats` keeps the error view. *Fix:* reset on non-REPLACE location changes (not on `search` in the key: Stats' `?tab=` sync would remount it). *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-app-shell-review`.* **B98 — Back/Forward always jumps to the top.** `ScrollToTop.tsx:7` runs on POP too. *Fix:* skip when `useNavigationType() === 'POP'`. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-app-shell-review`.* **B99 — Refresh spinner is never announced.** `TopBar.tsx:52`: antd `Spin` puts `aria-label` on a role-less `div`. *Fix:* always-mounted `role="status"` with visually hidden text. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-app-shell-review`.* **B100 — Collapsed Sidebar logo link is announced as "play-circle".** `Sidebar.tsx:62`. *Fix:* `aria-label` on the link, icon `aria-hidden`. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-app-shell-review`.* **B101 — BottomNav icons leak into link names** ("unordered-list Movies"). `BottomNav.tsx:55`. *Fix:* wrap icons in `aria-hidden`. *(Low, H)*

## 3h. Found 2026-11-20 (Batch E review: contexts + hooks, §6 rows 17–22), owned by `fix-contexts-hooks-review`

CR (high) of `MoviesContext.tsx`, `ThemeContext.tsx`, `DrilldownContext.tsx`, `useMovies.ts`, `useDebounce.ts`, `usePersistedFilters.ts` (plus their callers in `Movies.tsx`, `Stats.tsx`, `TopBar.tsx`, `MovieDrawer.tsx`, `AddMovieModal.tsx`) found 8, all confirmed by reading the code. Nothing found in `DrilldownContext.tsx` or `useMovies.ts`. Two were duplicates and are not logged again: the generic axios error text is B96 (fix it with the `extractErrorMessage` that `AddMovieModal.tsx:25` and `MovieDrawer.tsx:19` each define, moved to a shared util, not a third copy), and the missing `color-scheme` is B35. SR found nothing (fixed `/api/movies` URL and `/movies` navigation target, theme storage compared to fixed strings, restored filters shape-checked by `sanitizeFilters` and rendered as escaped React text, no HTML injection or eval). All six re-checked against the code 2026-11-20: still present.

- ✅ *Fixed 2026-11-21 by `fix-contexts-hooks-review`.* **B102 — Theme stops following the OS after the first visit.** *(Same as B22.)* `ThemeContext.tsx:39-44`: the layout effect writes `localStorage.theme` on mount, so the OS-derived default is saved as if the user chose it, and later OS changes are ignored. CLAUDE.md promises the first-visit theme follows `prefers-color-scheme` "with no saved choice". *Fix:* write only in `toggleTheme`; while nothing is saved, follow `matchMedia` `change` events. *(Med, H)*
- ✅ *Fixed 2026-11-21 by `fix-contexts-hooks-review`.* **B103 — A 200 response that isn't an array crashes every page.** `MoviesContext.tsx:56` stores `response.data` unchecked; a proxy or captive portal returning `index.html` or `{}` makes `movies.filter` throw in `Movies.tsx`/`Stats.tsx`, showing the crash screen instead of the load-error alert. *Fix:* `!Array.isArray(response.data)` → error / `refreshError` path. *(Med, H)*
- ✅ *Fixed 2026-11-21 by `fix-contexts-hooks-review`.* **B104 — Old search still filters for 300 ms after Clear all or a drill-down.** `Movies.tsx:74`: `useDebounce` also delays programmatic resets to `''`, so the list lags the cleared input and chips, `filtersKey` changes twice (two page resets), and an Export in that window writes the old filtered rows. *Fix:* no debounce when the value becomes `''` (or when not typed). *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-contexts-hooks-review`.* **B105 — A drill-down first renders the saved filters, then the preset.** `Movies.tsx:64-72`: the preset from `location.state` is applied in a mount `useEffect`, after `usePersistedFilters` seeded state from sessionStorage, so the old list flashes, the one-time `clampFiltersToSpans` pass runs on the old filters, and preset ranges are never clamped. *Fix:* let `usePersistedFilters` take the preset as its initial state. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-contexts-hooks-review`.* **B106 — Blocked `localStorage` stops saved filters restoring.** `usePersistedFilters.ts:42`: the legacy `localStorage.removeItem` shares a `try` with the `sessionStorage` read, so its exception returns `defaults` even though sessionStorage works. *Fix:* separate `try/catch` for the legacy cleanup. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-contexts-hooks-review`.* **B107 — Theme storage key isn't namespaced.** `ThemeContext.tsx:17,42` uses `'theme'` (filters use `movieDash_…`), so another project on `localhost:3000` shares and flips it. *Fix:* `movieDash_theme`. Not migrated from `theme`: every existing value was auto-written by B102, so it isn't a real choice (design D2). *(Low, H)*

## 3i. Found 2026-11-20 (Batch F review: Dashboard, §6 rows 23, 33–35), fixed by `fix-dashboard-review` (archived 2026-11-22)

CR (high) of `Dashboard.tsx`, `PosterThumb.tsx`, `DashboardSection.tsx`, `StatCard.tsx` reported 10; 9 confirmed by reading the code, nothing in `PosterThumb.tsx`. Rejected: "mini charts first draw at phone height on desktop" (`Dashboard.tsx:126`) assumed `Grid.useBreakpoint()` is `{}` on the first render, but antd 6.7's `responsiveObserver.getSnapshot()` reads `matchMedia` before the first commit (same fact as B94). SR found nothing (fixed navigation targets, movie fields rendered as escaped React text, `Poster URL` only as `<img src>` under the CSP's `img-src`, hero colours are hard-coded hex).

- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B108 — Dashboard "Top Rated" ignores vote count.** *(Same as B7.)* `Dashboard.tsx:151` picks the highest `Vote Average` with no `Vote Count` cutoff, so a 1-vote 10.0 beats The Godfather, while `TopNExplorer.tsx:50-61` requires ≥50 votes (dropped when <10 qualify). Breaks `accessible-ui` "Top-rated rankings require meaningful vote counts". *Fix:* shared `ratingPool()` in `statsHelpers.ts`. *(Med, H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B109 — A failed drawer chunk breaks the Dashboard until reload.** *(Same root cause as B10 (React.lazy caches the rejection), at the Dashboard drawer instead of the route chunks; B10 stays open.)* `Dashboard.tsx:398`: the lazy `MovieDrawer` has no local error boundary, so a `ChunkLoadError` (network drop, redeploy) hits the route ErrorBoundary; React caches the rejected lazy payload, so "Try Again" throws it again. *Fix:* local boundary + re-created lazy on error, message instead of crash. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B110 — Negative revenue lowers Total Box Office.** `Dashboard.tsx:133` sums `parseRevenue()`, which returns negatives as-is; `BoxOfficeTab.tsx:52` skips `rev <= 0`. *Fix:* sum only `> 0`. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B111 — Clickable cards hide their value from screen readers.** *(Dashboard part of B30.)* `StatCard.tsx:22` ("Total Box Office: view details", no amount), `Dashboard.tsx:62` (highlights: no "Top Rated"/rating), `Dashboard.tsx:338` (recent releases: no date/rating): `aria-label` replaces the content name. *Fix:* include the shown values in the label. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B112 — Recent Releases loses list semantics.** `Dashboard.tsx:336`: `role="button"` on `List.Item` overrides the `<li>` role (same pattern that broke MovieTable). *Fix:* real `<button>` inside the `<li>`. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B113 — Mini charts rebuild on every Dashboard render.** *(Dashboard part of B13.)* `Dashboard.tsx:210-227, 317`: click handlers and the `isClickable` arrow are new each render, and the chart wrappers key their options `useMemo` on them, so opening the drawer re-runs `chart.update()` on all three. *Fix:* `useCallback`. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B114 — Unrated movies show "⭐ 0"; averages show 0 with no data.** *(Dashboard part of B24.)* `Dashboard.tsx:359` and `:277` print the raw `Vote Average`; `:254-255` show `0.0 / 10` / `0 mins` with no known values. *Fix:* "Not rated" tag, "—" for empty averages. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B115 — Hero tint only works with `#RRGGBB`.** `StatCard.tsx:29` appends `14` to `color`; any other format makes the background invalid and the card transparent. All current callers pass 6-digit hex. *Fix:* `withAlpha(color, 0.08)`, document hex-only. *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-dashboard-review`.* **B116 — Dashboard headings skip h4.** `DashboardSection.tsx:16` renders h5 under the h3 page title. *Fix:* `level={4}` with h5's font size. *(Nit, H)*

## 3j. Found 2026-11-20 (Batch G review: Movies page + filtering, §6 rows 24, 30–32, 54, 55, 74), fixed by `fix-movies-filtering-review` (archived 2026-11-21)

CR (high) of `Movies.tsx`, `FiltersDrawer.tsx`, `ActiveFilters.tsx`, `RangeSlider.tsx`, `filterChips.ts`, `filterSpans.ts`, `search.ts` reported 8; 7 confirmed by reading the code (B117 against `@rc-component/slider` `es/hooks/useOffset.js`), nothing in `ActiveFilters.tsx`. The eighth (old search filters for 300 ms after Clear all / a drill-down) is B104/B105, not logged again. SR found nothing (preset filters only used in memory, fixed navigation and export filename, chip/option text rendered as escaped React text, plain `includes` search with no regex; export goes through the shared formula guard).

- ✅ *Fixed 2026-11-21 by `fix-movies-filtering-review`.* **B117 — Vote slider rounds drill-down bounds.** `FiltersDrawer.tsx:155`: `step={0.1}` makes the slider align `[2, 3.999]` to `[2, 4]`, and moving either handle commits `4`, so 4.0 films (counted in "4–6") show in the "2–4" list. Breaks the bucket/filter rule. *Fix:* `RangeSlider` keeps an untouched end at its exact committed value. *(Med, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-filtering-review`.* **B118 — Revenue slider steps $1 by keyboard.** `FiltersDrawer.tsx:172`: no `step` (default 1) over up to ~$3B; each key press commits and refilters. *Fix:* rounded step ≈ span/100. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-filtering-review`.* **B119 — Runtime 0 counts as a real runtime.** *(Same as B5.)* `filterSpans.ts:21`, `Movies.tsx:117-121`: TMDB's unknown runtime is stored as `'0'` (`server/app.ts:650`), so the slider starts at 0 and 0–90 lists it; `RuntimeTab.tsx:46` buckets it in "< 60 min". *Fix:* runtime ≤ 0 = unknown, like vote/revenue. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-filtering-review`.* **B120 — Search isn't trimmed.** *(Trim part of B20.)* `search.ts:24`, `filterChips.ts:19,33`: "The Matrix " matches nothing; a lone space shows a blank "Search:" chip and the active badge. *Fix:* trim at match/active/chip time. *(Low, H)*
- ✅ *Resolved 2026-11-21: already fixed by B129's normalisation (`fix-movies-views-review`); no per-site guard added (CLAUDE.md), `fix-movies-filtering-review` adds the e2e test.* **B121 — Genre filter crashes without a `Genres` column.** *(B17 pattern; made redundant by B129's normalisation in `fix-movies-views-review`.)* `Movies.tsx:91` `movie.Genres.split` throws when the CSV lacks the column and a genre filter is saved (`FiltersDrawer.tsx:52` already guards). *Fix:* `(movie.Genres ?? '')`. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-filtering-review`.* **B122 — Export CSV hint is mouse-only.** `Movies.tsx:202`: Tooltip on an unfocusable `InfoCircleOutlined`. *Fix:* hint on the button (Tooltip + `aria-describedby`). *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-filtering-review`.* **B123 — Export is always named `movies-filtered-N.csv`.** `Movies.tsx:198`, even with no filters. *Fix:* `movies-N.csv` unless filters are active. *(Nit, H)*

## 3k. Found 2026-11-20 (Batch H review: Movies views + mutations + export, §6 rows 26–29, 52), owned by `fix-movies-views-review`

CR (high) of `AddMovieModal.tsx`, `MovieDrawer.tsx`, `MovieTable.tsx`, `MovieCardGrid.tsx`, `exportCsv.ts` reported 10, all confirmed by reading the code. Three were already logged (B14, B19, B31). One widens B17 to these files (B129). Older open items in these files the review skipped (B21, B24 drawer/grid parts, B30 grid part, B37) were re-checked, are still present, and are owned by the same change. B49 (antd `List`) stays open. SR found nothing exploitable: search/import params are encoded and validated server-side, delete uses `encodeURIComponent`, posters are only `<img src>` under the CSP. B130's header gap needs a hand-edited CSV, so it is a hardening nit, not a vulnerability.

- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B124 — Language column sorts by ISO code, not the shown name.** `MovieTable.tsx:47`: de/el/en sort as German, Greek, English; Export follows. *Fix:* compare `getLanguageName()`. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B125 — A search submitted during another is silently dropped.** `AddMovieModal.tsx:49` returns while `searching`, but the inputs stay editable and Enter calls it, so "Alien" results show under "Aliens". This makes `searchIdRef` dead code and contradicts `catalog-persistence`'s own "Rapid successive searches" scenario. *Fix:* a new search replaces the running one (abort + id guard). *(Med, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B126 — Importing a movie that's already in the catalogue shows an error.** `AddMovieModal.tsx:83`: the server's 409 (added in another tab, by `movie-search.py`, or still in flight) is shown as an error, the row keeps Import, and every retry fails. *Fix:* treat 409 as added + `refetch()`. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B127 — Blob URL revoked right after `click()`.** `exportCsv.ts:31`: some Safari/older Firefox versions cancel the download. *Fix:* revoke after a delay. *(Low, M)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B128 — Starting an import clears another operation's error.** `AddMovieModal.tsx:78` `setError(null)`, so a failed import's alert vanishes when the next starts. *Fix:* only searches clear the error. *(Nit, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B129 — Missing fields crash the grid, drawer and table sorters.** *(Batch K: a row missing trailing cells also crashes `formatDateDDMMYYYY(undefined)` in MovieTable/MovieDrawer, since `Release Date` is the last column; `fix-utils-types-review` makes that helper tolerate it too.)* `MovieCardGrid.tsx:95`, `MovieDrawer.tsx:166` `.Genres.split`; `MovieTable.tsx:35-115`, `MovieCardGrid.tsx:39-40` `localeCompare` on fields a short row or a missing column leaves undefined. B17 pattern. *Fix:* normalise every `CATALOGUE_COLUMNS` field to a string once in `MoviesContext` (also fixes B17). *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-movies-views-review`.* **B130 — Export header cells skip the formula guard.** `exportCsv.ts:22`: extra column names only get `escapeCsvField`. Needs a hand-edited CSV header. *Fix:* `sanitizeCsvValue` on headers too. *(Nit, H)*

## 3l. Found 2026-11-20 (Batch I1 review: Stats page, §6 rows 25, 36–38, 43), fixed by `fix-stats-review` (archived 2026-11-22)

CR (high) of `Stats.tsx`, `TopNExplorer.tsx`, `ChartBlock.tsx`, `OverviewTab.tsx`, `ExploreTab.tsx` reported 10, all checked against the code. Nothing in `ChartBlock.tsx`. Five were already logged: the per-year "Unknown" point and gap years (B4), Earliest/Latest "0" (B24 Stats part), no empty state (B25), faint light-theme text (B34). The open OverviewTab/ExploreTab part of B13 is in the same files and is owned by the same change. One finding was weaker than reported: "Top 10 toolbar scrolls the page sideways on a phone". Playwright at 320 and 375 px with 12 mocked rows showed no page scroll; the Select shrinks to 87 px instead (B132). The null `Genres.split` in ExploreTab is B17 (owned by `fix-movies-views-review`). SR found nothing: `?tab=` and `location.state.tab` are checked against `TAB_KEYS`, movie fields are rendered as escaped React text or drawn on the canvas, and the only `href` is a `canvas.toDataURL` PNG with a filename built from hard-coded titles. Drill-downs go to the fixed `/movies` path with in-memory state.

- ✅ *Fixed 2026-11-22 by `fix-stats-review`.* **B131 — Stats Release Year Range isn't re-checked when the data changes.** `Stats.tsx:40, 113`: `yearRange` changes only on commit or Reset, so after a refresh the label can show years outside `[yearMin, yearMax]` while the Slider clamps its handles, and Reset stays visible even when the range covers everything. *Fix:* render-phase clamp; reset when there's no overlap or it covers the full span. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-review`.* **B132 — Top 10 metric Select is squeezed at phone width.** `TopNExplorer.tsx:82-88`: the toolbar row doesn't wrap, so at 320 px the 200 px Select shrinks to 87 px and "Highest Rated" is cut off. *Fix:* `flexWrap: 'wrap'`, Select `maxWidth: '100%'`. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-review`.* **B133 — "Oldest" ranks undated movies and orders ties by file position.** `TopNExplorer.tsx:35`: `-(year || 9999)` gives undated movies a finite -9999, so they can appear with an empty value cell. Ranking by year only leaves same-year movies in CSV order, while "Most Recent" uses the full date. *Fix:* rank by `Release Date`, falling back to the year, otherwise NaN. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-review`.* **B134 — Stats language bars have no hover feedback.** `OverviewTab.tsx:116` sets `hoverBackgroundColor` equal to `backgroundColor`. CLAUDE.md says to leave it unset. *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-review`.* **B135 — Earliest/Latest Release spread every year into `Math.min/max`.** `OverviewTab.tsx:74-75`: this throws `RangeError` past the engine's argument limit (~100k+ rows). *Fix:* one loop, as `Stats.tsx` does. *(Nit, H)*

## 3m. Found 2026-11-20 (Batch I2 review: Stats tabs, §6 rows 39–42), fixed by `fix-stats-tabs-review` (archived 2026-11-22)

CR (high) of `PeopleTab.tsx`, `RatingsTab.tsx`, `RuntimeTab.tsx`, `BoxOfficeTab.tsx` reported 10, all checked against the code.
- **Already logged:** B6 (rating averages count unrated movies), B18 (fake "Unknown"/0.0 radar spoke) and the rest of B13 (inline chart callbacks, plus `formatRoi` defined inside `BoxOfficeTab`).
- **Owned by other changes:** runtime 0 in "< 60 min" is B119 (fixed by `fix-movies-filtering-review` 3.3, archived 2026-11-21); the unguarded `Actors/Actresses` `.split` is B17 (`fix-movies-views-review`).
- **Rejected (2):** "empty runtime bucket shows Avg Vote 0.00 and drills to an empty list" and "zero-count vote bars are clickable". A 0-value bar has no area: Chart.js 4 `BarElement.inRange` uses `_isBetween` (epsilon 1e-6) with the default `intersect: true`, so it can't be hovered or clicked.

SR found nothing: CSV strings only reach Chart.js labels and data (canvas text, no HTML tooltips), callbacks return plain strings, colours are fixed tokens, and drill-downs go to the fixed `/movies` path with in-memory state.

- ✅ *Fixed 2026-11-22 by `fix-stats-tabs-review`.* **B136 — "Average Vote by Year" skips years with no data.** `RatingsTab.tsx:87-109`: only years with data are labelled, on a category axis, so 1962 → 1971 looks like adjacent years. *Fix:* label every year from min to max; empty years are `null` (line breaks there, not clickable). *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-tabs-review`.* **B137 — Radar point borders are hardcoded hex.** `RatingsTab.tsx:82` `pointBorderColor: isDark ? '#fff' : '#1e1e3f'`, which breaks the CLAUDE.md "never hardcode hex in a chart dataset" rule. *Fix:* remove it (falls back to `borderColor`). *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-stats-tabs-review`.* **B138 — Scatter sets `hoverBackgroundColor`.** `RatingsTab.tsx:125`; CLAUDE.md says to leave it unset. *(Nit, H)*

## 3n. Found 2026-11-20 (Batch J review: chart wrappers, §6 rows 44–51), owned by `fix-chart-wrappers-review`

CR (high) of the 8 files in `src/components/Charts/` reported 7, checked against the code and Chart.js 4's defaults in `node_modules`. Nothing in `RadarChart.tsx` or `MatrixChart.tsx`.
- **Already logged:** the options memo rebuilt on every render is B13 (fixed here inside the wrappers with a latest-ref, so the callers' `useCallback` tasks in three other changes become optional). The 2-decimal tooltip is B26 (plus a `null` value throwing in the tooltip callback).
- **Weaker than reported (B140):** "smoothed line dips below zero". Chart.js's `capBezierPoints: true` clips to the chart area, so the dip isn't visible when 0 is the axis bottom; the curve still bends past the data elsewhere.
- **Rejected:** "pointer cursor stuck when `onElementClick` is removed". No caller passes it conditionally.

SR found nothing: no HTML tooltips or raw-HTML sinks, callbacks return plain strings drawn on the canvas, `onHover` only sets `cursor` to fixed values, colours are constants, and the matrix plugin is a bundled npm dependency.

- ✅ *Fixed 2026-11-21 by `fix-chart-wrappers-review`.* **B139 — Line-chart points are hard to hover or click.** `LineChart.tsx:50`: Chart.js defaults to `nearest` + `intersect: true`, and the point hit circle is radius 3 + `hitRadius` 1 (8 px). A near miss on the Dashboard trend or a Stats year line gives no tooltip, cursor or drill-down. *Fix:* `interaction: { mode: 'index', intersect: false }`. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-chart-wrappers-review`.* **B140 — Smoothed lines bend past the data.** `LineChart.tsx:49` `tension: 0.4` with cubic interpolation overshoots between points (zero-filled trend years make it common). *Fix:* `cubicInterpolationMode: 'monotone'`. *(Nit, H)*
- ✅ *Fixed 2026-11-21 by `fix-chart-wrappers-review`.* **B141 — Scatter tooltip hardcodes "votes" and "/10".** `ScatterChart.tsx:26-28` ignores `xLabel`/`yLabel`; correct today only because the one caller is the vote scatter. *Fix:* build it from the axis labels. *(Nit, H)*
- ✅ *Fixed 2026-11-21 by `fix-chart-wrappers-review`.* **B142 — Single-series charts show a legend that hides all the data.** `BarChart.tsx:29`, `LineChart.tsx:29`: clicking the only entry (e.g. "Movies" on the Dashboard rating chart) empties the chart. *Fix:* legend only when there's more than one dataset. *(Low, H)*

## 3o. Found 2026-11-20 (Batch K review: utils + types, §6 rows 53, 56–61, 75), mostly owned by `fix-utils-types-review`

CR (high) of `statsHelpers.ts`, `chartTheme.ts`, `formatDate.ts`, `languages.ts`, `path.ts`, `poster.ts`, `types/movie.ts`, `slugify.ts` reported 9, all confirmed by reading the code. Nothing in `path.ts`, `poster.ts` or `slugify.ts`. The crash from a row missing its trailing cells (csv-parser omits those keys, and `Release Date` is last) is B129, owned by `fix-movies-views-review`. SR found nothing exploitable: `slugify` maps everything outside `[a-z0-9]` to `-` and only ever gets fixed titles, poster URLs only reach `<img src>` under the CSP, `normalizePath` only highlights nav, all regexes are literals, and `__proto__` keys can't pollute `Object.prototype`. SR noted one functional bug (B151).

- ✅ *Fixed 2026-11-21 by `fix-utils-types-review`.* **B143 — `formatRevenue` shows `$1000K` / `$1000.0M`.** `statsHelpers.ts:118-124` picks the unit before rounding: 999,600 → `$1000K`, 999,960,000 → `$1000.0M`. Seen on the Dashboard total, the revenue slider tooltip and chips. *Fix:* round, then move up a unit. *(Low, H)*
- ✅ *Fixed 2026-11-21 by `fix-utils-types-review`.* **B144 — `makeDoughnut` sets `hoverBackgroundColor`.** `statsHelpers.ts:88`; CLAUDE.md says to leave it unset, and slices get no hover highlight. *(Nit, H)*
- ✅ *Fixed 2026-11-21 by `fix-utils-types-review`.* **B145 — `makePolar` builds fills with `c + 'cc'`.** `statsHelpers.ts:98`; CLAUDE.md says to use `withAlpha`. *(Nit, H)*
- **B146 — Language case/whitespace variants split into separate slices.** `statsHelpers.ts:22` keys single-valued fields by raw value, so `'en'` and `'EN'` / `' en'` are two "English" slices. Only hand-edited rows have them (TMDB sends lowercase ISO). Folding only in the chart would break drill-down count consistency, because the Movies language filter matches exactly. *Fix:* trim + lowercase `Language` in the same row normalisation as B129. **Open, not owned by any change.** *(Nit, M)*
- **B147 — Names that contain a comma are split into fake categories.** `statsHelpers.ts:14`: `MULTI_VALUED_FIELDS` split on every `,` because `catalog-data-format` joins names with `, ` and has no escaping, so a company like "Example Films, Inc." counts as two. *Fix:* a format decision: strip commas from names on import (server + `movie-search.py`) or change the separator. **Open, needs a user decision.** *(Low, M)*
- ✅ *Fixed 2026-11-21 by `fix-utils-types-review`.* **B148 — `formatDateDDMMYYYY` garbles anything that isn't `YYYY-MM-DD`.** `formatDate.ts:2`: `2020-05-12T00:00:00Z` → `12T00:00:00Z-05-2020`. *Fix:* exact match, otherwise show as-is. *(Nit, H)*
- ✅ *Fixed 2026-11-21 by `fix-utils-types-review`.* **B149 — Nothing checks that `CATALOGUE_COLUMNS` lists every `Movie` field.** `types/movie.ts:22`: a field added to `Movie` only compiles and is silently left out of export and new-file headers. *Fix:* `as const satisfies` + a compile-time missing-key check. *(Nit, H)*
- ✅ *Fixed 2026-11-21 by `fix-utils-types-review`.* **B150 — `withAlpha` silently mis-parses anything but `#RRGGBB`.** `chartTheme.ts:27`: `#fff` → `rgba(0, 15, 255, a)`. *Fix:* accept `#RGB`/`#RRGGBB`, throw otherwise. *(Nit, H)*
- ✅ *Fixed 2026-11-21 by `fix-utils-types-review`.* **B151 — `getLanguageName` returns inherited properties.** `languages.ts:44` reads a plain object, so `'constructor'` returns a function. *Fix:* `Object.hasOwn`. *(Nit, H)*

## 3p. Found 2026-11-20 (Batch L review: server tests, §6 rows 62–66, 68, 70, 71), fixed by `fix-server-tests-review` (archived 2026-11-22)

CR (high) of `server/__tests__/*` reported 10, all confirmed by reading the tests and the server code. None is a production bug; `npm run test:server` passes 112/112, and the BOM escape in `helpers.ts` is intact. Nothing in `hosting.test.ts`. SR found nothing: no test file is in `server/tsconfig.json`'s `include` or imported by production code, `fsHooks`/`onBeforeLoad`/`logger`/`tmdb` are `createApp()` options that `server.ts` never sets from a request, keys are placeholders, every TMDB call is stubbed, and every write stays inside a `mkdtemp` folder.

- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B152 — Apostrophe round-trip test never reloads.** `persistence.test.ts:244`: `appendFileSync(path, '')` writes 0 bytes, so the fingerprint doesn't change and the load-time un-escape of a stored `''-ism` is never tested (single-prefix values are covered at `:221`). *Fix:* restart on the same folder. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B153 — "Duplicate caught inside the queue" may never reach the queue.** `persistence.test.ts:114`: `sleep(30)`; if the append lands first, the pre-check (`app.ts:603-605`) returns 409 with no TMDB call, and the test passes even with the in-queue check deleted. *Fix:* a `reached` promise in the stub; assert TMDB was called. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B154 — `armedStat` faults are never checked to have fired.** `hardening.test.ts:259, 310`: the import test passes without testing the failure if stat #4 never happens, and the delete test passes without testing the retry if #2 lands before the read. *Fix:* return `fired` and assert it, plus the retry or the logged failure. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B155 — Deadline test's "shrinking timeouts" check passes with no retry.** `tmdb-client.test.ts:112`: `.every()` on an empty `slice(1)`. *Fix:* `attempts() >= 2`. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B156 — Shutdown only tested with drain finishing last.** `bootstrap.test.ts:103`: dropping `closed` from `Promise.all` (`bootstrap.ts:133`) still passes. *Fix:* add the drain-first case. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B157 — `drain()` test sleeps instead of waiting for the delete.** `hardening.test.ts:216`: `sleep(50)` twice; it fails on a loaded runner. *Fix:* a `reached` promise in the rename hook. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B158 — Failed-write test relies on `chmod`, which root ignores.** `persistence.test.ts:74`: it fails in a root container. *Fix:* fail through `fsHooks` (`rename` + a new `appendFile` hook). *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B159 — Test name claims more than it checks.** `tmdb-client.test.ts:89`: "every attempt … bounded by the deadline" checks one attempt's `instanceof`. *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B160 — Stale comment.** `data-format.test.ts:18` says get-by-id doesn't reload; it does (`reloadForRead`). *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-server-tests-review`.* **B161 — 502 test stubs an error the real client can't throw.** `routes.test.ts:117` uses `new Error('boom')`; use `tmdbError(500)` and a network-error `TmdbRequestError`. *(Nit, H)*

## 3q. Found 2026-11-20 (Batch M review: e2e spec + helpers, §6 rows 67, 73), fixed by `fix-e2e-review` (archived 2026-11-23)

CR (high) of `tests/app.spec.ts` and `tests/helpers.ts` reported 10, all confirmed by reading the specs and the app code. None is a production bug. Already logged and not repeated: B33, B48, B146. No CLAUDE.md rule broken (no `waitForTimeout`, `test` comes from helpers, 65 tests / 13 suites). SR found no current way to write the real catalogue: every spec uses the guarded `page`, spec mocks hand unhandled requests back with `route.fallback()`, `page.request` is only used for `GET /api/movies`, there are no keys and no real TMDB calls, and nothing in `src/` imports `tests/`.

- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B162 — Director/runtime/revenue filter tests check only the chip.** `app.spec.ts:368-395`: removing those filters from `Movies.tsx` keeps all three green. *Fix:* mocked rows + exact `expectTotal`. *(Med, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B163 — "Multiple filters combined" never checks the count.** `app.spec.ts:764-776`: `allInnerTexts()` is read straight away, and an empty table passes the cell loop. *Fix:* compute the AND count, check it's > 0, then `expectTotal`. *(Med, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B164 — The e2e write guard routes only `page`.** `helpers.ts:17`: `page.request`, the `request` fixture and new pages/contexts skip it, and lint only checks the import, while CLAUDE.md says e2e "can never write the real CSV". Nothing misuses it today. *Fix:* `context.route`, a GET-only `request` fixture, and lint bans on `.request` writes and `newContext`. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B165 — `yearSpan()` returns ±Infinity and spreads into `Math.min/max`.** `helpers.ts:174`: the two callers handle a one-year dataset differently (one fails, one skips). *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B166 — `voteBucketCounts()` copies the bucket bounds.** `app.spec.ts:817`: the test drifts if `RATING_BUCKETS` changes. *Fix:* share them via `src/utils/chartBuckets.ts` + `countIntoBuckets`. *(Low, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B167 — Language test counts by display name, while the filter matches the code.** `app.spec.ts:190`: it fails on `'en'`/`'EN'` data (B146). *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B168 — `selectInDrawer(option)` matches by substring.** `helpers.ts:77`: "Drama" can pick "Docudrama". Latent: no caller passes `option`. *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B169 — `chooseOption()` puts the option text unescaped into a CSS selector.** `helpers.ts:94`. *Fix:* `getByTitle(…, { exact: true })`. *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B170 — Two test names claim more than they check.** `app.spec.ts:264` (pagination "functional": visibility only), `:801` ("rating colour": any tag). *(Nit, H)*
- ✅ *Fixed 2026-11-22 by `fix-e2e-review`.* **B171 — Duplicate JSDoc on `paginationTotal()`.** `helpers.ts:104-105`. *(Nit, H)*

## 3r. Found 2026-11-21 (`/code-review` high of the staged 0.11.3–0.11.6 changes), fixed in 0.11.7

CR of the staged diff (Batches D, E, H, J, K fixes) reported 1 important bug and 4 nits, all confirmed and fixed. A `/simplify` pass on the same diff made only quality changes (see CHANGELOG 0.11.7).

- ✅ *Fixed 2026-11-21 (0.11.7).* **B172 — Same-URL nav link still didn't clear a crashed page.** `App.tsx`: React Router makes a `Link` to the current URL a REPLACE, and the B97 fix skipped every REPLACE, so only Stats (whose URL always has `?tab=`) recovered. *Fix:* skip only a REPLACE with the same pathname and a different search (Stats' `?tab=` sync). No e2e: nothing in the app can force a page crash. *(Med, H)*
- ✅ *Fixed 2026-11-21 (0.11.7).* **B173 — A crash caused by a navigation rendered twice.** `ErrorBoundary.tsx`: the error state and the new `resetKey` arrived in the same commit, so `componentDidUpdate` cleared the error at once and the page threw again. *Fix:* store `errorKey` (the key at crash time) via `getDerivedStateFromProps`, and clear only when the key differs from it. *(Nit, H)*
- ✅ *Fixed 2026-11-21 (0.11.7).* **B174 — Hidden-column sort check used `.some`.** `MovieTable.tsx`: antd shows a column if any listed breakpoint matches, so "hidden" means `.every(bp => screens[bp] === false)`. Latent (one breakpoint per column). *(Nit, H)*
- ✅ *Fixed 2026-11-21 (0.11.7).* **B175 — Grid card title read twice.** `MovieCardGrid.tsx`: the `aria-describedby` target contained the title, which is also in `aria-label`. *Fix:* title span `aria-hidden`; e2e asserts the description doesn't contain it. *(Nit, H)*
- ✅ *Fixed 2026-11-21 (0.11.7).* **B176 — Grid tags override the global Tag margin.** `MovieCardGrid.tsx`: `margin: 0` on rating/genre tags goes against CLAUDE.md's "don't re-style tags per call site" (existed before this diff). *Fix (user choice):* keep it, documented in CLAUDE.md as the one exception, since the flex rows space tags with `gap`. *(Nit, H)*

## 3s. Found 2026-11-22 (while applying `fix-e2e-review`)

- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B177 — Typing a language name in the Filters drawer finds nothing.** `FiltersDrawer.tsx`: the Language Select's options are `{ label: getLanguageName(code), value: code }`, and antd's search matches `value` by default, so typing "Tamil" shows "No data" while "ta" works. The Genre and Director options have label = value, so they're unaffected. *Fix:* `optionFilterProp="label"` on the Language Select (and an e2e test that types a name). The e2e `selectInDrawer` helper arrow-keys the virtual list instead of typing for now. *(Low, H)*

## 3t. Found 2026-11-23 (Batch N review: §6 rows 76–81, 83–85), fixed by `fix-batch-n-review` (archived 2026-11-23)

CR (high) of the 9 Batch N modules, read whole (no diff), reported 9; all checked by hand against the code the same day. SR found nothing at ≥ 8 confidence: its only candidate, the formula guard missing tab/CR, scored 3/10 (Excel and LibreOffice with default settings treat a cell with leading whitespace as text; only Google Sheets import with trimming + formula conversion on would run it, and no TMDB field is known to start with a tab). It is B181, fixed as hardening. Rejected by SR: `httpError` text is rendered by React (no XSS), `ChunkErrorBoundary` renders a fixed Alert (no stack leak), header lines at `app.ts:385/:401` are a constant or hand-edited headers.

- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B178 — `ChunkErrorBoundary` treats every error as a failed chunk.** `ChunkErrorBoundary.tsx:21`: a render crash in `MovieDrawer` shows "Couldn't open movie details", swaps in a fresh lazy copy and never reaches the route `ErrorBoundary`; every reopen crashes again. *Fix:* `loadDrawer` wraps an `import()` rejection in `ChunkLoadError`; the boundary handles only that and rethrows anything else from `render`. *(Med, H)*
- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B179 — The drawer retry relies on the browser fetching a failed module again.** `Dashboard.tsx:137`: works in Chromium (e2e), untested in Firefox/Safari, whose module map may cache the rejection. *Fix:* the alert also offers "Reload page". *(Low, M)*
- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B180 — A blank server error shows no message.** `httpError.ts:7`: `serverErrorMessage` returned `''`, which callers' `??` fallback doesn't catch, so Add Movie showed no alert and a failed delete no message. *Fix:* blank text counts as none. *(Low, H)*
- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B181 — Formula guard has no leading tab or CR.** `csvEscape.ts:4`, `catalogue_io.py:31`: OWASP lists both. *Fix:* added to both lists; the real CSV had no `'`+tab/CR cell to misread. *(Low, H; SR 3/10)*
- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B182 — `statsHelpers.test.ts` copied `RATING_BUCKETS`.** Broke the "declare once" rule. *Fix:* imported from `chartBuckets.ts`. *(Nit, H)*
- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B183 — Pointer cursor can stay on a chart that is no longer clickable.** `chartHelpers.ts:43`: latent (no caller toggles `onElementClick`). *Fix:* `NOT_CLICKABLE` `onHover` resets the cursor. *(Nit, H)*
- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B184 — `ChunkErrorBoundary` doc comment said "key it on the lazy component".** The caller keys it on an attempt counter. *(Nit, H)*
- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B185 — No test that the Python and TS formula rules match; the "round trip" test wasn't one.** *Fix:* `test_formula_prefixes_match_typescript`, `tests/unit/csvEscape.test.ts` case table, a real append → read test. *(Nit, H)*
- ✅ *Fixed 2026-11-23 by `fix-batch-n-review`.* **B186 — Backfill "untouched" test relied on `st_mtime_ns`.** A coarse-timestamp filesystem can't show a no-op rewrite. *Fix:* assert `rewrite_catalogue` is never called. *(Nit, H)*

## 3u. Found 2026-11-23 (`/code-review` high of the staged 0.11.8–0.11.11 diff), open

CR of the whole uncommitted diff (Batches F–N fixes plus the `/simplify` pass) reported 7: 1 bug that predates this release, 6 nits. Checked 2026-11-23: B187–B190 and B193 fixed; B191 accepted; B192 still open (design to decide).

- ✅ *Fixed 2026-11-23 (`isClickable` = count > 0 on both).* **B187 — Dashboard trend and rating charts let you click empty years/bars.** `Dashboard.tsx:346, 356`: a zero-filled trend year (or an empty rating bucket) shows the pointer and drills down to an empty Movies list. The Stats charts got `isClickable` (count > 0) in 0.11.9; these two never did. *Fix:* `isClickable={(i) => counts[i] > 0}` on both. *(Low, pre-existing, M)*
- ✅ *Fixed 2026-11-23 (name from `isFiltersActive({ ...filters, search: searchTerm })`).* **B188 — Export filename can disagree with the exported rows.** `Movies.tsx:213`: the name uses `filtersActive` (live `filters.search`) while the rows use the debounced search, so exporting within 300 ms of typing or clearing names the file wrongly. *Fix:* derive the name from the debounced search. *(Nit, M)*
- ✅ *Fixed 2026-11-23.* **B189 — Recent Releases label for an undated movie reads "released , rated …".** `Dashboard.tsx:377`: the aria-label always includes `released ${date}` and `formatDateDDMMYYYY('')` is `''`. *Fix:* omit that part when the date is blank. *(Nit, H)*
- ✅ *Fixed 2026-11-23 (`browser.newPage` banned; computed string access matched).* **B190 — Two gaps in the e2e write-guard lint.** `eslint.config.mjs:90`: `browser.newPage()` opens a fresh, unguarded context and isn't banned, and computed access (`request['post']`) slips past the `no-restricted-syntax` selector. Nothing uses either today. *Fix:* ban `browser.newPage` and match `Literal` property names too. *(Nit, M)*
- **B191 — An old stored `'` + tab/CR cell would lose its apostrophe on load.** `csvEscape.ts:6`: since B181, `unsanitizeCsvValue` treats tab/CR as formula prefixes, so a pre-0.11.11 cell holding a real apostrophe then a tab/CR is un-escaped, and the next delete rewrite persists the change. Accepted in `fix-batch-n-review`'s design (same risk the original guard had for `'=`); the real CSV had 0 such cells on 2026-11-23. *Fix:* none planned; documented here. *(Nit, H)*
- **B192 — A crash while the drawer module evaluates still shows as a connection problem.** `Dashboard.tsx:41`: `loadDrawer` wraps every `import()` rejection in `ChunkLoadError`, including an error thrown by `MovieDrawer.tsx`'s top-level code, so B178's split covers render crashes but not module-evaluation crashes. Matching browser messages was rejected in the design (they differ per browser). *Fix:* to decide, e.g. an e2e test for a module-level throw plus a narrower wrap. *(Nit, M)*
- ✅ *Fixed 2026-11-23: confirmed, rc-slider `allowCross` defaults to `true`; `keepUntouched` now matches by index, then the other bound, each committed bound used once.* **B193 — Crossed slider handles can bring back the rounding B117 fixed.** `RangeSlider.tsx:300`: `keepUntouched` pairs reported values with committed ones by index; if the handles can cross (antd reports sorted values), an untouched bound such as `3.999` can be saved as `4.0`. *Check first* whether antd's range `Slider` allows crossing here. *(Nit, M)*

## 4. Spec scenarios with no test at all

Excludes what `e2e-hardening` already plans (Add/Delete happy path, Stats slider + Reset, PNG download, Dashboard empty state, mobile BottomNav, grid sort).

- **accessible-ui:** bottom nav never appears at 1440px · `/movies/` highlights Movies · navigate away from a crash (no ErrorBoundary test) · empty catalogue count badge shows 0.
- **movie-browsing:** corrupted saved filters · storage blocked · first visit on a light-mode OS (config pins dark) · export after sorting has highest-rated first (current test only checks a download fires) · first movie lacks `Poster URL` but the column is still exported · formula-like title in export · filter change on grid page 3 returns to page 1 · delete from page 3 keeps sort/page · slider drag updates results once.
- **analytics-drilldown:** 90-min runtime boundary · "> 180 min" open bucket · decade click partly outside the year range · "Unknown" bar doesn't navigate · revenue filter excludes unknown revenue · gap year shown as 0 · 7 + "Other" distinct colors.
- **dashboard-layout:** sections in order · Total Movies emphasis · genre slice / year point / recent-release clicks · "Other" slice not clickable.
- **catalog-data-format:** import stores `Production Country`/`Genres` as joined full names, and a missing director as empty (the stub has UK + US, but nothing asserts the stored row) · co-production counts toward each country.
- **catalog-persistence (client):** two imports in flight (per-row spinners) · movie already deleted in another tab (DELETE `404` → drawer closes + refetch).

---

## 5. Owned elsewhere (not repeated here)

| OpenSpec change | Covers |
|---|---|
| ✅ `prod-deploy` (archived 2026-11-04) | prod SPA serving, `trust proxy`, README deployment drift, `public/index.html` |
| ✅ `e2e-hardening` (archived 2026-11-04) | e2e sleeps, unscoped selectors, vacuous tests, `retries`, Add/Delete/slider/PNG/empty-state/BottomNav tests, Python lint |
| ✅ `reduce-bundle-size` (archived 2026-11-05) | `vendor-antd` chunk, `framer-motion` removal, bundle budget |
| ✅ `upgrade-major-deps` (archived 2026-11-06) | antd 6, Vite 8, Express 5, TypeScript 6, concurrently 10; also fixed B1 |
| ✖ `upgrade-typescript-7` (removed 2026-11-14, never started) | TypeScript 7, blocked until typescript-eslint supports it; re-propose once `npm view typescript-eslint peerDependencies` allows 7 |

---

## Suggested grouping for follow-up changes

```
 ┌─ security-and-ci ──────────┐  B1, B2, B38
 ├─ csv-tools-robustness ─────┤  B3, B8, B9, B16          (Python writers + server dup-header guard)
 ├─ unknown-values ───────────┤  B4, B5, B6, B7, B17, B18, B24, B25, B26, B27
 ├─ shell-resilience ─────────┤  B10, B11, B22, B23, B35, B36
 ├─ chart-perf-and-cleanup ───┤  B13, B40, B41
 ├─ movies-page-polish ───────┤  B14, B19, B20, B21, B37
 ├─ a11y-pass-2 ──────────────┤  B12, B28–B34
 └─ unit-tests ───────────────┘  B15 + section 4 gaps
```

---

## 6. Per-module review tracker

Started 2026-11-04. Covers 86 source modules (67 at start, rows 76–80 added 2026-11-21, row 81 2026-11-22, rows 82–85 2026-11-23, row 86 (`EmptyState.tsx`, from the 0.11.11 `/simplify` pass) the same day: `catalogue_io.py`, `csvEscape.ts` and `test_catalogue_io.py` had been missing from the tracker, `chartBuckets.ts` is new in `fix-e2e-review`; plus `hardening.test.ts`, `bootstrap.ts`, `bootstrap.test.ts`, and on 2026-11-06 `hosting.test.ts`, `check-bundle.mjs`, `tests/helpers.ts`, `search.ts`, `slugify.ts`) (`.ts`/`.tsx`/`.py`/`.mjs`, excluding `openspec/`). Tick ☑ when a pass is done and add any new findings as B-IDs above. **CR** = `/code-review <path>` · **SR** = `/security-review`. **Fix** = the pass's findings were verified by hand and fixed: ☑ fixed and its OpenSpec change archived · ◐ fix implemented, change not archived yet · ☐ not yet (or no review yet) · — no findings to fix.

**Progress (2026-11-23):** 85 of 86 modules reviewed (CR + SR) and fully fixed or finding-free; row 86 (`EmptyState.tsx`, a 20-line extraction from the `/simplify` pass) is not reviewed yet. Before Batch N, 76 were: rows 1–75, plus row 82 (`catalogue_io.py`, reviewed in the Batch B re-review, §3f). Batch N (rows 76–81, 83–85, all added or found after the sweep) reviewed 2026-11-23: B178–B186, SR nothing at ≥ 8, fixed by `fix-batch-n-review`, archived 2026-11-23. All 85 modules are now reviewed and fixed. History: rows 1–8, 69, 72 fixed first (rows 4, 5 via `fix-python-csv-writers` + re-review `harden-python-catalogue-io`, both archived 2026-11-14). Batch D (rows 9–16) reviewed 2026-11-20: B94–B101, fixed by `fix-app-shell-review`, archived 2026-11-21. Batch E (rows 17–22) reviewed 2026-11-20: B102–B107, SR found nothing, fixed by `fix-contexts-hooks-review`, archived 2026-11-21. Batch F (rows 23, 33–35) reviewed 2026-11-20: B108–B116, SR found nothing, fixed by `fix-dashboard-review`, archived 2026-11-22 (row 33 had no findings). Batch G (rows 24, 30–32, 54, 55, 74) reviewed 2026-11-20: B117–B123, SR found nothing, fixed by `fix-movies-filtering-review`, archived 2026-11-21. Batch H (rows 26–29, 52) reviewed 2026-11-20: B124–B130 plus older B14/B17/B19/B21/B24/B30/B31/B37, SR found nothing, fixed by `fix-movies-views-review`, archived 2026-11-21. Batch I1 (rows 25, 36–38, 43) reviewed 2026-11-20: B131–B135 plus older B4/B13/B24/B25/B34, SR found nothing, fixed by `fix-stats-review`, archived 2026-11-22 (row 37 had no findings). Batch I2 (rows 39–42) reviewed 2026-11-20: B136–B138 plus older B6/B13/B18 (B17, B119 owned elsewhere; 2 findings rejected), SR found nothing, fixed by `fix-stats-tabs-review`, archived 2026-11-22. Batch J (rows 44–51) reviewed 2026-11-20: B139–B142 plus older B13 (wrapper fix)/B26 (1 finding rejected), SR found nothing, fixed by `fix-chart-wrappers-review`, archived 2026-11-21. Batch K (rows 53, 56–61, 75) reviewed 2026-11-20: B143–B151 (B146/B147 left open; the trailing-cells crash is B129), SR found nothing, fixed by `fix-utils-types-review`, archived 2026-11-21. Batch L (rows 62–66, 68, 70, 71) reviewed 2026-11-20: B152–B161 (tests only, no production bug), SR found nothing, fixed by `fix-server-tests-review`, archived 2026-11-22 (row 71 had no findings). Batch M (rows 67, 73) reviewed 2026-11-20: B162–B171 (tests only), SR found nothing, fixed by `fix-e2e-review`, archived 2026-11-23. All batches reviewed, and all 11 review-fix changes archived (Batches D–M fully fixed; B177, found while applying `fix-e2e-review`, is open in §3s). 2026-11-21 (0.11.7): `/code-review` (high) + `/simplify` of the staged 0.11.3–0.11.6 diff found B172–B176 in rows 10, 14, 28, 29, all fixed in place (§3r); the Fix ticks of those rows stay ☑. Modules added since the sweep are rows 76–81 (Batch N); rows 82–85 were added 2026-11-23. 2026-11-22 (0.11.9): Batches F, I1 and I2 fixed and archived (`fix-dashboard-review`, `fix-stats-review`, `fix-stats-tabs-review`). Before logging a batch's findings, check §1–§3 for an older ID first (Batches D–G re-logged B5, B7, B13, B20, B22, B24, B27, B30). SR reviews pending branch changes, not a path, so it may need a scoped diff or explicit file instructions.

**Batches** (added 2026-11-07): rows stay per-file so ticks stay precise, but review one batch per pass, passing all its paths to `/code-review` so cross-file bugs inside a feature slice get caught. Tick each row the pass covered.

| Batch | Scope | Rows | CR | SR | Fix | Findings · change |
|---|---|---|---|---|---|---|
| A | Server runtime | 1, 2, 3, 69 | ☑ | ☑ | ☑ | B51–B60 · `fix-server-batch-a-review` (archived) |
| B | Python CSV writers | 4, 5, 82 | ☑ | ☑ | ☑ | B61–B67 (+B3/B8/B9) · `fix-python-csv-writers` (archived); re-review B79–B86 · `harden-python-catalogue-io` (archived); follow-up B87–B93 fixed |
| C | Build/lint/test config + bundle check | 6, 7, 8, 72 | ☑ | ☑ | ☑ | B68–B78 (B75 deferred) · `harden-build-test-config` (archived) |
| D | App shell | 9–16 | ☑ | ☑ | ☑ | B94–B101 (B95 = B27) · `fix-app-shell-review` (archived 2026-11-21) |
| E | Contexts + hooks | 17–22 | ☑ | ☑ | ☑ | B102–B107 (dupes of B96, B35; B102 = B22) · `fix-contexts-hooks-review` (archived 2026-11-21) |
| F | Dashboard page + its components | 23, 33, 34, 35 | ☑ | ☑ | ☑ | B108–B116 · `fix-dashboard-review` (archived 2026-11-22; row 33 had no findings) |
| G | Movies page + filtering | 24, 30, 31, 32, 54, 55, 74 | ☑ | ☑ | ☑ | B117–B123 (dupe of B104/B105; B121 already fixed by B129) · `fix-movies-filtering-review` (archived 2026-11-21) |
| H | Movies views + mutations + export | 26, 27, 28, 29, 52 | ☑ | ☑ | ☑ | B124–B130 (+ B14, B17, B19, B21, B24, B30, B31, B37) · `fix-movies-views-review` (archived 2026-11-21) |
| I1 | Stats page, TopNExplorer, ChartBlock, Overview/Explore tabs | 25, 36, 37, 38, 43 | ☑ | ☑ | ☑ | B131–B135 (+ B4, B13, B24, B25, B34) · `fix-stats-review` (archived 2026-11-22; row 37 had no findings) |
| I2 | People/Ratings/Runtime/BoxOffice tabs | 39, 40, 41, 42 | ☑ | ☑ | ☑ | B136–B138 (+ B6, B13, B18) · `fix-stats-tabs-review` (archived 2026-11-22) |
| J | Chart wrappers | 44–51 | ☑ | ☑ | ☑ | B139–B142 (+ B13 wrapper fix, B26) · `fix-chart-wrappers-review` (archived 2026-11-21) |
| K | Remaining utils + types | 53, 56–61, 75 | ☑ | ☑ | ☑ | B143–B151 (B146/B147 open; + B15 part, B129 note) · `fix-utils-types-review` (archived 2026-11-21) |
| L | Server tests | 62–66, 68, 70, 71 | ☑ | ☑ | ☑ | B152–B161 · `fix-server-tests-review` (archived 2026-11-22; row 71 had no findings) |
| M | E2E spec + helpers | 67, 73 | ☑ | ☑ | ☑ | B162–B171 · `fix-e2e-review` (archived 2026-11-23) |
| N | Modules added after the sweep | 76–81, 83–85 | ☑ | ☑ | ☑ | B178–B186 (+ B177) · `fix-batch-n-review` (archived 2026-11-23; rows 76, 79, 85 had no findings) |

### Server (highest security priority)

Row 1 (2026-11-04): CR found 10 (3 were existing B2/B3/B16); SR kept 0 at ≥8 confidence (B2 at 7, CSV-prefix FP at 3). All but the CSV-prefix item fixed by `openspec/changes/harden-catalogue-server`.

Row 2 (2026-11-04): CR found 8 (1 false positive: empty `CLIENT_ORIGIN`; 2 already in `prod-deploy`); SR kept 0 at ≥8 confidence (LAN exposure at 7, DNS rebinding at 3). LAN exposure and B42–B46 fixed by `openspec/changes/harden-server-entry`. New module `server/bootstrap.ts` added as row 69.

Batch A (2026-11-07, rows 1, 2, 3, 69 reviewed together): CR (high) found 10, all confirmed by hand → B51–B60; SR kept 0 at ≥8 confidence (whole-error logging at 2, `TRUST_PROXY=true` at 1, CSV prefix/XSS/CSRF/traversal/SSRF all ≤2). All fixed by `openspec/changes/fix-server-batch-a-review`.

Batch B (2026-11-07, rows 4, 5): CR found 10, all confirmed by hand (3 existing B3/B8/B9, new B61–B67); SR kept 0 at ≥8 confidence. All fixed by `openspec/changes/fix-python-csv-writers`.

Pre-commit review of the 0.11.0 diff (2026-11-07): CR found 10 more in the new code, all fixed before commit. In Python:
- `append_row` no longer overwrites a header-less file.
- Language-filter Next Page now works.
- A busy backfill checkpoint no longer ends the run.
- An unreadable CSV shows a dialog.
- The backfill reports the count of rows actually written.

On the server:
- An abort signal enforces the TMDB deadline.
- BOM/EOL are detected from the load stream.
- An unchanged file skips the read queue.
- The readiness middleware reuses `reloadForRead`.
- Values with a leading apostrophe keep it.

Batch C (2026-11-07, rows 6, 7, 8, 72): CR found 10 (9 confirmed, B75 plausible and deferred) → B68–B77; SR kept 0 at ≥8 confidence, plus one doc note → B78. All but B75 fixed by `openspec/changes/harden-build-test-config`.

| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 1 | `server/app.ts` | A | ☑ | ☑ | ☑ |
| 2 | `server/server.ts` | A | ☑ | ☑ | ☑ |
| 3 | `server/tmdb.ts` (changed in 0.9.2: `TmdbRequestError`) | A | ☑ | ☑ | ☑ |

### Python scripts (write to `src/movies.csv`)
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 4 | `movie-search.py` | B | ☑ | ☑ | ☑ |
| 5 | `backfill_posters.py` | B | ☑ | ☑ | ☑ |
| 82 | `catalogue_io.py` (added 0.11.0 by `fix-python-csv-writers`; tracked 2026-11-23) | B | ☑ | ☑ | ☑ |

### Config
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 6 | `vite.config.ts` | C | ☑ | ☑ | ☑ |
| 7 | `playwright.config.ts` | C | ☑ | ☑ | ☑ |
| 8 | `eslint.config.mjs` | C | ☑ | ☑ | ☑ |

### Frontend: entry / app shell
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 9 | `src/main.tsx` | D | ☑ | ☑ | ☑ |
| 10 | `src/App.tsx` | D | ☑ | ☑ | ☑ |
| 11 | `src/components/Sidebar.tsx` | D | ☑ | ☑ | ☑ |
| 12 | `src/components/TopBar.tsx` | D | ☑ | ☑ | ☑ |
| 13 | `src/components/BottomNav.tsx` | D | ☑ | ☑ | ☑ |
| 14 | `src/components/ErrorBoundary.tsx` | D | ☑ | ☑ | ☑ |
| 15 | `src/components/LoadingError.tsx` | D | ☑ | ☑ | ☑ |
| 16 | `src/components/ScrollToTop.tsx` | D | ☑ | ☑ | ☑ |

### Frontend: contexts / hooks
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 17 | `src/contexts/MoviesContext.tsx` | E | ☑ | ☑ | ☑ |
| 18 | `src/contexts/ThemeContext.tsx` | E | ☑ | ☑ | ☑ |
| 19 | `src/contexts/DrilldownContext.tsx` | E | ☑ | ☑ | ☑ |
| 20 | `src/hooks/useMovies.ts` | E | ☑ | ☑ | ☑ |
| 21 | `src/hooks/useDebounce.ts` | E | ☑ | ☑ | ☑ |
| 22 | `src/hooks/usePersistedFilters.ts` | E | ☑ | ☑ | ☑ |
| 76 | `src/hooks/useLatest.ts` (added 0.11.5 by `fix-chart-wrappers-review`) | N | ☑ | ☑ | ☑ |

### Frontend: pages
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 23 | `src/pages/Dashboard.tsx` | F | ☑ | ☑ | ☑ |
| 24 | `src/pages/Movies.tsx` | G | ☑ | ☑ | ☑ |
| 25 | `src/pages/Stats.tsx` | I1 | ☑ | ☑ | ☑ |

### Frontend: Movies page components (incl. mutations)
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 26 | `src/components/AddMovieModal.tsx` | H | ☑ | ☑ | ☑ |
| 27 | `src/components/MovieDrawer.tsx` | H | ☑ | ☑ | ☑ |
| 28 | `src/components/MovieTable.tsx` | H | ☑ | ☑ | ☑ |
| 29 | `src/components/MovieCardGrid.tsx` | H | ☑ | ☑ | ☑ |
| 30 | `src/components/FiltersDrawer.tsx` | G | ☑ | ☑ | ☑ |
| 31 | `src/components/ActiveFilters.tsx` | G | ☑ | ☑ | ☑ |
| 32 | `src/components/RangeSlider.tsx` | G | ☑ | ☑ | ☑ |
| 33 | `src/components/PosterThumb.tsx` | F | ☑ | ☑ | ☑ |

### Frontend: Dashboard / shared display components
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 34 | `src/components/DashboardSection.tsx` | F | ☑ | ☑ | ☑ |
| 35 | `src/components/StatCard.tsx` | F | ☑ | ☑ | ☑ |
| 36 | `src/components/TopNExplorer.tsx` | I1 | ☑ | ☑ | ☑ |

### Frontend: Stats tabs
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 37 | `src/components/StatsTabs/ChartBlock.tsx` | I1 | ☑ | ☑ | ☑ |
| 38 | `src/components/StatsTabs/OverviewTab.tsx` | I1 | ☑ | ☑ | ☑ |
| 39 | `src/components/StatsTabs/PeopleTab.tsx` | I2 | ☑ | ☑ | ☑ |
| 40 | `src/components/StatsTabs/RatingsTab.tsx` | I2 | ☑ | ☑ | ☑ |
| 41 | `src/components/StatsTabs/RuntimeTab.tsx` | I2 | ☑ | ☑ | ☑ |
| 42 | `src/components/StatsTabs/BoxOfficeTab.tsx` | I2 | ☑ | ☑ | ☑ |
| 43 | `src/components/StatsTabs/ExploreTab.tsx` | I1 | ☑ | ☑ | ☑ |

### Frontend: chart wrappers
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 44 | `src/components/Charts/BarChart.tsx` | J | ☑ | ☑ | ☑ |
| 45 | `src/components/Charts/HorizontalBarChart.tsx` | J | ☑ | ☑ | ☑ |
| 46 | `src/components/Charts/LineChart.tsx` | J | ☑ | ☑ | ☑ |
| 47 | `src/components/Charts/DoughnutChart.tsx` | J | ☑ | ☑ | ☑ |
| 48 | `src/components/Charts/PolarAreaChart.tsx` | J | ☑ | ☑ | ☑ |
| 49 | `src/components/Charts/RadarChart.tsx` | J | ☑ | ☑ | ☑ |
| 50 | `src/components/Charts/MatrixChart.tsx` | J | ☑ | ☑ | ☑ |
| 51 | `src/components/Charts/ScatterChart.tsx` | J | ☑ | ☑ | ☑ |
| 77 | `src/components/Charts/chartHelpers.ts` (added 0.11.5; `useClickHandlers` 0.11.7) | N | ☑ | ☑ | ☑ |

### Frontend: utils / types
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 52 | `src/utils/exportCsv.ts` | H | ☑ | ☑ | ☑ |
| 53 | `src/utils/statsHelpers.ts` | K | ☑ | ☑ | ☑ |
| 54 | `src/utils/filterChips.ts` | G | ☑ | ☑ | ☑ |
| 55 | `src/utils/filterSpans.ts` | G | ☑ | ☑ | ☑ |
| 56 | `src/utils/chartTheme.ts` | K | ☑ | ☑ | ☑ |
| 57 | `src/utils/formatDate.ts` | K | ☑ | ☑ | ☑ |
| 58 | `src/utils/languages.ts` | K | ☑ | ☑ | ☑ |
| 59 | `src/utils/path.ts` | K | ☑ | ☑ | ☑ |
| 60 | `src/utils/poster.ts` | K | ☑ | ☑ | ☑ |
| 61 | `src/types/movie.ts` | K | ☑ | ☑ | ☑ |
| 74 | `src/utils/search.ts` (added 0.10.0: shared Movies search) | G | ☑ | ☑ | ☑ |
| 75 | `src/utils/slugify.ts` (added 0.10.0) | K | ☑ | ☑ | ☑ |
| 78 | `src/utils/httpError.ts` (added 0.11.7 by `/simplify`) | N | ☑ | ☑ | ☑ |
| 79 | `src/utils/vote.ts` (added 0.11.7 by `/simplify`) | N | ☑ | ☑ | ☑ |
| 83 | `src/utils/csvEscape.ts` (added 0.11.0 by B60; tracked 2026-11-23) | N | ☑ | ☑ | ☑ |
| 85 | `src/utils/chartBuckets.ts` (added 0.11.10 by `fix-e2e-review`, B166) | N | ☑ | ☑ | ☑ |
| 86 | `src/components/EmptyState.tsx` (added 0.11.11 by `/simplify`) | N | ☐ | ☐ | — |

### Tests
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 62 | `server/__tests__/helpers.ts` | L | ☑ | ☑ | ☑ |
| 63 | `server/__tests__/routes.test.ts` | L | ☑ | ☑ | ☑ |
| 64 | `server/__tests__/persistence.test.ts` | L | ☑ | ☑ | ☑ |
| 65 | `server/__tests__/data-format.test.ts` | L | ☑ | ☑ | ☑ |
| 66 | `server/__tests__/tmdb-client.test.ts` | L | ☑ | ☑ | ☑ |
| 67 | `tests/app.spec.ts` | M | ☑ | ☑ | ☑ |
| 68 | `server/__tests__/hardening.test.ts` (added 0.9.2) | L | ☑ | ☑ | ☑ |
| 69 | `server/bootstrap.ts` (added by `harden-server-entry`) | A | ☑ | ☑ | ☑ |
| 70 | `server/__tests__/bootstrap.test.ts` (added by `harden-server-entry`) | L | ☑ | ☑ | ☑ |
| 71 | `server/__tests__/hosting.test.ts` (added by `prod-deploy`) | L | ☑ | ☑ | ☑ |
| 72 | `scripts/check-bundle.mjs` (added by `reduce-bundle-size`) | C | ☑ | ☑ | ☑ |
| 73 | `tests/helpers.ts` (added by `e2e-hardening`) | M | ☑ | ☑ | ☑ |
| 80 | `tests/unit/*.test.ts` (added 0.11.3–0.11.8; 8 files with `csvEscape.test.ts`, added by `fix-batch-n-review`) | N | ☑ | ☑ | ☑ |
| 81 | `src/components/ChunkErrorBoundary.tsx` (added by `fix-dashboard-review`, B109) | N | ☑ | ☑ | ☑ |
| 84 | `tests/python/test_catalogue_io.py` (added 0.11.0; tracked 2026-11-23) | N | ☑ | ☑ | ☑ |
