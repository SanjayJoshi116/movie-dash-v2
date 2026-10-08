# Codebase Audit — 2026-10-08

Read-only audit of movie-dash v0.8.0 (`b5da0d6`). Covers server, scripts, CI/config, pages/contexts/utils, components, charts, e2e tests, and the open `refine-app-ui` OpenSpec change. Line numbers are approximate pointers — re-check before editing.

Severity: **High** = broken today / data loss / CI red · **Med** = wrong behavior users will hit · **Low** = polish, a11y, edge cases.

---

## 0. Automated checks (run during audit)

| Check | Result |
|---|---|
| `npm run lint` | ✅ clean |
| `npm run build` | ✅ passes; ⚠ `vendor-antd` chunk 987 kB (>500 kB warning) |
| `npm audit` | ❌ **11 vulns (3 critical, 5 high, 3 moderate)** — incl. `shell-quote` via `concurrently`, `source-map-js`. CI runs `npm audit --audit-level=high` → **CI fails at this step** |
| e2e | ❌ 9+ tests broken by placeholder mismatch (see T1) |
| `npm outdated` | Patch/minor bumps available across the board; majors pending: antd 6, vite 8, express 5, TS 7, framer-motion 14, @vitejs/plugin-react 6 |

---

## 1. Server & data layer (`server/server.ts`, Python scripts)

### High
- **S1 — Stale list after add/delete.** `server.ts:63` sets `Cache-Control: public, max-age=60` on `/api/movies`; `MoviesContext.refetch()` requests the same URL. Browser may serve cached list for up to 60s → imported movie doesn't appear / deleted movie lingers. *Fix:* `no-cache` + ETag, or cache-bust on refetch.
- **S2 — Duplicate-import race.** `/api/tmdb/import` (~276–315) checks for duplicate `Movie ID` *before* two awaited TMDB calls, pushes to memory only *after* append. Double-click / two tabs → duplicate rows in CSV and memory. *Fix:* in-flight ID set + re-check before append.
- **S3 — No write serialization.** Append (`appendMovieToCsv`) and rewrite (`rewriteCsvFile`, fixed `movies.csv.tmp` name) can interleave. Two deletes → second `rename` ENOENT → 500 + memory rollback despite file being correct. Import during delete → appended row overwritten by rename → lost on restart. *Fix:* single async write queue/mutex; unique tmp names.
- **S4 — Server memory vs. external writers.** Server never re-reads the CSV. Rows added by `movie-search.py` / `backfill_posters.py` while the server runs are **wiped by the next in-app delete** (rewrite from memory). Conversely `backfill_posters.py` rewrite drops in-app imports. Header migrations by `movie-search.py` leave server's cached `csvHeaders` stale → misaligned columns. *Fix:* re-read before write / file watch, or document "stop server first".

### Medium
- **S5 — No production SPA serving.** `server:prod` serves only `/api`; no `express.static('dist')` + index fallback. Frontend uses relative `/api` with no configurable base URL, so README's "deploy `dist/` to Vercel/Netlify" setup has no working API.
- **S6 — Import not gated on `ready`.** During boot/after parse error, `movies` is empty (dedupe misses) and `csvHeaders` is empty → `appendMovieToCsv` falls back to `Object.keys(row)` order → columns misaligned in the file.
- **S7 — Append assumes trailing newline.** CSV hand-edited/saved by Excel without final `\n` → new row glued to last row.
- **S8 — UTF-8 BOM not stripped.** Excel-saved CSV → first header `﻿Movie ID` → every row's `Movie ID` undefined → get/delete/dedupe broken.
- **S9 — Server not type-checked in CI.** `npm run build` typechecks `src` only; root tsconfig excludes `server`; `tsx` doesn't typecheck; CI never runs `build:server`.
- **S10 — Unauthenticated mutations exposed on LAN.** `vite.config.ts` `host: true` + proxy forwards `DELETE /api/movies/:id` and import; Express listens on all interfaces. Anyone on the network can delete the catalogue.
- **S11 — Inconsistent CSV writers.** README documents Production Company/Country as first entry (`[0].name`, ISO code `US`); server joins all full country names ("United States of America"); `movie-search.py` writes `"N/A"` where server writes `''`. Same entity splits across chart buckets; numeric parsing sees `"N/A"`.

### Low
- **S12** — Error middleware ignores `err.status` → malformed JSON (400) / oversize body (413) return 500.
- **S13** — Invalid TMDB id (TMDB 404) returns 502; a CSV append failure reports "Failed to import movie from TMDB".
- **S14** — `rewriteCsvFile` re-runs `sanitizeCsvValue` on every row → legit values starting with `-`/`+` (e.g. title "+1") gain a permanent `'` prefix visible in the UI. `escapeCsvField` doesn't quote `\r`.
- **S15** — `backfill_posters.py` `write_csv` and `movie-search.py` column-migration rewrite open the file with `"w"` directly — Ctrl+C mid-checkpoint truncates `src/movies.csv` (README claims "safe to interrupt"). *Fix:* tmp + `os.replace`.
- **S16** — No `app.set('trust proxy', …)` → behind a reverse proxy all clients share one rate-limit bucket.

