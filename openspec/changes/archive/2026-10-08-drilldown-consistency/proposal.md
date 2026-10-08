## Why

Clicking a chart bar on the Dashboard or Stats page is supposed to open the Movies page showing exactly the movies that bar represents. Today it often doesn't (audit findings F2–F5, F10, F12, F19, C1 and C4 in `docs/audit-findings-2026-10-08.md`):
- Stats drill-downs ignore the page's Release Year Range.
- Chart buckets are half-open but the filter is inclusive, so boundary movies show up in two buckets.
- An "Unknown" bar opens an empty list.
- Movies with no recorded revenue (0) pass any revenue filter that starts at 0. That's 1,060 of the user's 1,961 rows.

Charts also mislabel values: money axes read "N/A" at zero, palette colours repeat once there are more than 8 categories, and the "last 10 years" trend skips empty years. When the chart count and the opened list disagree, users stop trusting the analytics.

## What Changes

- **Year scope carries through.** Every Stats drill-down applies the current Release Year Range scope as well as the clicked category. A decade click is intersected with the scope.
- **Counts match.** Drill-down ranges cover exactly the bar's bucket:
  - The filter stays inclusive.
  - Clicks send a tightened upper bound: runtime `[90, 119]`, vote `[2, 3.999]`.
  - The open-ended "> 180 min" bucket uses the dataset's real maximum.
  - Range chips show the actual bounds.
- **Unknown values.** Bars for unknown or empty categories ("Unknown") are not clickable, the same as "Other" today.
- **Unknown numeric values are excluded from range filters.** Revenue ≤ 0 counts as unknown, matching how a missing runtime is handled. A vote average of 0 counts as unrated, matching how the Dashboard rating chart already skips it.
- **Stats tab links.**
  - An unknown `?tab=` value falls back to Overview.
  - Arriving through a drill-down hand-off writes `?tab=` to the URL right away, so the URL can be shared immediately.
- **Money formatting.** Zero shows as `$0` and negative amounts as `-$X`. "N/A" is used only where the value is missing.
- **Category cap.** Category charts show at most 7 named categories plus "Other", so the 8-colour palette never repeats. OverviewTab's language chart moves off its leftover 15-colour palette.
- **Trend axis.** The Dashboard's "last 10 years" trend is a continuous 10-year axis that includes years with zero releases.

## Capabilities

### New Capabilities
- `analytics-drilldown`: how charts on the Dashboard and Stats pages summarize the catalogue, and the guarantee that clicking a chart element opens the Movies page filtered to exactly the movies that element counted.

### Modified Capabilities
<!-- None — no existing main specs; refine-app-ui's dashboard-layout/design-system deltas are unarchived and cover layout/tokens, not drill-down semantics -->

## Impact

- `src/pages/Stats.tsx`: tab validation, URL sync on arrival, passing the year scope to the tabs.
- `src/components/StatsTabs/*`: drill-down handlers (scope merge, bucket bounds, non-clickable Unknown/Other), category capping, palette.
- `src/pages/Dashboard.tsx`: rating-bucket drill-down bounds, continuous year axis.
- `src/pages/Movies.tsx`: revenue and vote range filtering of unknown values.
- `src/utils/statsHelpers.ts`: `formatRevenue`, and a `topN`-plus-"Other" helper replacing threshold-based `withOther` for chart use.
- `src/utils/filterChips.ts`: range chip formatting.
- `src/components/FiltersDrawer.tsx`: slider bounds that can hold a drill-down range (e.g. runtime beyond 180).
