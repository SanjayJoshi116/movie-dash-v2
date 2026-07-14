# CLAUDE.md

Guidance for Claude Code (or any AI agent) working in this repo.

## Stack
- Frontend: React 19, TypeScript, Vite 6, Ant Design v5, Chart.js 4 (+ react-chartjs-2, chartjs-chart-matrix), Framer Motion, React Router v7.
- Backend: Express (TypeScript, run via `tsx`), serves movie data from a local CSV via `csv-parser`.
- Testing: Playwright E2E (`tests/app.spec.ts`, 40 tests, 7 suites).
- Lint: ESLint (`eslint.config.mjs` — typescript-eslint, react-hooks, unused-imports).

## Commands
- `npm run dev` — Vite (port 3000) + Express (port 5000) concurrently.
- `npm run build` — `tsc --noEmit && vite build` (typecheck + production build).
- `npm run lint` — ESLint across the project.
- `npm run test:e2e` — Playwright headless (needs `src/movies.csv` present, see Data below).

## Architecture
- `src/contexts/MoviesContext.tsx` — single source of truth for movie data; fetched once at app root via `useMoviesContext`/`useMovies`. Don't re-fetch per component.
- `src/contexts/ThemeContext.tsx` — light/dark theme, persisted to `localStorage`.
- `src/components/StatsTabs/*` — one component per Stats tab (Overview, People, Ratings, Runtime, BoxOffice, Explore), composed in `src/pages/Stats.tsx`.
- `src/components/Charts/*` — thin theme-aware wrappers around Chart.js chart types.
- `src/utils/statsHelpers.ts` — `groupByField`, revenue parsing/formatting helpers reused across stat tabs.
- `server/server.ts` — Express API (`/health`, `/movies`, `/movies/:id`), reads `src/movies.csv` on boot, gzip + cache headers.

## Data
- `src/movies.csv` is gitignored and never committed — it's the user's own dataset (TMDB-sourced, see README). It won't exist in a fresh checkout.
- `public/movies.template.csv` is the committed template — copy it to `src/movies.csv` to get a working local dataset (a handful of rows) for dev/testing.
- If `src/movies.csv` is missing, `server/server.ts` degrades gracefully (empty dataset, `ready: true`, no crash) — but Playwright e2e tests hard-require real rows (`tests/app.spec.ts` waits on `.ant-table-row`), so e2e will fail without a populated CSV. Don't add e2e to CI without a committed fixture dataset.

## Known gotchas
- **StrictMode double-invoke + ref-gated effects.** `React.StrictMode` (enabled in `src/main.tsx`) mounts, cleans up, and remounts effects once in dev. Any effect that uses a ref to skip re-running "if nothing changed" (e.g. the stat-card count-up animation in `src/components/StatsTabs/OverviewTab.tsx`) must reset that ref in its cleanup function, or the synchronous remount will see "unchanged" and silently no-op — intervals/animations get cleared but never restarted. If you add a similar animated-counter or ref-gated effect elsewhere, apply the same pattern: clear the ref in cleanup.
- Don't reintroduce `as any` casts — `eslint.config.mjs` forbids `@typescript-eslint/no-explicit-any`. Use `as unknown as <ConcreteType>` when a third-party type (e.g. `chartjs-chart-matrix`'s `'matrix'` chart type) isn't in the base type registry.
- Ant Design keeps inactive `Tabs` panes mounted (but hidden) by default — a broad selector like `.anticon-info-circle` in a test/script can match hidden elements from other tabs. Scope selectors to `.ant-tabs-tabpane-active` when working within a specific tab.