---

## 2. Pages, contexts, filtering (`src/pages`, `src/contexts`, `src/utils`, `src/hooks`)

### Medium
- **F1 — Refetch wipes page state.** `LoadingError` shows skeleton whenever `loading` is true, and `refetch()` sets `loading=true` → whole page body unmounts on every add/delete: Add Movie modal search results cleared, table page/sort and grid sort reset. *Fix:* skeleton only on initial load (`loading && movies.length === 0`).
- **F2 — Stats drill-downs drop the year scope.** Stats tabs receive year-filtered movies, but every `onElementClick` handler navigates with only genre/director/language/etc. Narrow to 2010–2015, click "Drama" (40) → Movies shows Drama from all years. *Fix:* merge `yearRange` into `presetFilters` (affects Overview, People, Ratings, Runtime, BoxOffice, Explore).
- **F3 — Bucket/filter boundary mismatches.** Charts count half-open buckets, drill-down filters are inclusive:
  - Dashboard rating bars (`floor(v/2)`, skip `v=0`) vs inclusive `voteRange` — "2–4" bar excludes 4.0 but click includes it; "0–2" click includes unrated 0.0 movies.
  - RuntimeTab `[min,max)` vs filter `[min,max]` — a 90-min film counted in 90–120 but also appears in 60–90 drill-down; `[180, 9999]` exceeds the drawer slider max.
  - RatingsTab vote buckets: same overlap.
- **F4 — "Unknown" drill-down returns zero rows.** `groupByField` (`statsHelpers.ts:17`) buckets empty values as `'Unknown'`; clicking that bar (Language in OverviewTab, Director in PeopleTab) filters for literal `'Unknown'` → empty list. *Fix:* skip navigation for `'Unknown'` (RuntimeTab already does this for `'Other'`).
- **F5 — Unknown `?tab=` renders blank.** `Stats.tsx:23-25` passes `?tab=foo` / `location.state.tab` straight to `activeKey` → tab bar with nothing selected, no content. Validate against the 6 keys.
- **F6 — Export ignores sort.** Tooltip says export reflects "search/filters/sort", but `exportMoviesToCsv(filteredMovies)` (`Movies.tsx:~201`) gets the unsorted list; sort state lives inside `MovieTable`/`MovieCardGrid`.
- **F7 — Client CSV export not formula-safe.** `src/utils/exportCsv.ts` lacks the `=`/`+`/`-`/`@` guard the server uses; headers come from `Object.keys(movies[0])` → a column missing on row 0 (e.g. `Poster URL`) is dropped for all rows.
- **F8 — Slider performance.** FiltersDrawer range sliders and Stats year slider fire on every drag tick → sessionStorage write + full refilter, and recompute of every visited Stats tab (Ant keeps panes mounted). Use local state + `onChangeComplete`.

### Low
- **F9** — `usePersistedFilters.ts:12` spreads stored JSON without shape validation; `{"genres":null}` crashes `Movies.tsx` (`.length` of null). Stale directors / out-of-range sliders after data changes silently yield 0 rows.
- **F10** — Missing revenue treated as 0 (passes any range starting at 0) while missing runtime is excluded — inconsistent.
- **F11** — `Dashboard.tsx` (~280, ~338) prints raw `YYYY-MM-DD` dates — violates the CLAUDE.md `formatDateDDMMYYYY` rule. Same in `TopNExplorer` "Most Recent".
- **F12** — Dashboard "last 10 years" trend = last 10 years *with data*; empty years skipped, so the axis/title mislead.
- **F13** — `TopBar.tsx:49-55` nests `<Button>` inside `<a>` (invalid HTML, two tab stops); icon-only buttons lack `aria-label`. Count badge hides at 0 (no `showZero`).
- **F14** — `ThemeContext.tsx` uses `localStorage` without try/catch (blocked storage crashes the app at the provider); ignores `prefers-color-scheme`; context value/`toggleTheme` not memoized.
- **F15** — `MoviesContext.tsx:51` provider value not memoized → every provider render re-renders all consumers.
- **F16** — `App.tsx` first render: `screens.sm` is `undefined` → BottomNav flashes on desktop before Sidebar mounts.
- **F17** — Sidebar/BottomNav active-link matching is exact on `pathname`; `/movies/` highlights nothing.
- **F18** — `ErrorBoundary` "Try Again" re-renders the same failing tree; no `componentDidCatch` logging; `100vh` min-height pushes it below the fold inside the layout.
- **F19** — Arriving at Stats via `location.state.tab` doesn't write `?tab=` until a tab switch → URL copied on arrival opens Overview.
- **F21** — a11y: page-title emoji not `aria-hidden`; Filters badge is a color-only dot with no SR text.

---

## 3. Components & charts (`src/components`)

Chart.js registration in `main.tsx` was verified complete for all wrappers.

