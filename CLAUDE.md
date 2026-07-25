# CLAUDE.md

Guidance for Claude Code (or any AI agent) working in this repo.

## Stack
- Frontend: React 19, TypeScript, Vite 6, Ant Design v5, Chart.js 4 (+ react-chartjs-2, chartjs-chart-matrix), Framer Motion, React Router v7.
- Backend: Express (TypeScript, run via `tsx`), serves movie data from a local CSV via `csv-parser`.
- Testing: Playwright E2E (`tests/app.spec.ts`, 46 tests, 7 suites).
- Lint: ESLint (`eslint.config.mjs` — typescript-eslint, react-hooks, unused-imports).

## Commands
- `npm run dev` — Vite (port 3000) + Express (port 5000) concurrently.
- `npm run build` — `tsc --noEmit && vite build` (typecheck + production build).
- `npm run lint` — ESLint across the project.
- `npm run test:e2e` — Playwright headless (needs `src/movies.csv` present, see Data below).

## Architecture
- `src/contexts/MoviesContext.tsx` — single source of truth for movie data; fetched once at app root via `useMoviesContext`/`useMovies`. Don't re-fetch per component.
- `src/contexts/ThemeContext.tsx` — light/dark theme, persisted to `localStorage`.
- `src/pages/Dashboard.tsx` (`/`) is a summary landing page (stat cards, highlights, CTAs) — the filterable table/grid catalogue lives at `src/pages/Movies.tsx` (`/movies`). `FilterState` (`src/types/movie.ts`) now also carries `directors`, `runtimeRange`, `revenueRange` alongside search/languages/genres/year/vote. `src/components/MovieCardGrid.tsx` is the card-grid alternative to `MovieTable.tsx`, toggled via `Segmented` on the Movies page.
- `src/components/StatsTabs/*` — one component per Stats tab (Overview, People, Ratings, Runtime, BoxOffice, Explore), composed in `src/pages/Stats.tsx`.
- `src/components/Charts/*` — thin theme-aware wrappers around Chart.js chart types.
- `src/utils/statsHelpers.ts` — `groupByField`, revenue parsing/formatting helpers reused across stat tabs.
- `server/server.ts` — Express API (`/api/health`, `/api/movies`, `/api/movies/:id`), reads `src/movies.csv` on boot, gzip + cache headers. Routes live under `/api` specifically so Vite's dev proxy (`vite.config.ts`, `/api` → `localhost:5000`) can't collide with client-side routes like `/movies` — a bare `/movies` proxy prefix would intercept the browser's page navigation to that route and return raw JSON instead of the SPA.

## Data
- `src/movies.csv` is gitignored and never committed — it's the user's own dataset (TMDB-sourced, see README). It won't exist in a fresh checkout.
- `public/movies.template.csv` is the committed template — copy it to `src/movies.csv` to get a working local dataset (a handful of rows) for dev/testing.
- If `src/movies.csv` is missing, `server/server.ts` degrades gracefully (empty dataset, `ready: true`, no crash) — but Playwright e2e tests hard-require real rows (`tests/app.spec.ts` waits on `.ant-table-row`), so e2e will fail without a populated CSV. `.github/workflows/ci.yml` seeds it from `public/movies.template.csv` before running e2e.
- `movie-search.py` (Tkinter GUI, `pip install -r requirements.txt`) is an optional tool to search TMDB and append rows to `src/movies.csv` directly. It reads `TMDB_API_KEY` from `.env` via `python-dotenv` — never hardcode the key back into the script; `.env` is gitignored, `.env.example` is the committed placeholder. It skips (doesn't update) rows whose `Movie ID` already exists in the CSV.

## CI
- `.github/workflows/ci.yml` runs on push/PR to `main`: `npm ci` → lint → build → seed `src/movies.csv` from `public/movies.template.csv` → `npm run test:e2e`.

## Other repo files
- `LICENSE` — MIT.
- `docs/screenshots/` — images embedded in `README.md`; regenerate with a throwaway Playwright script against a running `npm run dev` if the UI changes meaningfully (see git history for the pattern used).

## Known gotchas
- **StrictMode double-invoke + ref-gated effects.** `React.StrictMode` (enabled in `src/main.tsx`) mounts, cleans up, and remounts effects once in dev. Any effect that uses a ref to skip re-running "if nothing changed" (e.g. the stat-card count-up animation in `src/components/StatsTabs/OverviewTab.tsx`) must reset that ref in its cleanup function, or the synchronous remount will see "unchanged" and silently no-op — intervals/animations get cleared but never restarted. If you add a similar animated-counter or ref-gated effect elsewhere, apply the same pattern: clear the ref in cleanup.
- Don't reintroduce `as any` casts — `eslint.config.mjs` forbids `@typescript-eslint/no-explicit-any`. Use `as unknown as <ConcreteType>` when a third-party type (e.g. `chartjs-chart-matrix`'s `'matrix'` chart type) isn't in the base type registry.
- Ant Design keeps inactive `Tabs` panes mounted (but hidden) by default — a broad selector like `.anticon-info-circle` in a test/script can match hidden elements from other tabs. Scope selectors to `.ant-tabs-tabpane-active` when working within a specific tab.
- **No `@media` queries anywhere in `src/`.** Responsive behavior is driven entirely by Ant Design's `Grid.useBreakpoint()` hook (see `src/App.tsx` — sidebar auto-collapses below the `md` breakpoint, 768px). `eslint-plugin-react-hooks`'s `react-hooks/set-state-in-effect` rule forbids syncing that hook's output into state via `useEffect`; use the render-phase pattern instead (compare current value to a `prevX` state, call `setState` directly in the render body when it differs) — see `App.tsx` for the working example.
