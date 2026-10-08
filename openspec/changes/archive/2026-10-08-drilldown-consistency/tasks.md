## 1. Shared helpers

- [x] 1.1 Add `topNWithOther(data, n)` to `statsHelpers.ts`
- [x] 1.2 Fix `formatRevenue`: `0` → `$0`, negative → `-$X`, missing → `N/A`
- [x] 1.3 Add a bucket type `{ label, min, maxExclusive }` with `countIntoBuckets()` and `bucketToRange(bucket, step, domainMax)` helpers
- [x] 1.4 Update `filterChips.ts`: vote chips show trimmed decimals up to 3 places, runtime chips show integers

## 2. Drill-down plumbing

- [x] 2.1 Create a `DrilldownContext` and `useDrillDown()`. The default navigates plainly; the Stats provider merges or intersects the year scope and skips navigation when the intersection is empty
- [x] 2.2 Wrap the tabs in `Stats.tsx` with the provider, fed by `yearRange`
- [x] 2.3 Replace direct `navigate('/movies', …)` calls in all six `StatsTabs/*` files and in `Dashboard.tsx` with `drillDown(preset)`
- [x] 2.4 Add early returns for `'Unknown'` and `'Other'` labels in every category drill-down handler

## 3. Bucket consistency

- [x] 3.1 Dashboard rating chart: use the shared bucket definitions for both counting and clicking (vote step 0.001, last bucket includes 10)
- [x] 3.2 RatingsTab vote distribution: same treatment
- [x] 3.3 RuntimeTab: same treatment (step 1); the open bucket's upper bound becomes the dataset's max runtime
- [x] 3.4 Check that the FiltersDrawer vote slider doesn't rewrite an off-step preset range when the drawer opens; adjust `step` if it does

## 4. Filtering and charts

- [x] 4.1 `Movies.tsx`: while a revenue filter is active, exclude revenue `≤ 0` or NaN; while a vote filter is active, exclude vote `≤ 0` or NaN
- [x] 4.2 Replace threshold-based `withOther` in chart callers (PeopleTab company, RuntimeTab country/genre) with `topNWithOther(…, 7)`
- [x] 4.3 OverviewTab language chart: remove the hardcoded 15-colour palette, use `CHART_PALETTE` and cap at 7 + Other
- [x] 4.4 Dashboard trend: a continuous 10-year axis ending at the latest release year, with zero-filled gaps; the title matches the axis

## 5. Stats tab URL

- [x] 5.1 Validate the initial tab against `TAB_KEYS` and fall back to `'overview'`
- [x] 5.2 Write the resolved tab to `?tab=` (replace) on arrival when it differs from the URL

## 6. Docs and verification

- [x] 6.1 Update the CLAUDE.md drill-down paragraphs: `useDrillDown`, scope merging, the bucket helpers, and the revenue/vote unknown exclusion
- [x] 6.2 Add e2e tests:
  - a drill-down count equals the bar count at a boundary
  - a scoped Stats drill-down shows a year chip
  - `?tab=bogus` falls back to Overview
  - arriving at `/stats` via the Dashboard link sets `?tab=`
- [x] 6.3 Confirm `npm run lint`, `npm run build` and `npm run test:e2e` pass
  - lint, type-check:server, build pass; `test:server` 44/44; e2e 59/59 on the template (`CI=1`, `--retries=0`), and the drill-down + Box Office tests 4/4 against the real 1,961-row CSV (read-only; sha256 unchanged).
  - 3.4 result: no slider change was needed — Ant's `Slider` doesn't fire `onChange` on mount; the e2e test asserts the vote chip text and list count are unchanged after opening/closing the filters drawer on a `[x, y.999]` range.
  - Design open question resolved with the default: the Dashboard trend ends at the dataset's latest release year.
  - Scope note: Explore's "Genre Distribution (Top 20)" is a ranking bar chart, not a category breakdown, so it still cycles the 8-colour palette (not in the design's capping list).
