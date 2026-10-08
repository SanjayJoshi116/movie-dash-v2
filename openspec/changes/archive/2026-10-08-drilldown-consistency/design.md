## Context

See proposal.md, Why. Drill-downs today follow this pattern:
- They call `navigate('/movies', { state: { presetFilters } })` from about 15 handlers spread across `Dashboard.tsx` and six `StatsTabs/*` files.
- `Movies.tsx` merges `presetFilters` over `DEFAULT_FILTERS` once, on arrival.
- Range filters are inclusive `[lo, hi]` on both ends.
- Charts bucket with `Math.floor` (half-open `[lo, hi)`).
- `Stats.tsx` owns `yearRange` but passes only the already-filtered `scopedMovies` to the tabs, so the tabs can't see the scope.

Data facts from the user's CSV:
- `Vote Average` has up to 3 decimal places.
- `Runtime` is always an integer.
- 1,060 of 1,961 rows have revenue 0 or blank.

## Goals / Non-Goals

**Goals:** one place that builds drill-down filters, so year scope and bucket bounds are applied the same way everywhere.

**Non-Goals:**
- Changing the range filter's inclusive semantics or the slider's behaviour. The user chose to tighten drill-down bounds instead.
- Adding drill-down to `RadarChart` or `MatrixChart`.
- Changing the Dashboard's own (unscoped) drill-downs beyond fixing the bucket bounds.

## Decisions

### 1. A `DrilldownContext` instead of prop-drilling `yearRange`
`Stats.tsx` provides a small context, `{ drillDown(preset: Partial<FilterState>): void }`, and each tab's handlers call it instead of `navigate` directly.
- The provider merges in `yearRange` when the scope is narrowed. If the preset already has a `yearRange`, it intersects the two, and skips navigating if the intersection is empty.
- The Dashboard isn't inside the provider. It uses a default implementation, plain navigation with no scope, through the same hook (`useDrillDown()`).

*Alternative:* add a `yearRange` prop to all six tabs. Rejected because it touches every tab's signature and every handler would still need to remember to merge it.

### 2. Bucket definitions shared between chart and click
Each bucketed chart declares its buckets once, as `{ label, min, maxExclusive }`. Both the counting function and the click handler read that same array.

The click converts a bucket to the inclusive filter range `[min, maxExclusive − step]`:
- `step = 1` for runtime (integer minutes).
- `step = 0.001` for vote average (the data's precision).

The last bucket of a domain:
- For vote, use the domain max (10), so 10.0 is included.
- For runtime, the open bucket's upper bound becomes the dataset's real max runtime, not `9999`.

### 3. Range chips show real bounds
`filterChips.ts` formats:
- Vote with up to 3 significant decimals, trimmed, so `[2, 3.999]` shows as `2–3.999`.
- Runtime as integers, so `90–119m`.

This is honest rather than pretty. The user approved tightening bounds knowing the chip shows the real range.

### 4. FiltersDrawer slider bounds
The runtime slider's `max` already comes from the data, so a drill-down range now always fits.

The vote slider uses `step={0.1}`. A value like `3.999` isn't on that step, and Ant snaps the displayed handle, but the filter state keeps the exact value. Opening the drawer and moving a *different* control must not rewrite the vote range. Confirm during implementation that the Ant `Slider` doesn't fire `onChange` on mount. If it does, give the slider `step={null}` with marks, or `step={0.001}`.

### 5. Unknown numeric values
In `Movies.tsx`, the revenue and vote checks treat `≤ 0` or NaN as unknown and exclude it *only while that range filter is active*, matching the existing runtime check. Dashboard and Stats rating buckets already skip 0, so counts stay consistent.

### 6. Non-clickable Unknown/Other
Each handler early-returns for `'Unknown'` or `'Other'` labels. The `onHover` cursor logic in the chart wrappers stays as it is. Optionally, pass an `isClickable(index)` predicate to suppress the pointer cursor; that's nice to have, so it's a task but not a hard dependency.

### 7. Category capping
Replace chart uses of `withOther(data, threshold)` with `topNWithOther(data, 7)`: sort by count, keep the top 7, and sum the rest into "Other". `withOther` is kept only if a non-chart caller needs it. OverviewTab's language bar uses `CHART_PALETTE` and the same cap.

### 8. Stats tab validation and URL sync
- Define `const TAB_KEYS = ['overview', …] as const`.
- The initial state checks the candidate (from state or URL) against `TAB_KEYS`, else uses `'overview'`.
- On mount, if the URL's `tab` differs from the resolved tab, call `setSearchParams({ replace: true })` once.

CLAUDE.md forbids syncing derived state through `useEffect`. Here the URL is an external system, which `useEffect` is meant for. Alternatively, do it in the same render-phase "prev" pattern used elsewhere, but a one-time URL write is a legitimate effect.

### 9. `formatRevenue`
- `NaN` or `null` → `N/A`
- `0` → `$0`
- negative → `-` + format(|n|)

Callers that pass `parseRevenue` output for a *missing* value must check for that before formatting. Tooltips for top-N charts only include movies with revenue greater than 0, so they're unaffected.

## Risks / Trade-offs

- **Chip labels like `2–3.999` look odd.** Accepted by the user in exchange for exact counts.
- **The Ant Slider might normalize off-step values and write them back.** Covered by the check in Decision 4.
- **The context adds indirection.** It's one small hook, documented in CLAUDE.md alongside the existing drill-down description.

## Open Questions

- Should the Dashboard's continuous 10-year axis end at the dataset's latest year or at the current calendar year? Defaulting to the dataset's latest year keeps the title and axis honest for old catalogues, and it doesn't change specs or tasks.
