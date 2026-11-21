## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3n "Found 2026-11-20 (Batch J review: chart wrappers, §6 rows 44–51), owned by `fix-chart-wrappers-review`" with B139–B142, the weaker "dips below zero" result, the rejected stuck-cursor finding, and that SR found nothing
- [x] 1.2 `BUG_BACKLOG.md`: mark B13 (wrapper-level fix) and B26 as owned by `fix-chart-wrappers-review`
- [x] 1.3 `BUG_BACKLOG.md` §6: tick CR + SR for rows 44–51 and Batch J; update the Progress line

## 2. Stable options (B13)

- [x] 2.1 `src/hooks/useLatest.ts`: ref updated in `useLayoutEffect`
- [x] 2.2 Bar, Line, Doughnut, PolarArea, HorizontalBar: callbacks read `useLatest`; `useMemo` deps = `isDark`, `clickable`, `hasFormat` (+ `compact`, `datasets.length` where used)
- [x] 2.3 Confirm `npm run lint` passes with `react-hooks` 7 (no ref reads/writes during render)

## 3. Tooltips (B26, B141)

- [x] 3.1 `HorizontalBarChart.tsx`: `formatNumber` default (integers as-is, ≤2 decimals, `—` for non-numbers)
- [x] 3.2 `ScatterChart.tsx`: tooltip from `xLabel`/`yLabel`; JSDoc for `pointLabels`

## 4. Line chart (B139, B140)

- [x] 4.1 `LineChart.tsx`: `interaction: { mode: 'index', intersect: false }`
- [x] 4.2 `LineChart.tsx`: `cubicInterpolationMode: 'monotone'`

## 5. Legends (B142)

- [x] 5.1 `BarChart.tsx`, `LineChart.tsx`: `legend.display` only when `datasets.length > 1`

## 6. Tests (mocked rows)

- [x] 6.1 Dashboard: click 20 px above a release-trend point → Movies filtered to that year
- [x] 6.2 Stats › People: hover the top actor bar → tooltip text has no ".00" (tooltip text read by recording `fillText`; `formatNumber` also unit-tested in `tests/unit/chartHelpers.test.ts`)
- [x] 6.3 Dashboard: the rating distribution has no legend (check through the chart instance or by clicking where the legend was and confirming the bars are still drawn)
- [x] 6.4 Overview counters: there's no simple e2e hook for chart updates. Check with a throwaway `tests/*.tmp.spec.ts` that counts `chart.update` calls via `Chart.getChart(canvas)` patched in the page, then delete it, and record the result here. **Result (2026-11-21):** counted canvas redraws (`clearRect`) on "Movies by Language" / "Movies Released per Year" in the 2.5 s after the Overview loaded: old wrappers +52 / +50, new +10 / +9 (the tail of the initial animation), so counter ticks no longer update the charts. Done with `clearRect` rather than `chart.update`, since `Chart.getChart` isn't reachable from the page.

## 7. Docs and checks

- [x] 7.1 CLAUDE.md (`src/components/Charts/*` section): callbacks go through `useLatest`, so callers don't need `useCallback`; LineChart uses index-mode interaction; single-series legends are hidden
- [x] 7.2 `npm run lint`, `npm run type-check`, `npm run test:e2e` (check ports 3000/5000 first); the cursor-based drill-down tests must still pass
- [x] 7.3 Visual check of the Dashboard trend, the Overview and Ratings year lines, and the Ratings scatter tooltip in light and dark
- [x] 7.4 Tell the user that the `useCallback` tasks in `fix-dashboard-review` (B113), `fix-stats-review` (2.4, 2.5) and `fix-stats-tabs-review` (5.1, 5.2) are now optional
- [x] 7.5 `BUG_BACKLOG.md` §6: Fix ◐ for rows 44, 45, 46, 47, 48, 51 and Batch J; rows 49, 50 (Radar, Matrix: no findings) Fix ☑
