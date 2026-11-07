# Bug Backlog

Last full sweep: **2026-10-28** (v0.9.1, working tree on `main`). Last updated **2026-11-07**, v0.11.0 (Batch A review: B51–B60 added and fixed, §3c, §6 batch column; Batch B review: B61–B67 added and fixed with B3/B8/B9, §3d; Batch C review: B68–B78 added, all but B75 fixed, §3e; §6 Fix column + batch status). Read-only sweep: four parallel reviewers (server/scripts/CI, Movies page, analytics, shell/tests), then a merge pass. Earlier records: `docs/audit-findings-2026-10-08.md` (S/F/C/T IDs) and `docs/review-findings-2026-10-15.md` (R1–R7, all resolved). This file lists only **open** items. Line numbers are pointers, so re-check them before editing.

Severity: **High** = broken today / data loss / security / CI red · **Med** = wrong behavior users will hit · **Low** = polish, a11y, edge cases.
Confidence: **H** = traced through the code and/or reproduced · **M** = needs a specific data shape or environment.

---

## 0. Automated checks (2026-11-06, v0.10.0)

| Check | Result |
|---|---|
| `npm run lint` | ✅ clean |
| `npm run build` | ✅ passes, no chunk-size warning (Vite 8) |
| `npm run check:bundle` | ✅ 361.68 kB gzip landing (budget 400) |
| `npm run type-check` / `type-check:server` | ✅ clean (TypeScript 6.0.3) |
| `npm run test:server` | ✅ 95/95 |
| `npm run test:e2e` | ✅ 64/65 on the last full run; the one failure was B48, fixed after it (affected tests then passed 25/25 over 5 repeats) |
| `npm audit --audit-level=high` | ✅ passes (10 moderate: `minimatch` under typescript-eslint) |

---|---|
| `npm run lint` | ✅ clean |
| `npm run build` | ✅ passes; ⚠ `vendor-antd` chunk >500 kB (owned by `reduce-bundle-size`) |
| `npm run type-check:server` | ✅ clean |
| `npm run test:server` | ✅ 44/44 (62/62 after `harden-catalogue-server`, 2026-11-04) |
| `npm run test:e2e` | ✅ 59/59. Last run was before `DoughnutChart` moved to its in-wrapper compact legend; **re-run before commit** |
| `npm audit --audit-level=high` | ❌ **fails**, so the CI audit step is red again (see B1) |

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

- **B4 — Stats "Movies Released per Year" axis misordered, with an "Unknown" point.** `OverviewTab.tsx:121-122`. `groupByField(…, 'Release Year')` buckets blank years as `'Unknown'`, and the comparator `parseInt(a) - parseInt(b)` returns `NaN` for it. V8's sort then misorders the axis, e.g. `1999 2001 Unknown 1985 2005 2010`. It triggers on the real CSV (16 blank years). *Fix:* drop non-numeric keys before sorting (as Dashboard/RatingsTab do), and zero-fill gap years like the Dashboard trend. *(H, reproduced)*

---

## 2. Medium

### Data quality / "unknown" values
- **B5 — Runtime `0` treated as a real runtime.** TMDB writes `0` for unknown runtimes, and the real CSV has 92 such rows.
  - `Movies.tsx:135-140` excludes only `NaN`, and `filterSpans.ts:21-22` counts `0` in the slider span. So `[0, 90]` and the Runtime tab's "< 60 min" drill-down (`[0, 59]`) list unknown-runtime films.
  - `RuntimeTab.tsx:45-47` ("Avg Vote by Runtime Length") also files runtime 0 under "< 60 min".
  - Dashboard, Overview and the other runtime stats already use `r > 0`.
  - The 0.9.0 "range filters exclude unknown values" fix is therefore incomplete for runtime. *Fix:* `r > 0` everywhere, via a shared `parseRuntime()`. *(H)*
- **B6 — Rating averages include unrated (vote 0) movies.** `RatingsTab.tsx:39,64,89` (genre / language radar / year), `PeopleTab.tsx:37,57` (director / actor) and `RuntimeTab.tsx:47` filter only `!isNaN(v)`. Unrated 0.0 values drag averages down and count toward `MIN_FILMS`: a director with one 8.0 film and one unrated film shows 4.0 and qualifies for "2+ films". This violates "vote 0 = unrated, charts skip them". *Fix:* `v > 0`, via a shared `parseVote()`. *(H)*
- **B7 — Dashboard "Top Rated" highlight has no vote-count floor.** `Dashboard.tsx:144-145`: a 10.0 from one vote wins. `TopNExplorer` already uses `MIN_VOTES_FOR_RATING` (50, with a fallback when <10 qualify). *Fix:* export that rule from one place and reuse it. *(H)*

