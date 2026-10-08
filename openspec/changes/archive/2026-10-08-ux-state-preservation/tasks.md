## 1. Background refresh

- [x] 1.1 `MoviesContext`: add `refreshing`; `refetch()` sets `refreshing` instead of `loading`; on a refresh error keep the data and show a non-blocking error; memoize the context value
  - Deviation from design §1: the refresh error is exposed as `refreshError` and shown as a TopBar retry button (tooltip), not antd's static `message.error` — the static API can't consume the `ConfigProvider` dark theme in antd v5 and logs a warning.
- [x] 1.2 Show a subtle refresh indicator in `TopBar` while `refreshing`
- [x] 1.3 Check that Add Movie import and Drawer delete no longer reset the modal, sort or page

## 2. Export

- [x] 2.1 Export a `CATALOGUE_COLUMNS` list from `src/types/movie.ts`
- [x] 2.2 `exportCsv.ts`: build headers from `CATALOGUE_COLUMNS` plus any extra keys; apply formula escaping; quote `\r`
- [x] 2.3 `MovieTable`: make sort and pagination controlled, compute the sorted rows, and add the `onDisplayedChange` prop
- [x] 2.4 `MovieCardGrid`: add the `onDisplayedChange` prop, reported from `sortedMovies`
- [x] 2.5 `Movies.tsx`: keep the displayed rows in a ref and export from it

## 3. Pagination reset

- [x] 3.1 `Movies.tsx`: compute `filtersKey` from filters plus the debounced search and pass it to both views
- [x] 3.2 Table and grid: reset to page 1 when `filtersKey` changes, using the render-phase prev pattern

## 4. Sliders

- [x] 4.1 `FiltersDrawer`: the four range sliders use a local draft plus `onChangeComplete`, and resync when the value changes from outside
- [x] 4.2 `Stats.tsx`: the year range slider uses the same pattern

## 5. Robust persistence

- [x] 5.1 `usePersistedFilters`: add `sanitizeFilters` with per-field shape checks
- [x] 5.2 `Movies.tsx`: clamp restored ranges to the data span once movies have loaded
- [x] 5.3 `ThemeContext`: try/catch around storage, default to `prefers-color-scheme`, memoize `toggleTheme` and the value

## 6. Docs and verification

- [x] 6.1 Update CLAUDE.md:
  - `loading` vs `refreshing`
  - views reporting their displayed order for export
  - filters-key page reset
  - slider commit-on-release
- [x] 6.2 Manually verify (no new e2e tests):
  - Verified with a throwaway Playwright spec (deleted afterwards) against the real 1,961-row CSV, all mutations/TMDB mocked via `page.route` (sha256 unchanged): delete keeps vote-descending sort + page 3 with no skeleton (also covers 1.3); import keeps the modal + both results with one "Added"; export's first row = max vote, Poster URL column present; grid filter change → page 1; corrupted sessionStorage (`genres: null`, bad `yearRange`) loads with the valid search kept. 5/5 passed.
  - an import keeps the Add Movie modal's results
  - export order matches a sorted table
  - a filter change resets the grid to page 1
  - a corrupted `sessionStorage` filter doesn't crash the page
- [x] 6.3 Confirm `npm run lint` and `npm run build` pass, and run the existing e2e suite once (`CI=1 npm run test:e2e`) — required here because this change makes table sort/pagination controlled, which the existing sorting/pagination/persistence tests cover
  - lint + build pass; e2e 59/59 (`CI=1`, template, `--retries=0`; real CSV restored, sha256 verified). `playwright.config.ts` now pins `colorScheme: 'dark'` (theme default follows the OS — 5.3) and the theme test was renamed accordingly. The run took 5.6 min vs ~3.4 min before; not investigated (no failures/retries).
