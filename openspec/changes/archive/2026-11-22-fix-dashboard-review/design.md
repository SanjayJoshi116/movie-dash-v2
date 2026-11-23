## Context

Batch F (`BUG_BACKLOG.md` §6 rows 23, 33–35) reviewed the Dashboard and its components. Findings re-checked against the code on 2026-11-20:

- `Dashboard.tsx:149-151` picks Top Rated by `Vote Average` only. `TopNExplorer.tsx:50-61` uses `MIN_VOTES_FOR_RATING = 50` with a fallback when fewer than `MIN_QUALIFYING_FOR_CUTOFF = 10` qualify (B108).
- `Dashboard.tsx:33, 397-401`: module-level `React.lazy` inside a bare `Suspense`. A rejected import reaches the route `ErrorBoundary`; React caches the rejected lazy payload, so "Try Again" re-throws it (B109).
- `Dashboard.tsx:133` sums `parseRevenue()`, which returns negatives as-is (`statsHelpers.ts:105-110`). `BoxOfficeTab.tsx:52` skips `rev <= 0` (B110).
- `StatCard.tsx:22` (`${label}: view details`), `Dashboard.tsx:62` and `:338` (`View details for X`) replace the content-derived name (B111).
- `Dashboard.tsx:334-338`: `role="button"` on `List.Item` (an `<li>`) (B112).
- `Dashboard.tsx:210-227, 317`: handlers and the `isClickable` arrow are new on every render. `LineChart.tsx:53` (and Bar/Doughnut) key their options `useMemo` on them (B113).
- `Dashboard.tsx:359` renders the raw `Vote Average`; `:254-255` show `0.0` / `0` when nothing is known (B114).
- `StatCard.tsx:29` appends `14` to `color` (B115). `DashboardSection.tsx:16` is `level={5}` under the h3 page title (B116).

Rejected: "mini charts start at phone height". antd 6.7's `responsiveObserver.getSnapshot()` reads `matchMedia` before the first commit, so `screens.md` is real on the first render.

## Goals / Non-Goals

**Goals:** fix B108–B116 without changing the Dashboard's look, keep `check:bundle` passing (the drawer stays lazy), and cover each behaviour change with a mocked e2e test.

**Non-Goals:** migrating antd `List` (CLAUDE.md lists it as an antd 7 follow-up), changing the Stats explorer's own rule or display, the stale "`useBreakpoint()` is `{}` on the first render" lines (owned by `fix-app-shell-review`, B94).

## Decisions

**D1 — One rating-pool helper (B108).** Move `MIN_VOTES_FOR_RATING`/`MIN_QUALIFYING_FOR_CUTOFF` to `statsHelpers.ts` with `ratingPool(movies): { pool: Movie[]; cutoffApplied: boolean }`. `TopNExplorer` uses it for `highest_rated` (no behaviour change). Dashboard's Top Rated is the max `Vote Average > 0` within `ratingPool(movies).pool`; ties keep the first, as today. *Alternative:* export the constants only. Rejected: the fallback rule would still be written twice.

**D2 — Local boundary + re-creatable lazy (B109).** Hold the lazy component in state: `const [Drawer, setDrawer] = useState(() => React.lazy(loadDrawer))`. Wrap `<Suspense>` in a small `ChunkErrorBoundary` (new file, `onError` prop, renders `null` on error). `onError`: show a closable error `Alert` above the sections ("Couldn't open movie details. Check your connection and try again."; the next open clears it), `setSelectedMovie(null)`, `setDrawerMounted(false)`, `setDrawer(() => React.lazy(loadDrawer))`. The boundary is keyed on the lazy instance, so it resets with it. The next click mounts a fresh lazy, which calls `import()` again; browsers re-fetch a failed dynamic import. `loadDrawer` stays a module-level `() => import('../components/MovieDrawer')`, so Vite still splits the chunk. *Alternative (found during apply):* antd `message.error`. Rejected: `message` isn't on the landing route, and pulling it in added ~9 kB gzip to the landing JS (363 → 372 kB); `Alert` is already there via `LoadingError`. *Alternative:* `window.location.reload()` on chunk errors. Rejected: it loses the page state and hides network errors behind a reload loop.

**D3 — Unknown values (B110, B114).** `totalRevenue` sums `Math.max(0, parseRevenue(...))`. A `formatVoteBadge(raw)` in `Dashboard.tsx` returns `null` for NaN or `≤ 0`; the Recent Releases tag and the Top Rated detail show "Not rated" (default-colour tag) in that case, otherwise the raw value as today. Average Rating / Average Runtime show `—` and no suffix when there are no known values. Total Box Office keeps `$0` when no revenue is known: `formatRevenue` treats 0 as a real aggregate (CLAUDE.md), and changing that is out of scope.

**D4 — Accessible names (B111).** `StatCard`: `aria-label={`${label}: ${value}${suffix ? ` ${suffix}` : ''}, view details`}`. HighlightCard: `${label}: ${movie.Name}, ${detail}`. Recent release button: `${Name}, released ${date}, ${rating or 'not rated'}`. Explicit labels rather than dropping `aria-label`, because the content-derived name would include the poster's alt text and the icon names. `MovieCardGrid`'s "View details for X" labels are untouched (e2e reads them, and Batch H owns that file).

**D5 — Button inside the list item (B112).** `List.Item` loses `role`/`tabIndex`/`onKeyDown`/`aria-label`/`onClick` and keeps its padding and border. Inside it, a `<button type="button" className="recent-release-button">` with `onClick`; native buttons handle Enter/Space. Its children become `span`s with `display: flex/block` (a button only allows phrasing content). `.recent-release-button` in `index.css` copies `.movie-name-button`'s reset (`all: unset`, focus-visible outline) plus `width: 100%`, `display: flex`. Same approach as `MovieTable`'s Name cell.

**D6 — Memoized chart callbacks (B113).** `useCallback` for `handleYearClick` (deps `yearLabels`, `drillDown`), `handleGenreClick` and a `isGenreClickable` predicate (deps `genreDoughnutData`, `drillDown`), `handleRatingBucketClick` (`drillDown`). `yearLabels` is derived from the memoized `yearTrendData`, so it's stable; read it via `useMemo` to keep the reference stable.

**D7 — Hero tint (B115).** `withAlpha(color, 0.08)` (`0x14` / 255 ≈ 0.078, same look) and a JSDoc on `color`: `#RRGGBB` only. All current callers pass `#RRGGBB` and `CHART_PRIMARY` is `#RRGGBB`.

**D8 — Heading levels (B116).** `DashboardSection` renders `Title level={4}` with `fontSize: 16` (antd's h5 size), so it looks the same. `CtaCard` titles stay h5, now one level below their section. Highlight labels are not headings and stay that way.

## Risks / Trade-offs

- [Top Rated changes for users whose top movie has fewer than 50 votes] → Intended: it now matches Stats, as the spec already required.
- [Retry after a chunk failure depends on the browser re-fetching a failed `import()`] → Current Chromium/Firefox do. The e2e test aborts the chunk once with `page.route` and then lets it through, which checks exactly this.
- [Button reset styles could change Recent Releases' look] → Copies the existing `.movie-name-button` reset; check light and dark visually during apply.