### Python tools (`movie-search.py`)
- ✅ *Fixed 2026-11-07 by `fix-python-csv-writers`.* **B8 — A failed TMDB fetch still saves an incomplete row, and retry is then blocked.** `movie-search.py:77-105,215-247`. On a network error the fetchers show a dialog and return `{}`/`[]`, but the save continues with empty Genres/Director/Cast/Revenue/Budget/Votes/Poster. `is_duplicate` then refuses a re-add, so the CSV has to be hand-edited. (The server import correctly returns 502 and writes nothing.) *Fix:* fetchers return `None` on failure; skip the append if any fetch failed. *(H)*
- ✅ *Fixed 2026-11-07 by `fix-python-csv-writers`.* **B9 — Append glues the new row onto the last row when the file lacks a trailing newline.** `movie-search.py:156-163`. This is the bug the server fixed as S7, still present in the other writer. *Fix:* check the last byte and write a newline first. Share a helper with B3. *(H)*

### App shell / recovery
- **B10 — A failed lazy-chunk load can't be recovered without a full reload.** `App.tsx:13-14`, `ErrorBoundary.tsx`. `React.lazy` caches the rejected import, so "Try Again" and navigating away and back both re-show "Failed to fetch dynamically imported module". Trigger: restart Vite or deploy new hashed chunks, then open Movies/Stats. *Fix:* reload the page on chunk-load errors, or wrap `lazy` in a retrying loader. *(H)*
- **B11 — ErrorBoundary "Try Again" re-renders before the catalogue reloads.** `ErrorBoundary.tsx` `handleReset`. The accessible-ui spec says retry SHALL reload the catalogue *before* re-rendering. Instead, `onReset()` only schedules `refetch()` and `hasError` clears immediately, so a crash caused by the data recurs, and the user must click again after the fresh data arrives. *Fix:* add a "retrying" state cleared when the refetch settles (have `refetch` return a promise). *(H)*
- **B12 — The Sidebar collapse trigger isn't keyboard-operable.** `Sidebar.tsx:43-46`. Ant's `Sider` trigger is a bare `<div onClick>` with no role, tabIndex or name. Between 576 and 768px the sidebar auto-collapses, and keyboard/SR users can't expand it. *Fix:* `trigger={null}` plus a real `<Button aria-label="Expand sidebar"/"Collapse sidebar">`. *(H)*

