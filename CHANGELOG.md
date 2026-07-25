# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] - 2026-07-25

### Added
- `src/pages/Movies.tsx` (`/movies`) — the filterable catalogue split out of `Dashboard`, with a table/grid view toggle (`Segmented`). `src/components/MovieCardGrid.tsx` is the new card-grid view, alongside the existing `MovieTable`.
- Director multi-select filter, runtime range slider, and box-office revenue range slider in `FiltersPanel`, plus removable chips summarizing every active filter. `FilterState` (`src/types/movie.ts`) gained `directors`, `runtimeRange`, `revenueRange`.
- Sidebar gained a "Movies" nav entry; sidebar is now sticky-positioned.
- 6 new Playwright tests (40 → 46) covering the Movies page split, table/grid toggle, and drawer-from-card.

### Changed
- `Dashboard.tsx` (`/`) is now a landing summary — stat cards, top-rated/most-popular/newest highlight cards, and CTA cards to Movies/Stats — instead of hosting the movie table directly.
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
