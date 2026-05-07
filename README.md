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
| 📊 Overview | Animated stat cards (total, avg/longest/shortest runtime, total watch time) · Movies by language · Movies per year |
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
Vote Count, Keywords/Tags, Release Date
```

- **Language** — ISO 639-1 code (`en`, `fr`, `ja`, …)
- **Genres** — comma-separated (`Action, Adventure`)
- **Box Office Revenue / Budget** — plain numbers (e.g. `150000000`)
- **Release Date** — `YYYY-MM-DD`

A download button in the top bar also lets users grab the template directly from the running app.

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

---

## Project Structure

```
movie-dash-v2/
├── public/
│   └── movies.template.csv     # CSV template for your own data
├── server/
│   └── server.ts               # Express API (ports 5000)
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

## API

The Express server exposes:

| Endpoint | Description |
|---|---|
| `GET /health` | Returns server status and loaded movie count |
| `GET /movies` | Returns all movies as a JSON array |
| `GET /movies/:id` | Returns a single movie by ID |

In development, Vite proxies `/movies` requests to the Express server automatically (see `vite.config.ts`).