### Performance
- **B13 — Chart options memoization defeated by inline callbacks.** The wrappers list `onElementClick`/`isClickable` as `useMemo` deps, but callers pass fresh functions every render (`Dashboard.tsx:204-221,311`, `OverviewTab.tsx:137-147,207,210`, every tab's `handleXClick`, every inline `isClickable`). Each parent render then rebuilds the options, and react-chartjs-2 5.3 calls `chart.update()`. Examples:
  - OverviewTab's count-up animation re-renders every ~10–20 ms for ~1 s, so both Overview charts update ~100× and stutter.
  - Opening the MovieDrawer on the Dashboard updates every chart.

  This contradicts CLAUDE.md's memoization claim. *Fix:* the wrappers keep the callbacks in a ref and drop them from the deps (one change for all charts), rather than adding `useCallback` at every site. *(H)*

### Export
- **B14 — Export CSV has no UTF-8 BOM, so Excel garbles non-ASCII text.** `exportCsv.ts:38-39`. Excel on Windows opens a BOM-less CSV in the ANSI codepage, so "Amélie" etc. come out garbled (150 of 1,961 real rows). *Fix:* prepend `String.fromCharCode(0xFEFF)`, built that way per the CLAUDE.md BOM gotcha. The server loader already strips it on re-import. *(H)*

### Tests
- **B15 — No frontend unit tests.** The pure logic the specs depend on is reachable only through e2e, and mostly untested there:
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
- **B17 — Unguarded `.split` can crash a whole Stats tab.** `PeopleTab.tsx:24,75` and `ExploreTab.tsx:35,60` call `m['Actors/Actresses'].split` / `m.Genres.split` directly. csv-parser omits keys on short rows, and import drops fields that have no column. The resulting TypeError goes to the ErrorBoundary. *Fix:* `(m[field] ?? '').split`, or route all counting through `groupByField` (add `Actors/Actresses` to `MULTI_VALUED_FIELDS`). *(M)*
- **B18 — Language radar can plot a fake 0.0 "Unknown" spoke.** `RatingsTab.tsx:71-73`: `top8` includes `'Unknown'` but `sums` keys only truthy languages. *Fix:* filter with `isDrillableLabel`. *(H, needs rows with empty Language)*
- **B19 — Delete still in flight acts on a different movie's drawer.** `MovieDrawer.tsx:31-60`. `deleting` isn't reset when the movie changes. Repro: confirm Delete on A, close the drawer, open B → B shows a spinner, then A's completion closes B's drawer (or shows A's error in it). *Fix:* capture the id at call time and act only if it still matches; reset `deleting` in the `lastMovieId` render-phase block. *(H)*
- **B20 — Search isn't trimmed or accent-folded.** `Movies.tsx:93-98`: "nolan " (trailing space) finds nothing, whitespace-only text turns on the chip and "Filters, active", and "amelie" ≠ "Amélie". *Fix:* `.trim()` for matching and the active check; optionally NFD-normalize both sides. *(H)*
- **B21 — Hidden responsive column keeps sorting the export.** `MovieTable.tsx:70-147`. Sort by Genres/Actors at ≥992px, then narrow the window: Ant drops the hidden column's sort from the screen, but `sortedMovies` (and Export) keep it, and the sort silently returns when the window widens. *Fix:* clear `sort` when its column isn't visible at the current breakpoint, or drop `responsive` from sortable columns. *(M)*
- **B22 — `ThemeContext` saves the OS-derived default on first render, so later OS theme changes are never followed.** `ThemeContext.tsx:39-44`. *Fix:* persist only in `toggleTheme`; optionally listen to `matchMedia` while nothing is saved. *(H)*
- **B23 — The outer ErrorBoundary can't recover.** `main.tsx:50-54`. It sits outside Router/Theme/ConfigProvider with no `onReset`. A crash in TopBar/Sidebar/a provider shows an unthemed fallback on a white body with no nav, and "Try Again" re-renders the same tree. *Fix:* make its action `location.reload()`. *(H)*

### Display of missing values
- **B24 — Blank/zero values render as junk.**
  - `MovieDrawer.tsx:151,155,179-180` shows "Release  ()" for 16 blank-date rows, "0 mins" for 92 unknown runtimes, and a red "⭐ 0" for 303 unrated movies.
  - `MovieCardGrid.tsx:140,157` shows " · English" and "0 mins".
  - `Dashboard.tsx:353` Recent Releases shows "⭐ 0" / "⭐ ".
  - Stats Overview shows Earliest/Latest Release "0" when the year scope is empty (`OverviewTab.tsx:74-75`).

  *Fix:* render "—" or omit the field when it's blank/≤0; reuse the grid's `vote > 0` guard. *(H)*
- **B25 — Stats has no empty state.** `Stats.tsx`. With an empty catalogue, or a year scope with no releases, the slider reads "1900 – 2026 · 0 movies" and the tabs show zeros. The Dashboard has an `Empty` state for this. *(H)*
- **B26 — Count tooltips show 2 decimals.** `HorizontalBarChart.tsx:92` uses `raw.toFixed(2)` when there's no `formatValue`: "Appearances: 5.00", "142.00 mins". *Fix:* print integers as-is. *(H)*
- **B27 — TopBar count badge shows "0 movies" after a failed first load.** `TopBar.tsx:32-49`. The count is unknown, not zero. *Fix:* hide it or show "–" when `error` is set. *(H)*

### Accessibility
- **B28 — Filter chips can't be removed from the keyboard, and every close icon is named "Close".** `ActiveFilters.tsx:20`. The Ant `Tag` close icon is `tabIndex=-1`. *Fix:* a focusable close button with `aria-label="Remove <chip>"`. *(H)*
- **B29 — Range slider handles have no accessible name.** `FiltersDrawer.tsx:141-179`, `RangeSlider.tsx:28`: 8 unnamed `role="slider"` handles. *Fix:* `ariaLabelForHandle` / `ariaLabelledByForHandle`. *(H)*
- **B30 — `aria-label` overrides hide visible data.**
  - `StatCard.tsx` ("Total Box Office: view details", so the amount is never read).
  - Dashboard highlight cards and Recent Releases items (drop the category, rating and date).
  - `MovieCardGrid.tsx:107-109` (`role="button"` + label means grid cards announce only the title; grid is the default view on mobile).

  *Fix:* include the values in the name, use `aria-describedby`, or use a real `<button>` on the title as `MovieTable` does. *(H)*
- **B31 — MovieDrawer heading reads its 🎬 emoji.** `MovieDrawer.tsx:83`. This was missed by the 0.9.0 emoji sweep. *Fix:* `<span aria-hidden="true">`. *(H)*
- **B32 — No `<nav>` landmark on desktop.** `Sidebar.tsx`. `Sider` is an `<aside>` and Ant `Menu` is `role="menu"`, while the mobile `BottomNav` is a `<nav>`. *Fix:* wrap the menu in `<nav aria-label="Main">`. *(H)*
- **B33 — `document.title` never changes and route changes aren't announced.** Every route, including 404, is titled "MovieDash". Focus stays on the nav link, and the 404 `Result` title isn't a heading. The e2e test "page title updates on navigation" only checks in-page headings, so its name is misleading. *Fix:* per-page `document.title`; move focus to the page `<h1>` on pathname change. *(H)*
- **B34 — Low-contrast light-theme text in TopNExplorer.** `TopNExplorer.tsx:246,263,322` uses a hardcoded `rgba(30,30,63,0.45)` (≈2.9:1). This is the same faintness the file's own comment rejects for ranks 6–10. *Fix:* `var(--text-secondary)`. *(M)*

### Visual / platform
- **B35 — White flash before first paint and light browser chrome in dark theme.** `index.html`/`index.css`: no pre-hydration `data-theme`, no `body` background, no `color-scheme`. Dark users see a white page while the bundle loads, white overscroll, and light native scrollbars in Firefox. *Fix:* inline theme script, `body` background, `color-scheme` per theme. *(H)*
- **B36 — Create React App leftovers.** `public/favicon.ico` is the stock React logo; `manifest.json` ("Create React App Sample"), `logo192.png` and `logo512.png` aren't referenced anywhere. `prod-deploy` task 4.1 removes only `public/index.html`. *Fix:* fold them into that cleanup. *(H)*
- **B37 — Add Movie keeps showing "Added" for a movie deleted afterwards.** `AddMovieModal.tsx:81,150` (modal stays mounted). *Fix:* derive "added" from the current catalogue instead of local state. *(H)*

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

## 4. Spec scenarios with no test at all

Excludes what `e2e-hardening` already plans (Add/Delete happy path, Stats slider + Reset, PNG download, Dashboard empty state, mobile BottomNav, grid sort).

- **accessible-ui:** bottom nav never appears at 1440px · `/movies/` highlights Movies · navigate away from a crash (no ErrorBoundary test) · empty catalogue count badge shows 0.
- **movie-browsing:** corrupted saved filters · storage blocked · first visit on a light-mode OS (config pins dark) · export after sorting has highest-rated first (current test only checks a download fires) · first movie lacks `Poster URL` but the column is still exported · formula-like title in export · filter change on grid page 3 returns to page 1 · delete from page 3 keeps sort/page · slider drag updates results once.
- **analytics-drilldown:** 90-min runtime boundary · "> 180 min" open bucket · decade click partly outside the year range · "Unknown" bar doesn't navigate · revenue filter excludes unknown revenue · gap year shown as 0 · 7 + "Other" distinct colors.
- **dashboard-layout:** sections in order · Total Movies emphasis · genre slice / year point / recent-release clicks · "Other" slice not clickable.
- **catalog-data-format:** import stores `Production Country`/`Genres` as joined full names, and a missing director as empty (the stub has UK + US, but nothing asserts the stored row) · co-production counts toward each country.
- **catalog-persistence (client):** rapid successive searches (out-of-order responses) · two imports in flight (per-row spinners) · movie already deleted in another tab (DELETE `404` → drawer closes + refetch).

---

## 5. Owned elsewhere (not repeated here)

| OpenSpec change | Covers |
|---|---|
| ✅ `prod-deploy` (archived 2026-11-04) | prod SPA serving, `trust proxy`, README deployment drift, `public/index.html` |
| ✅ `e2e-hardening` (archived 2026-11-04) | e2e sleeps, unscoped selectors, vacuous tests, `retries`, Add/Delete/slider/PNG/empty-state/BottomNav tests, Python lint |
| ✅ `reduce-bundle-size` (archived 2026-11-05) | `vendor-antd` chunk, `framer-motion` removal, bundle budget |
| ✅ `upgrade-major-deps` (archived 2026-11-06) | antd 6, Vite 8, Express 5, TypeScript 6, concurrently 10; also fixed B1 |
| `upgrade-typescript-7` (0/7, parked) | TypeScript 7, blocked until typescript-eslint supports it |

---|---|
| `prod-deploy` (0/15) | prod SPA serving, `trust proxy`, README deployment drift, `public/index.html` (LAN exposure S10 moved to `harden-server-entry`, fixed) |
| `e2e-hardening` (0/22) | e2e sleeps, unscoped selectors, vacuous tests, `retries`, missing Add/Delete/slider/PNG/empty-state/BottomNav tests, Python lint |
| `reduce-bundle-size` (0/15) | `vendor-antd` chunk, `framer-motion` removal, bundle budget |
| `upgrade-major-deps` (0/25) | antd 6, vite 8, express 5, TS 7, … (may also absorb part of B1) |

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

Started 2026-11-04. Covers 75 source modules (67 at start, plus `hardening.test.ts`, `bootstrap.ts`, `bootstrap.test.ts`, and on 2026-11-06 `hosting.test.ts`, `check-bundle.mjs`, `tests/helpers.ts`, `search.ts`, `slugify.ts`) (`.ts`/`.tsx`/`.py`/`.mjs`, excluding `openspec/`). Tick ☑ when a pass is done and add any new findings as B-IDs above. **CR** = `/code-review <path>` · **SR** = `/security-review`. **Fix** = the pass's findings were verified by hand and fixed: ☑ fixed and its OpenSpec change archived · ◐ fix implemented, change not archived yet · ☐ not yet (or no review yet).

**Progress (2026-11-07):** 10 of 75 modules reviewed (CR + SR): 8 fully fixed (rows 1, 2, 3, 6, 7, 8, 69, 72), 2 awaiting archive (rows 4, 5: `fix-python-csv-writers`, manual GUI check open). Next: Batch D. SR reviews pending branch changes, not a path, so it may need a scoped diff or explicit file instructions.

**Batches** (added 2026-11-07): rows stay per-file so ticks stay precise, but review one batch per pass, passing all its paths to `/code-review` so cross-file bugs inside a feature slice get caught. Tick each row the pass covered.

| Batch | Scope | Rows | CR | SR | Fix | Findings · change |
|---|---|---|---|---|---|---|
| A | Server runtime | 1, 2, 3, 69 | ☑ | ☑ | ☑ | B51–B60 · `fix-server-batch-a-review` (archived) |
| B | Python CSV writers | 4, 5 | ☑ | ☑ | ◐ | B61–B67 (+B3/B8/B9) · `fix-python-csv-writers` (manual GUI check open) |
| C | Build/lint/test config + bundle check | 6, 7, 8, 72 | ☑ | ☑ | ☑ | B68–B78 (B75 deferred) · `harden-build-test-config` (archived) |
| D | App shell | 9–16 | ☐ | ☐ | ☐ |  |
| E | Contexts + hooks | 17–22 | ☐ | ☐ | ☐ |  |
| F | Dashboard page + its components | 23, 33, 34, 35 | ☐ | ☐ | ☐ |  |
| G | Movies page + filtering | 24, 30, 31, 32, 54, 55, 74 | ☐ | ☐ | ☐ |  |
| H | Movies views + mutations + export | 26, 27, 28, 29, 52 | ☐ | ☐ | ☐ |  |
| I1 | Stats page, TopNExplorer, ChartBlock, Overview/Explore tabs | 25, 36, 37, 38, 43 | ☐ | ☐ | ☐ |  |
| I2 | People/Ratings/Runtime/BoxOffice tabs | 39, 40, 41, 42 | ☐ | ☐ | ☐ |  |
| J | Chart wrappers | 44–51 | ☐ | ☐ | ☐ |  |
| K | Remaining utils + types | 53, 56–61, 75 | ☐ | ☐ | ☐ |  |
| L | Server tests | 62–66, 68, 70, 71 | ☐ | ☐ | ☐ |  |
| M | E2E spec + helpers | 67, 73 | ☐ | ☐ | ☐ |  |

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
| 4 | `movie-search.py` | B | ☑ | ☑ | ◐ |
| 5 | `backfill_posters.py` | B | ☑ | ☑ | ◐ |

### Config
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 6 | `vite.config.ts` | C | ☑ | ☑ | ☑ |
| 7 | `playwright.config.ts` | C | ☑ | ☑ | ☑ |
| 8 | `eslint.config.mjs` | C | ☑ | ☑ | ☑ |

### Frontend: entry / app shell
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 9 | `src/main.tsx` | D | ☐ | ☐ | ☐ |
| 10 | `src/App.tsx` | D | ☐ | ☐ | ☐ |
| 11 | `src/components/Sidebar.tsx` | D | ☐ | ☐ | ☐ |
| 12 | `src/components/TopBar.tsx` | D | ☐ | ☐ | ☐ |
| 13 | `src/components/BottomNav.tsx` | D | ☐ | ☐ | ☐ |
| 14 | `src/components/ErrorBoundary.tsx` | D | ☐ | ☐ | ☐ |
| 15 | `src/components/LoadingError.tsx` | D | ☐ | ☐ | ☐ |
| 16 | `src/components/ScrollToTop.tsx` | D | ☐ | ☐ | ☐ |

### Frontend: contexts / hooks
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 17 | `src/contexts/MoviesContext.tsx` | E | ☐ | ☐ | ☐ |
| 18 | `src/contexts/ThemeContext.tsx` | E | ☐ | ☐ | ☐ |
| 19 | `src/contexts/DrilldownContext.tsx` | E | ☐ | ☐ | ☐ |
| 20 | `src/hooks/useMovies.ts` | E | ☐ | ☐ | ☐ |
| 21 | `src/hooks/useDebounce.ts` | E | ☐ | ☐ | ☐ |
| 22 | `src/hooks/usePersistedFilters.ts` | E | ☐ | ☐ | ☐ |

### Frontend: pages
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 23 | `src/pages/Dashboard.tsx` | F | ☐ | ☐ | ☐ |
| 24 | `src/pages/Movies.tsx` | G | ☐ | ☐ | ☐ |
| 25 | `src/pages/Stats.tsx` | I1 | ☐ | ☐ | ☐ |

### Frontend: Movies page components (incl. mutations)
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 26 | `src/components/AddMovieModal.tsx` | H | ☐ | ☐ | ☐ |
| 27 | `src/components/MovieDrawer.tsx` | H | ☐ | ☐ | ☐ |
| 28 | `src/components/MovieTable.tsx` | H | ☐ | ☐ | ☐ |
| 29 | `src/components/MovieCardGrid.tsx` | H | ☐ | ☐ | ☐ |
| 30 | `src/components/FiltersDrawer.tsx` | G | ☐ | ☐ | ☐ |
| 31 | `src/components/ActiveFilters.tsx` | G | ☐ | ☐ | ☐ |
| 32 | `src/components/RangeSlider.tsx` | G | ☐ | ☐ | ☐ |
| 33 | `src/components/PosterThumb.tsx` | F | ☐ | ☐ | ☐ |

### Frontend: Dashboard / shared display components
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 34 | `src/components/DashboardSection.tsx` | F | ☐ | ☐ | ☐ |
| 35 | `src/components/StatCard.tsx` | F | ☐ | ☐ | ☐ |
| 36 | `src/components/TopNExplorer.tsx` | I1 | ☐ | ☐ | ☐ |

### Frontend: Stats tabs
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 37 | `src/components/StatsTabs/ChartBlock.tsx` | I1 | ☐ | ☐ | ☐ |
| 38 | `src/components/StatsTabs/OverviewTab.tsx` | I1 | ☐ | ☐ | ☐ |
| 39 | `src/components/StatsTabs/PeopleTab.tsx` | I2 | ☐ | ☐ | ☐ |
| 40 | `src/components/StatsTabs/RatingsTab.tsx` | I2 | ☐ | ☐ | ☐ |
| 41 | `src/components/StatsTabs/RuntimeTab.tsx` | I2 | ☐ | ☐ | ☐ |
| 42 | `src/components/StatsTabs/BoxOfficeTab.tsx` | I2 | ☐ | ☐ | ☐ |
| 43 | `src/components/StatsTabs/ExploreTab.tsx` | I1 | ☐ | ☐ | ☐ |

### Frontend: chart wrappers
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 44 | `src/components/Charts/BarChart.tsx` | J | ☐ | ☐ | ☐ |
| 45 | `src/components/Charts/HorizontalBarChart.tsx` | J | ☐ | ☐ | ☐ |
| 46 | `src/components/Charts/LineChart.tsx` | J | ☐ | ☐ | ☐ |
| 47 | `src/components/Charts/DoughnutChart.tsx` | J | ☐ | ☐ | ☐ |
| 48 | `src/components/Charts/PolarAreaChart.tsx` | J | ☐ | ☐ | ☐ |
| 49 | `src/components/Charts/RadarChart.tsx` | J | ☐ | ☐ | ☐ |
| 50 | `src/components/Charts/MatrixChart.tsx` | J | ☐ | ☐ | ☐ |
| 51 | `src/components/Charts/ScatterChart.tsx` | J | ☐ | ☐ | ☐ |

### Frontend: utils / types
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 52 | `src/utils/exportCsv.ts` | H | ☐ | ☐ | ☐ |
| 53 | `src/utils/statsHelpers.ts` | K | ☐ | ☐ | ☐ |
| 54 | `src/utils/filterChips.ts` | G | ☐ | ☐ | ☐ |
| 55 | `src/utils/filterSpans.ts` | G | ☐ | ☐ | ☐ |
| 56 | `src/utils/chartTheme.ts` | K | ☐ | ☐ | ☐ |
| 57 | `src/utils/formatDate.ts` | K | ☐ | ☐ | ☐ |
| 58 | `src/utils/languages.ts` | K | ☐ | ☐ | ☐ |
| 59 | `src/utils/path.ts` | K | ☐ | ☐ | ☐ |
| 60 | `src/utils/poster.ts` | K | ☐ | ☐ | ☐ |
| 61 | `src/types/movie.ts` | K | ☐ | ☐ | ☐ |
| 74 | `src/utils/search.ts` (added 0.10.0: shared Movies search) | G | ☐ | ☐ | ☐ |
| 75 | `src/utils/slugify.ts` (added 0.10.0) | K | ☐ | n/a (pure string helper) | ☐ |

### Tests
| # | Module | Batch | CR | SR | Fix |
|---|---|---|---|---|---|
| 62 | `server/__tests__/helpers.ts` | L | ☐ | ☐ | ☐ |
| 63 | `server/__tests__/routes.test.ts` | L | ☐ | ☐ | ☐ |
| 64 | `server/__tests__/persistence.test.ts` | L | ☐ | ☐ | ☐ |
| 65 | `server/__tests__/data-format.test.ts` | L | ☐ | ☐ | ☐ |
| 66 | `server/__tests__/tmdb-client.test.ts` | L | ☐ | ☐ | ☐ |
| 67 | `tests/app.spec.ts` | M | ☐ | ☐ | ☐ |
| 68 | `server/__tests__/hardening.test.ts` (added 0.9.2) | L | ☐ | n/a (test-only) | ☐ |
| 69 | `server/bootstrap.ts` (added by `harden-server-entry`) | A | ☑ | ☑ | ☑ |
| 70 | `server/__tests__/bootstrap.test.ts` (added by `harden-server-entry`) | L | ☐ | n/a (test-only) | ☐ |
| 71 | `server/__tests__/hosting.test.ts` (added by `prod-deploy`) | L | ☐ | n/a (test-only) | ☐ |
| 72 | `scripts/check-bundle.mjs` (added by `reduce-bundle-size`) | C | ☑ | ☑ | ☑ |
| 73 | `tests/helpers.ts` (added by `e2e-hardening`) | M | ☐ | n/a (test-only) | ☐ |
