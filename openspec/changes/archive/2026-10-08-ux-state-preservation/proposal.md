## Why

The Movies page loses or misrepresents user state in several places (audit findings F1, F6–F9, F14, F15 and C5 in `docs/audit-findings-2026-10-08.md`):
- **Lost work after add/delete.** Every catalogue refresh swaps the whole page for a loading skeleton. Adding or deleting a movie therefore unmounts everything: Add Movie search results are wiped mid-session, and the table's page and sort reset.
- **Export ignores sort.** "Export CSV" promises the rows "after search/filters/sort" but exports them unsorted.
- **Stale pagination.** Changing filters while on page 3 of the grid lands you on page 3 of the new results.
- **Laggy sliders.** Range sliders refilter, and save to session storage, on every drag tick.
- **Fragile saved state.** A corrupted saved filter crashes the page. Blocked browser storage crashes the theme provider, and so the whole app.

## What Changes

- **Background refresh.** After the first load, refreshing the catalogue updates the data in place with a subtle loading indicator. The page doesn't unmount, so open dialogs, search results, sort order and scroll position survive add and delete.
- **Export matches the screen.** Export CSV writes rows in the order the active view (table or grid) shows them.
- **Export completeness and safety.** The export always includes every catalogue column, whichever fields the first row happens to have, and escapes formula-like cell values the same way the server's stored file does.
- **Reset to page 1 on filter change.** Both views return to page 1 when the search or filters change. A data refresh after add or delete keeps the current page.
- **Commit sliders on release.** Range sliders update their display while dragging and apply the filter when released (Movies filters drawer and the Stats year range).
- **Validate saved filters.** On restore, each saved field is checked and invalid ones fall back to defaults. Saved ranges are clamped to the current data's span.
- **Storage-safe theme.** Theme preference reads and writes tolerate blocked storage. With no saved choice, the default follows the operating system's light/dark preference.
- **Fewer re-renders.** Context values for movies and theme are stable between renders, so unrelated updates don't re-render every consumer.

## Capabilities

### New Capabilities
- `movie-browsing`: user state on the Movies page (filters, sort, pagination, view, open dialogs) and how it persists across data refreshes, navigation and storage failures. It also covers export of the current view.

### Modified Capabilities
<!-- None -->

## Impact

- `src/contexts/MoviesContext.tsx`: separate `initialLoading` and `refreshing` states; memoized value.
- `src/components/LoadingError.tsx`: skeleton only on the first load.
- `src/pages/Movies.tsx`, `src/components/MovieTable.tsx`, `src/components/MovieCardGrid.tsx`: report displayed order to the parent; page reset keyed on filters.
- `src/utils/exportCsv.ts`: fixed column list and formula escaping.
- `src/hooks/usePersistedFilters.ts`: shape validation and clamping.
- `src/components/FiltersDrawer.tsx`, `src/pages/Stats.tsx`: commit sliders on release.
- `src/contexts/ThemeContext.tsx`: safe storage, OS preference default, memoized value.
- The `Dashboard.tsx` and `Stats.tsx` loading behaviour benefits automatically through `LoadingError`.
