## Context

See proposal.md, Why. `MoviesContext.refetch()` sets `loading=true`, and `LoadingError` replaces its children with a skeleton whenever `loading` is true. So all three pages fully unmount their content on every refresh, including the `AddMovieModal` and `MovieDrawer` rendered inside `Movies.tsx`.

`MovieTable` uses Ant `Table` with uncontrolled sort and pagination. `MovieCardGrid` owns `page`, `pageSize` and `sortKey` locally. CLAUDE.md deliberately keeps grid and table sort state *separate*, and this design preserves that.

## Goals / Non-Goals

**Goals:** state survives refresh, export matches the screen, and the app is resilient to bad or unavailable storage.

**Non-Goals:**
- Sharing sort state between grid and table.
- Persisting sort or page in session storage.
- Table virtualization.

## Decisions

### 1. Split `loading` into `initialLoading` and `refreshing`
- `MoviesContext` exposes `loading` (true only until the first successful or failed load) and a new `refreshing` flag.
- `refetch()` sets `refreshing`, not `loading`.
- Keep the field name `loading` for its first-load meaning, so `LoadingError` call sites don't change.
- `TopBar` shows a small spinner (or the count badge pulses) while `refreshing`.
- On a refresh error, keep the existing data and show a non-blocking `message.error`, not the full-page Alert.

*Alternative:* `LoadingError` checks `movies.length === 0`. Rejected because it confuses "empty dataset" with "first load" and still blanks the screen after deleting the last movie.

### 2. Views report their displayed order
Add an `onDisplayedChange?: (rows: Movie[]) => void` prop to both views:
- **Table:** call it from Ant's `onChange(pagination, filters, sorter, extra)` with `extra.currentDataSource`. Also call it when `movies` changes, since sort persists over the new data. Simplest robust option: lift *only* the table's `sortOrder`/`sortField` into the table component as controlled state, and compute the sorted list with the column's `sorter` function in a `useMemo`. Then report that list.
- **Grid:** already computes `sortedMovies`; report it from a `useEffect` on `sortedMovies`. This is a callback to the parent, not state syncing.
- **Movies.tsx:** keep the latest list in a ref (no re-render needed) and pass it to `exportMoviesToCsv`.

*Alternative:* lift sort state fully into `Movies.tsx`. Rejected because it couples the two views' sort models, which CLAUDE.md says to keep independent.

### 3. Reset the page on filter change, not on data change
- `Movies.tsx` computes `filtersKey = JSON.stringify({ ...filters, search: debouncedSearch })` and passes it to both views.
- Each view uses the render-phase "prev value" pattern (as in `App.tsx`) to reset to page 1 when `filtersKey` changes.
- The table needs controlled `pagination.current` for this. A refresh changes `movies` but not `filtersKey`, so the page is kept, and the existing `safePage` clamp handles shrinkage.

### 4. Commit sliders on release
- Each slider keeps a local `draft` value while dragging (`onChange` → `setDraft`) and calls the real `onChange` from `onChangeComplete`.
- A render-phase reset of `draft` when the committed value changes from outside (chip removed, "Clear all") keeps the two in sync.
- Ant v5 `Slider` supports `onChangeComplete`, and keyboard steps fire it too.

### 5. Saved filter validation
`usePersistedFilters` gets a `sanitizeFilters(raw: unknown, defaults): FilterState`:
- arrays must be `string[]`
- ranges must be `[number, number]` with `lo <= hi`, or `null`
- `search` must be a string

Range clamping against the data span happens in `Movies.tsx` once `movies` has loaded, because the hook doesn't know the data. Only clamp; never drop silently. Directors and genres no longer present simply match nothing, but their chips stay visible so the user can see and remove them.

### 6. Export CSV
- Columns: a fixed `CATALOGUE_COLUMNS` list exported from `src/types/movie.ts` (the `Movie` keys in CSV order), plus any extra keys found across all rows.
- Escaping: reuse a shared client-side `sanitizeCsvValue` mirroring the server's, and also quote `\r`.

### 7. Theme storage
- Wrap `localStorage` reads and writes in try/catch.
- With no saved value, use `window.matchMedia('(prefers-color-scheme: dark)').matches`.
- Memoize `toggleTheme` (`useCallback`) and the context value (`useMemo`). Do the same in `MoviesContext`.

## Risks / Trade-offs

- **Controlled table sort and pagination is a bigger change to `MovieTable`.** Keep the existing column `sorter` functions as the single source of comparison logic, and cover it with the existing e2e sort tests.
- **Stale data shows briefly during a refresh.** That's acceptable and intended. The refresh indicator makes it visible.
- **The OS-preference default changes the first-visit theme for light-mode users,** who currently get dark. Returning users keep their saved choice.
