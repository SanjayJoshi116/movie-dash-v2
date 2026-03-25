# MovieDash

A movie analytics dashboard built with React 19, TypeScript, Vite, and Ant Design.

## Features

- **Dashboard** — searchable, sortable movie table with pagination
- **Statistics** — animated stat cards, bar charts, and doughnut charts across 6 dimensions (language, year, genre, country, company, director, runtime distribution)
- **Dark theme** — Ant Design dark algorithm applied globally
- **Express backend** — serves movie data from a CSV file via REST API

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| UI | Ant Design v5 |
| Charts | Chart.js + react-chartjs-2 |
| Animation | Framer Motion |
| Routing | React Router v7 |
| HTTP | Axios |
| Backend | Express.js (TypeScript) |
| Data | CSV file via csv-parser |

## Project Structure

```
movie-dash/
  index.html
  vite.config.ts
  tsconfig.json
  server/
    server.ts           # Express API server
    tsconfig.json
  src/
    types/
      movie.ts          # Movie and StatsCounters interfaces
    hooks/
      useMovies.ts      # Shared data-fetching hook
    components/
      Sidebar.tsx
      TopBar.tsx
      MovieTable.tsx
      StatCard.tsx
      Charts/
        BarChart.tsx
        DoughnutChart.tsx
    pages/
      Dashboard.tsx
      Stats.tsx
    App.tsx
    main.tsx
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run both the frontend (port 3000) and backend (port 5000) together:

```bash
npm run dev
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server + Express backend concurrently |
| `npm run build` | Type-check and build frontend for production (`dist/`) |
| `npm run build:server` | Compile backend to `server/dist/` |
| `npm run server:prod` | Run compiled backend in production |
| `npm run preview` | Preview the production build locally |
| `npm run type-check` | Run TypeScript type checking without emitting |

## API

The Express server runs on `http://localhost:5000` and exposes:

| Endpoint | Description |
|---|---|
| `GET /movies` | Returns all movies as a JSON array |
| `GET /movies/:id` | Returns a single movie by ID |

In development, Vite proxies `/movies` requests to the Express server automatically.
