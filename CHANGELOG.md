# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
