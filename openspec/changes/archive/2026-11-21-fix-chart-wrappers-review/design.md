## Context

Batch J (`BUG_BACKLOG.md` §6 rows 44–51) reviewed `src/components/Charts/*`. Findings re-checked on 2026-11-20:

- `BarChart.tsx:49`, `LineChart.tsx:53`, `HorizontalBarChart.tsx:115`, and the matching lines in `DoughnutChart`/`PolarAreaChart`: `useMemo` deps include `onElementClick`/`isClickable` (and `formatValue`). Callers pass new functions on every render, so react-chartjs-2 runs `setOptions` and `chart.update()` each time (B13).
- `HorizontalBarChart.tsx:36-38`: `(ctx.raw as number).toFixed(2)` (B26).
- Chart.js global default `interaction: { mode: 'nearest', intersect: true }` (`chunks/helpers.segment.js:1034`). `PointElement.inRange` uses `radius + hitRadius` = 3 + 1, an 8 px circle (`chart.js:7036, 7047, 7076`) (B139).
- `LineChart.tsx:49` `tension: 0.4` with the default cubic interpolation (B140). `capBezierPoints: true` (`chart.js:6905`) clips to the chart area, so the reported "below zero" dip isn't visible when 0 is the axis bottom.
- `ScatterChart.tsx:26-28`: the tooltip hardcodes "votes" and "/10" (B141).
- `BarChart.tsx:29`, `LineChart.tsx:29`: the legend is always shown (B142).

Rejected: "stuck pointer cursor". No caller passes `onElementClick` conditionally (`grep "onElementClick={…?"` finds nothing).

## Goals / Non-Goals

**Goals:** fix B13 for every caller at once, fix the tooltip, hit-area and legend issues, and keep the cursor-based e2e drill-down tests passing.

**Non-Goals:** removing the callers' `useCallback` work in other changes (left to the user), restyling charts, and RadarChart/MatrixChart, which had no findings.

## Decisions

**D1: Latest-ref callbacks (B13).** Each clickable wrapper:
```ts
const cb = useRef({ onElementClick, isClickable, formatValue });
useLayoutEffect(() => { cb.current = { onElementClick, isClickable, formatValue }; });
const clickable = onElementClick !== undefined;
const hasFormat = formatValue !== undefined;
```
Options are built in `useMemo([isDark, clickable, hasFormat, …])`. `onClick`, `onHover` and the tick/tooltip callbacks read `cb.current` when they run. They never run during render, so `react-hooks` 7's refs rule is satisfied. The ref is assigned in a layout effect, not during render, which that rule forbids. A shared `useLatest()` hook in `src/hooks/` would remove five copies, so add it there. *Alternative:* keep relying on callers' `useCallback`. Rejected: one inline arrow anywhere brings the bug back, and three changes already had to fix it.

**D2: Tooltip precision (B26).** `formatNumber(raw)`: not a finite number → `—`; integer → `raw.toLocaleString()`; otherwise `raw.toLocaleString(undefined, { maximumFractionDigits: 2 })`. It sits in HorizontalBarChart and is used when `formatValue` is absent.

**D3: Line hit area (B139).** LineChart options get `interaction: { mode: 'index', intersect: false }`. `onClick`/`onHover` keep using the `elements` argument, which Chart.js now fills from the hovered column, so the cursor and the click still agree. `isClickable` still filters out null years (from `fix-stats-tabs-review` B136). With one dataset, `index` mode returns one element per column. *Alternative:* a bigger `point.hitRadius`. Rejected: it still needs vertical precision on a sparse line.

**D4: Monotone smoothing (B140).** `elements.line.cubicInterpolationMode: 'monotone'`, keeping `tension: 0.4`. Chart.js ignores `tension` in monotone mode, and the curve never goes above or below neighbouring points, so it stays smooth without overshooting.

**D5: Scatter tooltip (B141).** `${name}: ${xLabel ?? 'x'} ${x.toLocaleString()} · ${yLabel ?? 'y'} ${formatNumber(y)}`. A JSDoc on `pointLabels` says it's indexed by `dataIndex` of a single dataset.

**D6: Legends (B142).** `legend.display: data.datasets.length > 1` in BarChart and LineChart, with `datasets.length` added to the memo deps. Doughnut and PolarArea legends list categories, not datasets, so they stay.

## Risks / Trade-offs

- [Index-mode hover makes the line's whole plot area hoverable] → Intended: the tooltip follows the nearest year.
- [A layout effect per wrapper] → It's one assignment, cheaper than a chart update.
- [Monotone curves look slightly flatter than the current ones] → Accepted: they no longer show values that aren't in the data.