### Medium
- **C1 — Money axes show "N/A" at 0.** `formatRevenue(0)` returns `'N/A'` (`statsHelpers.ts:62`) and is used as the tick callback in `HorizontalBarChart` → axis origin reads "N/A" on grossing/budget/profit charts; break-even profit tooltip says "N/A". Reserve "N/A" for missing data.
- **C2 — AddMovieModal search race.** Enter on any input fires a search even while one is in flight; no AbortController / request id → "Alien" results can land after "Aliens".
- **C3 — AddMovieModal single `importingId`.** Concurrent imports share one spinner slot; A's `finally` clears B's spinner; concurrent POSTs feed the server race (S2/S3). Track a Set or disable all Import buttons while importing.
- **C4 — Palette overflow.** `withOther` groups by a count threshold, not a cap → >8 slices in Country/Genre/Company charts repeat colors (breaks CLAUDE.md "≤8 categories" assumption). `OverviewTab.tsx:114` still has the old hardcoded 15-color palette on an uncapped language bar (refine-app-ui task 1.4 missed it).

### Low
- **C5** — `MovieCardGrid` page and sort don't reset when filters change → page 3 of new results.
- **C6** — `TopNExplorer`: ranks 6–10 white text nearly invisible in light mode; Select has no aria-label; "Highest rated" ignores vote count (10/10 with 1 vote ranks first).
- **C7** — `AddMovieModal` `Avatar src` has no error fallback for broken poster URLs (use `PosterThumb`/`POSTER_FALLBACK`); year field not validated client-side ("199" silently returns unfiltered results).
- **C8** — `MovieDrawer` delete: Movie ID not `encodeURIComponent`-ed; if already deleted elsewhere, user gets an error and list never refetches.
- **C9** — `ChartBlock` PNG export has a transparent background → dark-theme exports unreadable.
- **C10** — `MovieTable` `role="button"` on `<tr>` strips row semantics for screen readers.
- **C11** — Bundle: antd vendor chunk ~987 kB; consider per-component imports or further splitting.

---

## 4. Tests & CI

### High
- **T1 — e2e broken by placeholder change.** Tests use `getByPlaceholder('Search by name, director, actor…')`; `Movies.tsx:172` now reads `'…actor, year, language, country…'`. 11 occurrences in `tests/app.spec.ts` time out. `refine-app-ui` task 4.5 is ticked but this is unfixed. *Fix:* shared constant or `aria-label` + `getByRole('textbox', { name })`.
- **T2 — CI audit gate fails.** See §0 — 3 critical / 5 high.

### Medium — coverage gaps (no e2e at all)
Add Movie (search/import) · Delete movie (Popconfirm + refetch) · Stats `?tab=` deep-link & reload persistence · Stats year slider + Reset · any Stats chart drill-down · Dashboard empty state · ChartBlock PNG download · mobile BottomNav · grid sort beyond name · server write paths / TMDB routes (no API tests) · Python scripts not linted.

### Low — flaky / vacuous patterns
- ~14 fixed `waitForTimeout` calls.
- Unscoped selectors (`.ant-select-selector` + `.first()/.last()`, `.ant-badge-count`.first(), `getByText('Total Movies')`) — conflicts with CLAUDE.md's hidden-tab-pane gotcha.
- "Column sorting on Name" actually clicks the first sorter (ID column).
- Two pagination tests assert `≤ pageSize` on already-paginated view → always pass.
- One test silently skips when there's only one page.
- Language/genre filter tests only assert the badge dot, not that results narrowed.
- `playwright.config.ts`: `webServer` waits only on Vite :3000 (not Express :5000); `retries: 1` masks flakes; `reuseExistingServer` can test a stale server.

---

## 5. Documentation drift

- **CLAUDE.md** — says `appendMovieToCsv` "migrates the header if a new column shows up"; it doesn't — unknown fields are silently dropped.
- **README** — "Node 20+ host" vs `engines: >=22.22.0`; "`/movies` sent with Cache-Control" (route is `/api/movies`); dead "Live Demo note" anchor; backend env list omits `TMDB_API_KEY`; Production Company/Country format doesn't match server output (S11); "safe to interrupt" claim for `backfill_posters.py` (S15).
- **OpenSpec `refine-app-ui`** — 17/20 tasks done; remaining 3 are manual QA (2.5 theme check on shell, 4.1 both themes desktop+mobile, 4.2 Dashboard drill-down click-through). Task 4.5 checked despite T1; task 1.4 missed OverviewTab's language palette (C4).

---

## Suggested grouping for follow-up changes

```
 ┌─ fix-ci-green ─────────────┐   T1, T2, S9          (unblocks everything)
 ├─ csv-write-safety ─────────┤   S1–S4, S6–S8, S14, S15, C2, C3
 ├─ drilldown-consistency ────┤   F2, F3, F4, F5, F19, C1
 ├─ prod-deploy ──────────────┤   S5, S10, S16, README drift
 ├─ ux-state-preservation ────┤   F1, F6, F8, F9, C5
 └─ a11y-polish ──────────────┘   F13, F14, F21, C6, C9, C10, F11
```
