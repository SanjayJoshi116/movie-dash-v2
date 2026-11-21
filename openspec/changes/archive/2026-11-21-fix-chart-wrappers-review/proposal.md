## Why

The Batch J `/code-review` (high) of the chart wrappers (`BUG_BACKLOG.md` §6 rows 44–51, `src/components/Charts/*`) reported 7 issues. All were checked against the code and Chart.js 4's own defaults in `node_modules` on 2026-11-20:

- **Confirmed, already logged:** B13 (options memo defeated by new callbacks every render) and B26 (count tooltips show 2 decimals). For B26, the reviewer also found that a `null` value throws inside the tooltip callback.
- **Confirmed, new:** the small line-point hit area (B139), smoothing that bends past the data (B140, weaker than reported), hardcoded scatter tooltip units (B141), and a legend on single-series charts (B142).
- **Weaker than reported (B140):** "the curve dips below zero". Chart.js's `capBezierPoints: true` (on by default) clips control points to the chart area, so when 0 is the axis bottom the curve can't visibly go below it. It still bends past points elsewhere.
- **Rejected:** "the pointer cursor stays stuck when `onElementClick` is removed". No caller passes `onElementClick` conditionally, so it can't happen.

The `/security-review` found nothing.

B13 is currently fixed caller by caller with `useCallback` in three proposed changes (`fix-dashboard-review` B113, `fix-stats-review` 2.4/2.5, `fix-stats-tabs-review` 5.1–5.2). Fixing it inside the wrappers covers every caller, including future ones. If this change lands first, those tasks become optional cleanups.

## What Changes

- **B13: wrappers rebuild options on every parent render.** Bar, Line, Doughnut, PolarArea and HorizontalBar keep `onElementClick`, `isClickable` and `formatValue` in a ref that is updated in a layout effect. Chart.js callbacks read that ref, so `useMemo` depends only on `isDark`, whether a click handler or formatter exists, and (for Doughnut) `compact`.
- **B26: HorizontalBar tooltips show `23.00`.** Without `formatValue`, integers print as-is (`toLocaleString`) and other numbers with up to 2 decimals. A `null` or non-number value shows "—" instead of throwing.
- **B139: line points are hard to hover or click** (8 px hit circle). LineChart uses `interaction: { mode: 'index', intersect: false }`, so hovering anywhere over a year's column targets that year. `onClick` and `onHover` use the same element list, so the pointer cursor still matches what is clickable.
- **B140: smoothed lines bend past the data.** Add `cubicInterpolationMode: 'monotone'`, which keeps `tension` but never goes above or below neighbouring points.
- **B141: Scatter tooltip says "votes" and "/10" whatever the axes are.** Build it from `xLabel` and `yLabel` (`Name: Vote Count 1,234 · Vote Average 7.5`). The single caller (RatingsTab) passes those labels already.
- **B142: single-series Bar and Line charts show a legend whose only entry hides all the data.** Show the legend only when there is more than one dataset.
- Bookkeeping: log B139–B142 and the rejected cursor finding in `BUG_BACKLOG.md` §3n, mark B13 (wrapper fix) and B26 as owned by this change, tick CR/SR for rows 44–51 and Batch J, and set Fix ◐ once implemented.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `frontend-performance`: a parent re-render that doesn't change a chart's data or theme doesn't update the chart.
- `analytics-drilldown`: line-chart points are easy to target, chart tooltips show values at their real precision, and single-series charts have no legend that can hide all the data.

## Impact

- Code: `src/components/Charts/BarChart.tsx`, `LineChart.tsx`, `DoughnutChart.tsx`, `PolarAreaChart.tsx`, `HorizontalBarChart.tsx`, `ScatterChart.tsx`. `RadarChart.tsx` and `MatrixChart.tsx` take no callbacks and are unchanged.
- Callers: no API change. Existing `useCallback` work in the other three changes still compiles and becomes optional.
- Tests: new e2e cases (Stats Page and Dashboard suites, mocked rows). The existing drill-down tests use the cursor to find bars, not line points, and must still pass.
- No server changes.
- Spec overlap: no other open change edits `frontend-performance`. In `analytics-drilldown`, this change only adds requirements, as `fix-stats-review` and `fix-stats-tabs-review` do. `fix-movies-filtering-review` modifies one existing requirement there, which this change doesn't touch.
