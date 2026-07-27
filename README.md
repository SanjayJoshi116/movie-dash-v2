# MovieDash v2

A full-stack movie analytics dashboard: a React frontend backed by an Express API, serving data from a local CSV. Browse, filter, and explore a movie dataset through an interactive table and rich statistics visualisations — with a light/dark theme toggle.

[![CI](https://github.com/SanjayJoshi116/movie-dash-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/SanjayJoshi116/movie-dash-v2/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/SanjayJoshi116/movie-dash-v2)](./LICENSE)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)
![Ant Design](https://img.shields.io/badge/Ant%20Design-5.24-1677ff)

**Highlights:** Table/grid movie catalogue with poster art · 6 analytics tabs · mobile bottom nav · hardened Express API (helmet, rate limiting, CORS allowlist) with gzip + caching · CSV export · 47 Playwright E2E tests · light/dark theme · filter state persisted per-session

No hosted demo — this project runs locally against your own CSV dataset. See [Getting Started](#getting-started).

---

## Screenshots

| Dashboard | Statistics |
|---|---|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Statistics Overview](./docs/screenshots/stats-overview.png) |

| Movie Detail Drawer | Mobile |
|---|---|
| ![Movie drawer](./docs/screenshots/movie-drawer.png) | ![Mobile view](./docs/screenshots/mobile.png) |

---

## Features

Dashboard, Movies, and Statistics are split into separate pages (`/`, `/movies`, `/stats`) rather than one crowded screen — a landing summary, the filterable catalogue, and deep-dive analytics each get their own layout and loading state instead of competing for space. All three, plus every other breakpoint-dependent element (sidebar/bottom-nav, drawer widths, table columns), are responsive via Ant Design's `Grid.useBreakpoint()` — see [Known gotchas](./CLAUDE.md#known-gotchas) for why there are no `@media` queries in the codebase.

### Dashboard (`/`)
- Landing summary: stat cards (total movies — hero-styled, average rating, average runtime, total box office), each with an icon
- Highlight cards — top rated, most popular, newest release — with a poster thumbnail
- Recent Releases list with poster thumbnails, keyboard-accessible (`Enter`/`Space`) like the rest of the app
- Skeleton placeholder layout while data loads, instead of a bare spinner
- CTA cards linking through to Movies and Stats

### Movies (`/movies`)
- Table or grid view, toggled with a `Segmented` control — grid shows poster cards (up to 6/row on wide screens), table is the dense sortable list
- Always-visible search box (name, director, actor, genre, production company) plus a **Filters** button — clicking it opens a right-side drawer with grouped Category filters (language, genre, director) and Range filters (year, vote average, runtime, box-office revenue), so the page stays uncluttered until you need it
- The Filters button shows a small dot when any filter is active
- Removable filter chips summarising every active filter, plus a one-click "Clear all", shown directly on the page (no need to open the drawer)
- Filter state persisted for the tab/session (`sessionStorage`) — survives navigating away and back, resets on a new tab or browser restart
- Sortable columns, pagination (5 / 10 / 20 / 50 per page) in table view
- Click any row/card to open a detail drawer with full movie info, vote count, and popularity score — rows/cards are keyboard-accessible (`Enter`/`Space`) with `aria-label`s
- Export filtered results to CSV
- Sidebar auto-collapses to icon rail below 768px (Ant Design `md` breakpoint); manual toggle still works within a breakpoint
- Below the `sm` breakpoint the sidebar is replaced by a fixed bottom nav bar, table/drawer widths go full-screen, grid view is the default, and table columns (Genres, Actors, Production Company, Country) progressively hide to fit narrow viewports

### Statistics — 6 tabs
| Tab | Contents |
|---|---|
| 📊 Overview | Animated stat cards (total, avg/longest/shortest runtime, total watch time in mins/hrs/days/yrs) · Movies by language · Movies per year |
| 🎬 People | Top 15 actors · Top 15 directors · Movies by production company |
| ⭐ Ratings | Vote distribution · Avg vote by language (radar) · Avg vote by genre |
| ⏱ Runtime & Geography | Movies by country & genre (polar area) · Avg vote by runtime bucket · Top 50 longest films |
| 💰 Box Office | Top 20 highest-grossing films · Top 20 highest-budget films · Avg revenue by genre |
| 🔭 Explore | Genre distribution · Year × genre heatmap · Top 10 Explorer (highest rated, longest, most recent, oldest, most popular) |

### Theme
- Light / dark toggle (sun/moon button in the top bar)
- Preference persisted to `localStorage`
- Glassmorphism design system with CSS custom properties

### Accessibility
- Table rows, grid cards, and the Dashboard's Recent Releases list are keyboard-operable (`Tab` to focus, `Enter`/`Space` to activate) with `role="button"` and `aria-label`s, not click-only
- `BottomNav`'s active link sets `aria-current="page"` for assistive tech
- Semantic headings (`<Title>`) per page instead of relying on the top bar for page identity

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6 |
| UI | Ant Design v5 (dark + light algorithm) |
| Charts | Chart.js 4 + react-chartjs-2, chartjs-chart-matrix |
| Animation | Framer Motion |
| Routing | React Router v8 (`react-router` package — `react-router-dom` is deprecated as of v8) |
| HTTP | Axios |
| Backend | Express.js (TypeScript, tsx) |
| Data | CSV file via csv-parser |
| Testing | Playwright (47 E2E tests) |
| Linting | ESLint (typescript-eslint, react-hooks, unused-imports) |

---

## Getting Started

Requires **Node.js 22.22+** (raised from 20+ — `react-router@8` requires it).

### 1. Install dependencies

```bash
npm install
```

### 2. Add your data

The repository ships with a CSV template at `public/movies.template.csv`. Copy it to `src/movies.csv` and populate it with your data:

```bash
cp public/movies.template.csv src/movies.csv
```

The expected columns are:

```
Movie ID, Name, Language, Runtime, Release Year, Genres, Director,
Actors/Actresses, Production Company, Production Country,
Box Office Revenue, Budget, Popularity Score, Vote Average,
Vote Count, Poster URL, Release Date
```

- **Language** — ISO 639-1 code (`en`, `fr`, `ja`, …)
- **Genres** — comma-separated (`Action, Adventure`)
- **Box Office Revenue / Budget** — plain numbers (e.g. `150000000`)
- **Poster URL** — optional, full image URL (e.g. TMDB's `https://image.tmdb.org/t/p/w500/<poster_path>`); leave blank to fall back to a placeholder in the grid view and detail drawer
- **Release Date** — `YYYY-MM-DD`

A download button in the top bar also lets users grab the template directly from the running app.

`src/movies.csv` is gitignored and read by the Express server at runtime — it isn't placed in `public/` because it's not a static asset the browser fetches directly; the frontend only ever sees it through the `/api/movies` API. Keeping it out of `public/` also keeps it out of the Vite production bundle.

#### Where to get the data — TMDB API

This project was populated using the [TMDB (The Movie Database) API](https://www.themoviedb.org/documentation/api), which is free for non-commercial use. This product uses the TMDB API but is not endorsed or certified by TMDB — check [TMDB's terms of use](https://www.themoviedb.org/documentation/api/terms-of-use) before using fetched data beyond personal/non-commercial purposes.

1. Create a free account at [themoviedb.org](https://www.themoviedb.org) and generate an API key under **Settings → API**.
2. Use the [`/discover/movie`](https://developer.themoviedb.org/reference/discover-movie) endpoint to fetch movies in bulk, paginating through results.
3. For each movie, map the TMDB fields to the CSV columns:

| CSV column | TMDB field |
|---|---|
| `Movie ID` | `id` |
| `Name` | `title` |
| `Language` | `original_language` |
| `Runtime` | `runtime` (from `/movie/{id}`) |
| `Release Year` | `release_date` (year part) |
| `Genres` | `genres[].name` joined with `, ` |
| `Director` | `credits.crew` where `job == "Director"` |
| `Actors/Actresses` | `credits.cast[0..4].name` joined with `, ` |
| `Production Company` | `production_companies[0].name` |
| `Production Country` | `production_countries[0].iso_3166_1` |
| `Box Office Revenue` | `revenue` |
| `Budget` | `budget` |
| `Popularity Score` | `popularity` |
| `Vote Average` | `vote_average` |
| `Vote Count` | `vote_count` |
| `Poster URL` | `https://image.tmdb.org/t/p/w500` + `poster_path` |
| `Release Date` | `release_date` |

`credits` and `keywords` require appending `append_to_response=credits,keywords` to the `/movie/{id}` request.

#### Or use the included search tool

`movie-search.py` is a small Tkinter GUI that does the above for you — search TMDB by movie or actor name, filter by language, and append picked results straight to `src/movies.csv`. It checks `Movie ID` against existing rows first and skips (with a dialog) anything already in the CSV, so re-running a search is safe.

```bash
pip install -r requirements.txt
cp .env.example .env   # then set TMDB_API_KEY=<your key> in .env
python movie-search.py
```

`.env.example` contains a single placeholder line:

```
TMDB_API_KEY=your_tmdb_api_key_here
```

`.env` is gitignored — the key never gets hardcoded or committed.

#### Backfilling posters into an existing CSV

If your `src/movies.csv` predates the `Poster URL` column (or has rows with it blank), `backfill_posters.py` fills them in by looking each row's `Movie ID` up on TMDB:

```bash
python backfill_posters.py
```

It checkpoints every 100 rows (safe to interrupt) and prints a specific reason for any row it can't fill (not found on TMDB, no poster on TMDB, timeout, etc.). Back up `src/movies.csv` first — it rewrites the file in place.

### 3. Run

```bash
npm run dev
```

Opens the frontend at **http://localhost:3000** and the API at **http://localhost:5000**.

---

## Scripts

### Development
| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server + Express backend concurrently |
| `npm run preview` | Preview the production build locally |

### Build
| Script | Description |
|---|---|
| `npm run build` | Type-check and build frontend for production (`dist/`) |
| `npm run build:server` | Compile Express backend to `server/dist/` |
| `npm run server:prod` | Run the compiled backend in production |
| `npm run type-check` | Run TypeScript type checking without emitting files |

### Testing
| Script | Description |
|---|---|
| `npm run lint` | Run ESLint across the project |
| `npm run test:e2e` | Run Playwright E2E tests (headless) |
| `npm run test:e2e:ui` | Run Playwright E2E tests with interactive UI |
| `npm run test:e2e:report` | Open the last Playwright HTML report |

---

## Project Structure

React talks only to the Express API (`/api/movies`, `/api/movies/:id`, `/api/health`); the API is the sole reader of the CSV, so the frontend never touches the filesystem directly. `MoviesContext` and `ThemeContext` (both under `src/contexts/`) plus the shared hooks in `src/hooks/` keep data-fetching, theme, and filter-persistence logic in one place rather than duplicated per component.

```
React (Vite, port 3000) → Express API (port 5000) → src/movies.csv → Chart.js / Ant Table
```

```
movie-dash-v2/
├── public/
│   └── movies.template.csv     # CSV template for your own data
├── server/
│   └── server.ts               # Express API (port 5000)
├── tests/
│   └── app.spec.ts             # Playwright E2E tests (47 tests)
├── docs/
│   └── screenshots/            # README screenshots
├── playwright.config.ts        # Playwright configuration
├── src/
│   ├── contexts/
│   │   ├── MoviesContext.tsx    # Global movie data provider
│   │   └── ThemeContext.tsx     # Light/dark theme provider
│   ├── components/
│   │   ├── Charts/             # BarChart, LineChart, HorizontalBar, Radar,
│   │   │                       # PolarArea, Doughnut, Matrix (all theme-aware)
│   │   ├── StatsTabs/          # OverviewTab, PeopleTab, RatingsTab,
│   │   │                       # RuntimeTab, BoxOfficeTab, ExploreTab
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx          # Theme toggle + download template button (no page title — pages render their own heading)
│   │   ├── DashboardSection.tsx # Title + content wrapper, standardizes Dashboard sections
│   │   ├── FiltersDrawer.tsx   # Category/range filters, opened via the Filters button
│   │   ├── ActiveFilters.tsx   # Removable filter chips + "Clear all"
│   │   ├── LoadingError.tsx    # Shared skeleton-loading / error alert wrapper (Dashboard, Movies, Stats)
│   │   ├── BottomNav.tsx       # Fixed mobile nav bar, replaces Sidebar below the `sm` breakpoint
│   │   ├── MovieTable.tsx
│   │   ├── MovieCardGrid.tsx
│   │   ├── MovieDrawer.tsx
│   │   ├── StatCard.tsx
│   │   └── TopNExplorer.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx       # landing page: stat cards, highlights, mini charts, CTAs
│   │   ├── Movies.tsx          # filterable table/grid catalogue
│   │   └── Stats.tsx
│   ├── utils/
│   │   ├── chartTheme.ts       # Shared palette + getCardStyle(isDark)
│   │   ├── statsHelpers.ts     # groupByField, makeDoughnut, parseRevenue, formatRevenue
│   │   ├── filterChips.ts      # buildFilterChips, isFiltersActive — shared by the Filters button and chips row
│   │   ├── formatDate.ts       # formatDateDDMMYYYY — release dates rendered as DD-MM-YYYY
│   │   ├── exportCsv.ts
│   │   └── languages.ts        # ISO code → display name
│   ├── hooks/
│   │   ├── useMovies.ts
│   │   ├── useDebounce.ts
│   │   └── usePersistedFilters.ts
│   └── types/
│       └── movie.ts
```

---

## E2E Testing

Playwright tests cover the full user journey across 7 suites (47 tests):

- **Dashboard** — layout, highlight cards, CTA navigation to Movies/Stats
- **Movies** — layout, table/grid toggle, drawer from row and card, search, filters drawer (open/close, language/genre filters), empty state, clear/reset, active-filter dot indicator, sorting, pagination, page size, CSV export
- **Navigation** — sidebar links, 404 page, back-to-dashboard, sidebar collapse, page title updates
- **Stats Page** — all 6 tabs load, charts render, TopN explorer metric switching, tab persistence
- **Theme** — default dark, toggle to light, reload persistence
- **Filter Persistence** — search filter survives route changes via `sessionStorage`
- **Edge Cases** — combined filters, pagination, sort + filter combo

Tests run automatically on every push and pull request to `main` via GitHub Actions (see `.github/workflows/ci.yml`).

### Run tests locally

```bash
# Install browsers (first time only)
npx playwright install chromium

# Run headless
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# View HTML report after a run
npm run test:e2e:report
```

Tests require both the Vite frontend (port 3000) and Express backend (port 5000) to be reachable. The Playwright config starts `npm run dev` automatically if no server is already running.

---

## API

The Express server exposes JSON endpoints — every response, success or error, is a JSON body:

| Endpoint | Description |
|---|---|
| `GET /api/health` | `{ status: "ok" \| "loading", movies: <count> }` |
| `GET /api/movies` | All movies as a JSON array. Returns `503 { error: "Data still loading" }` while the CSV is still being read on boot |
| `GET /api/movies/:id` | A single movie by `Movie ID`. Returns `404 { error: "Movie not found" }` if no match, or `400 { error: "Invalid movie id" }` if the param is missing/too long |

Responses are gzip-compressed and `/api/movies` is cached with `Cache-Control: public, max-age=60`. Routes live under `/api` so Vite's dev proxy can forward API calls to Express without colliding with the client-side `/movies` route — a bare `/movies` proxy prefix would intercept the browser's SPA navigation and return raw JSON instead. In development, Vite proxies `/api` requests to the Express server automatically (see `vite.config.ts`).

---

## Security

- **`helmet()`** sets standard security headers on every response, using its default policy (no per-directive customization).
- **Rate limiting** — `/api/*` is capped at 300 requests/minute per client (`express-rate-limit`); over the limit returns `429`.
- **CORS allowlist** — only `CLIENT_ORIGIN` (env var, defaults to `http://localhost:3000`) may call the API cross-origin, instead of an open `cors()` reflecting any origin. Set `CLIENT_ORIGIN` to your deployed frontend's URL in production.
- **Input validation** — `Movie ID` route params are length-checked before use.
- **Error handling** — a catch-all Express error-handling middleware returns a generic `500 { error: "Internal server error" }` instead of leaking stack traces; errors are still logged server-side.
- CI runs `npm audit --audit-level=high` before lint/build/e2e.
- `movie-search.py` sends the TMDB API key via `requests`' `params=` (never string-interpolated into a URL) and never echoes raw request exceptions — which could include the URL/key — back to the user in an error dialog.

---

## Performance

- **gzip compression** on all API responses (`compression` middleware)
- **HTTP caching** — `/movies` sent with `Cache-Control: public, max-age=60`
- **Debounced search** — table search input debounced via `useDebounce` to avoid re-filtering on every keystroke
- **Single fetch, shared context** — movie data fetched once in `MoviesContext` and reused across the dashboard and all stats tabs, not re-fetched per component
- **Memoization** — derived data (filtered/sorted movie lists, chart datasets, stat aggregations) computed with `useMemo` throughout, so expensive recalculation only happens when the underlying movies or filters actually change; every chart wrapper in `src/components/Charts/*` also memoizes its Chart.js `options` object, so an unrelated parent re-render doesn't force a full chart rebuild
- **Tree-shaken Chart.js** — `src/main.tsx` registers only the specific controllers/elements/scales/plugins actually used, instead of Chart.js's `registerables` (the entire library)
- **Code splitting** — Vite production build splits vendor/chart bundles

---

## Deployment

- **Frontend**: `npm run build` outputs a static `dist/` — deploy to any static host (Vercel, Netlify, GitHub Pages, S3 + CDN).
- **Backend**: `npm run build:server` compiles the Express API to `server/dist/`; run it with `npm run server:prod` on any Node 20+ host (Render, Railway, a VPS, etc.). Point the frontend's API calls at the deployed backend URL, or serve both behind the same reverse proxy.
- **Environment variables** (backend, both optional): `PORT` (defaults `5000`) and `CLIENT_ORIGIN` (defaults `http://localhost:3000`) — set `CLIENT_ORIGIN` to your deployed frontend's origin, or the CORS allowlist in [Security](#security) will reject it.
- Neither is deployed anywhere by default — this is a local-first project (see [Live Demo note](#moviedash-v2) above).

---

## Roadmap

Ideas under consideration, not commitments:

- Pluggable data backend (SQLite/Postgres) as an alternative to CSV
- Basic auth for multi-user deployments
- Dockerfile / docker-compose for one-command setup
- Bulk CSV import/export improvements in `movie-search.py`

---

## Contributing

1. Fork the repo and create a branch off `main`.
2. Make your changes, keeping with the existing code style (`npm run lint`).
3. Run `npm run lint` and `npm run test:e2e` before opening a PR.
4. Open a PR describing the change and why.

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Changelog

`package.json` version follows [Semantic Versioning](https://semver.org/). See [CHANGELOG.md](./CHANGELOG.md) for release notes. See [features.txt](./features.txt) for a plain-text feature list, and [CLAUDE.md](./CLAUDE.md) for repo/architecture notes aimed at AI coding agents.
