## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3i "Found 2026-11-20 (Batch F review: Dashboard, §6 rows 23, 33–35), owned by `fix-dashboard-review`" with B108–B116, the rejected chart-height finding and why, and that SR found nothing
- [x] 1.2 `BUG_BACKLOG.md` §6: tick CR + SR for rows 23, 33, 34, 35 and Batch F; update the Progress line

## 2. Top Rated (B108)

- [x] 2.1 `statsHelpers.ts`: move `MIN_VOTES_FOR_RATING`/`MIN_QUALIFYING_FOR_CUTOFF` here; add `ratingPool(movies)` → `{ pool, cutoffApplied }`
- [x] 2.2 `TopNExplorer.tsx`: use `ratingPool` for `highest_rated` (no behaviour change)
- [x] 2.3 `Dashboard.tsx`: Top Rated = max `Vote Average > 0` within `ratingPool(movies).pool`
- [x] 2.4 e2e (Dashboard): mocked rows with a 10.0/1-vote movie and ≥10 movies with ≥50 votes → Top Rated card shows the best ≥50-vote movie, and it equals Stats › Explore Highest Rated #1

## 3. Drawer load failure (B109)

- [x] 3.1 New `src/components/ChunkErrorBoundary.tsx` (`onError` prop, renders `null` on error)
- [x] 3.2 `Dashboard.tsx`: module-level `loadDrawer`; lazy component held in state; boundary keyed on it; `onError` → inline error `Alert` (not `message`: +9 kB gzip on landing), clear `selectedMovie`, `drawerMounted = false`, new lazy
- [x] 3.3 e2e (Dashboard): `page.route` aborts the `MovieDrawer` chunk once → click Top Rated → Dashboard heading still visible + error message; second click → drawer opens
- [x] 3.4 `npm run build && npm run check:bundle`: drawer still in its own chunk, landing budget unchanged

## 4. Unknown values (B110, B114)

- [x] 4.1 `Dashboard.tsx`: `totalRevenue` sums `Math.max(0, parseRevenue(...))`
- [x] 4.2 `Dashboard.tsx`: unrated (NaN or ≤ 0) → "Not rated" tag in Recent Releases and the Top Rated detail
- [x] 4.3 `Dashboard.tsx`: Average Rating / Average Runtime show `—` with no suffix when there are no known values
- [x] 4.4 e2e (Dashboard): mocked rows incl. revenue `-1000000` → Total Box Office equals the sum of positive revenues (formatted with `formatRevenue`); newest movie with vote `0` → its Recent Releases entry shows "Not rated"; all votes `0` → Average Rating shows `—`

## 5. Accessibility (B111, B112, B116)

- [x] 5.1 `StatCard.tsx`: clickable label `${label}: ${value}[ suffix], view details`
- [x] 5.2 `Dashboard.tsx` HighlightCard: label `${label}: ${Name}, ${detail}`
- [x] 5.3 `Dashboard.tsx` Recent Releases: `List.Item` keeps list role; inner `<button type="button" className="recent-release-button">` with `onClick` and label `${Name}, released ${date}, ${rating | 'not rated'}`; inner `div`s → `span`s; drop `onKeyDown`
- [x] 5.4 `index.css`: `.recent-release-button` (reset like `.movie-name-button`, `width: 100%`, `display: flex`, focus-visible outline)
- [x] 5.5 `DashboardSection.tsx`: `Title level={4}` with `fontSize: 16`
- [x] 5.6 e2e (Dashboard): Total Box Office card's accessible name contains its value; Recent Releases is a `list` with `listitem`s each containing a `button`, and Enter on one opens the drawer; section headings are level 4 (`getByRole('heading', { level: 4, name: 'Highlights' })`)

## 6. Cleanups (B113, B115)

- [x] 6.1 `Dashboard.tsx`: `useCallback` for the three chart click handlers and a memoized genre `isClickable`; `yearLabels` from `useMemo`
- [x] 6.2 `StatCard.tsx`: hero tint via `withAlpha(color, 0.08)`; JSDoc `color` as `#RRGGBB`

## 7. Docs and checks

- [x] 7.1 CLAUDE.md: Dashboard drawer (lazy held in state + `ChunkErrorBoundary`, retries on next open), `ratingPool` shared by Dashboard/TopNExplorer, `.recent-release-button`
- [x] 7.2 `npm run lint`, `npm run type-check`, `npm run test:e2e` (check ports 3000/5000 first)
- [x] 7.3 Visual check of the Dashboard in light and dark (Recent Releases, section headings, hero card)
- [x] 7.4 `BUG_BACKLOG.md` §6: Fix ◐ for rows 23, 35, 34 and Batch F; row 33 (`PosterThumb.tsx`, no findings) Fix ☑
