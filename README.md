# MovieDash v2

A full-stack movie analytics dashboard built with React 19, TypeScript, Vite, Ant Design, and Chart.js. Browse, filter, and explore a movie dataset through an interactive table and rich statistics visualisations — with a light/dark theme toggle.

![Dark mode](https://img.shields.io/badge/theme-dark%20%2F%20light-818cf8)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)
![Ant Design](https://img.shields.io/badge/Ant%20Design-5.24-1677ff)

---

## Features

### Dashboard
- Searchable, filterable movie table (name, director, actor, genre, production company)
- Multi-select language and genre filters, year range and vote average sliders
- Filter state persisted across page refreshes (localStorage)
- Sortable columns, pagination (5 / 10 / 20 / 50 per page)
- Click any row to open a detail drawer with full movie info, vote count, and popularity score
- Export filtered results to CSV

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

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6 |
| UI | Ant Design v5 (dark + light algorithm) |
| Charts | Chart.js 4 + react-chartjs-2, chartjs-chart-matrix |
| Animation | Framer Motion |
| Routing | React Router v7 |
| HTTP | Axios |
| Backend | Express.js (TypeScript, tsx) |
| Data | CSV file via csv-parser |
| Testing | Playwright (40 E2E tests) |
| Linting | ESLint (typescript-eslint, react-hooks, unused-imports) |

---

## Getting Started

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
Vote Count, Release Date
```

- **Language** — ISO 639-1 code (`en`, `fr`, `ja`, …)
- **Genres** — comma-separated (`Action, Adventure`)
- **Box Office Revenue / Budget** — plain numbers (e.g. `150000000`)
- **Release Date** — `YYYY-MM-DD`

A download button in the top bar also lets users grab the template directly from the running app.

#### Where to get the data — TMDB API

This project was populated using the [TMDB (The Movie Database) API](https://www.themoviedb.org/documentation/api), which is free for non-commercial use.

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
| `Release Date` | `release_date` |

`credits` and `keywords` require appending `append_to_response=credits,keywords` to the `/movie/{id}` request.

### 3. Run

```bash
npm run dev
```

Opens the frontend at **http://localhost:3000** and the API at **http://localhost:5000**.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server + Express backend concurrently |
| `npm run build` | Type-check and build frontend for production (`dist/`) |
| `npm run build:server` | Compile Express backend to `server/dist/` |
| `npm run server:prod` | Run the compiled backend in production |
| `npm run preview` | Preview the production build locally |
| `npm run type-check` | Run TypeScript type checking without emitting files |
| `npm run lint` | Run ESLint across the project |
| `npm run test:e2e` | Run Playwright E2E tests (headless) |
| `npm run test:e2e:ui` | Run Playwright E2E tests with interactive UI |
| `npm run test:e2e:report` | Open the last Playwright HTML report |

---

## Project Structure

```
movie-dash-v2/
├── public/
│   └── movies.template.csv     # CSV template for your own data
├── server/
│   └── server.ts               # Express API (port 5000)
├── tests/
│   └── app.spec.ts             # Playwright E2E tests (35 tests)
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
│   │   ├── TopBar.tsx          # Theme toggle + download template button
│   │   ├── FiltersPanel.tsx
│   │   ├── MovieTable.tsx
│   │   ├── MovieDrawer.tsx
│   │   ├── StatCard.tsx
│   │   └── TopNExplorer.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── Stats.tsx
│   ├── utils/
│   │   ├── chartTheme.ts       # Shared palette + getCardStyle(isDark)
│   │   ├── statsHelpers.ts     # groupByField, parseRevenue, formatRevenue
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

Playwright tests cover the full user journey across 7 suites (40 tests):

- **Dashboard** — layout, search, language/genre filters, empty state, drawer, CSV export, sorting, pagination, collapse panel
- **Navigation** — sidebar links, 404 page, back-to-dashboard, sidebar collapse, page title updates
- **Stats Page** — all 6 tabs load, charts render, TopN explorer metric switching, tab persistence
- **Theme** — default dark, toggle to light, reload persistence
- **Filter Persistence** — search filter survives route changes via localStorage
- **Edge Cases** — combined filters, pagination, sort + filter combo

### Run tests

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

The Express server exposes:

| Endpoint | Description |
|---|---|
| `GET /health` | Returns server status (`ok` / `loading`) and loaded movie count |
| `GET /movies` | Returns all movies as a JSON array (`503` while the CSV is still loading) |
| `GET /movies/:id` | Returns a single movie by ID |

Responses are gzip-compressed and `/movies` is cached with `Cache-Control: public, max-age=60`. In development, Vite proxies `/movies` requests to the Express server automatically (see `vite.config.ts`).
