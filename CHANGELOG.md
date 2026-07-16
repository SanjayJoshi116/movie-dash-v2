# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-07-16

### Added
- `LICENSE` — MIT.
- `.github/workflows/ci.yml` — GitHub Actions CI: lint, build, and Playwright e2e (seeded from `public/movies.template.csv`) on push/PR to `main`.
- `docs/screenshots/` — dashboard, stats overview, movie drawer, and mobile screenshots, embedded in `README.md`.
- `engines.node` (`>=20`) in `package.json`.
- README overhaul: real CI/license badges, Highlights section, screenshots, no-hosted-demo note, `src/` vs `public/` rationale for `movies.csv`, TMDB attribution note, corrected `movie-search.py` duplicate-handling docs (skips, doesn't update), grouped Scripts table, architecture diagram, documented API error responses (`404`/`503`), Performance/Deployment/Contributing/Roadmap sections.

### Known issues
- `npm run lint` fails on pre-existing `@typescript-eslint/no-explicit-any` errors in `src/components/Charts/MatrixChart.tsx` — predates this release, not yet fixed; the new CI workflow's lint step will be red until addressed.

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
