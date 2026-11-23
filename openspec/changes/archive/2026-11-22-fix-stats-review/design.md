## Context

Batch I1 (`BUG_BACKLOG.md` §6 rows 25, 36, 37, 38, 43) reviewed the Stats page. Findings re-checked against the code on 2026-11-20:

- `OverviewTab.tsx:121-122`: `groupByField(movies, 'Release Year')` turns blank years into `'Unknown'` (`statsHelpers.ts:22`), and `parseInt(a) - parseInt(b)` returns NaN for that key. There is no gap-filling (B4).
- `OverviewTab.tsx:74-75`: with no years, both values fall back to `0`, and `noGrouping` prints that 0 (B24). The same lines spread `years` into `Math.min/max` (B135).
- `Stats.tsx`: no `movies.length === 0` branch. With no data, `yearMin`/`yearMax` fall back to 1900/now (B25).
- `Stats.tsx:40, 113-115`: `yearRange` changes only on commit or Reset. After a refetch changes `yearMin`/`yearMax`, the label shows the old range while the Slider clamps its handles (B131).
- `TopNExplorer.tsx:82`: the flex row has no wrap. Playwright with 12 mocked movies at 320 px: no page scroll (`scrollWidth === clientWidth`), but the Select is 87 px wide instead of 200 (B132).
- `TopNExplorer.tsx:35`: `-(parseInt(year) || 9999)` gives undated movies a finite raw value of -9999, so the `isFinite`/`!== 0` filter keeps them. `Array.sort` is stable, so same-year movies stay in CSV order (B133).
- `TopNExplorer.tsx:73-75`: `textMuted` in light theme is `rgba(30,30,63,0.45)` (B34).
- `OverviewTab.tsx:116`: `hoverBackgroundColor: CHART_PALETTE` (B134).
- `OverviewTab.tsx:137-147, 207, 210`, `ExploreTab.tsx:78-82`: handlers and `isClickable` arrows are new on every render, and the chart wrappers key their options `useMemo` on them (B13).

## Goals / Non-Goals

**Goals:** fix the issues above without changing how Stats looks when there's data, cover each behaviour change with a mocked e2e test, and keep drill-down counts correct.

**Non-Goals:** the null `.split` guard (B17, owned by `fix-movies-views-review`), `highest_rated`'s pool (owned by `fix-dashboard-review`), a wrapper-level fix for B13 in every chart (only this batch's call sites change here), the other Stats tabs (later batches).

## Decisions

**D1: Per-year chart (B4).** Build the counts from parsed years (`parseInt(...)`, skip NaN) instead of `groupByField`. Labels run from the lowest to the highest year in scope, with 0 for missing years. `isClickable(i)` is `count > 0`, so a zero year can't be clicked and the drill-down count rule still holds. Undated movies are left off the chart but still count in Total Movies. *Alternative:* keep `groupByField` and just filter out `'Unknown'`. Rejected: gap years would still look like neighbours on the category axis.

**D2: Unknown year span (B24, B135).** One loop computes `earliest`/`latest` as `number | null`. `MetricGroupCard`'s `value` becomes `number | null`, and `null` renders "—" with no suffix.

**D3: Empty states (B25).** Inside the `LoadingError` wrapper:
- `movies.length === 0`: an Ant `Empty` (`PRESENTED_IMAGE_SIMPLE`, "No movies yet") with a "Go to Movies" button, in place of the slider card and the tabs, as on the Dashboard.
- `movies.length > 0 && scopedMovies.length === 0`: the slider card stays, and an `Empty` ("No movies released in this range") with a Reset button replaces the `Tabs`. `activeTab` and the `?tab=` sync are untouched, so resetting shows the same tab.

**D4: Clamp the year range (B131).** Track `prevBounds` (`[yearMin, yearMax]`) in state. When it changes during render and `yearRange` is set: clamp it to `[max(lo, yearMin), min(hi, yearMax)]`. Set it to `null` if `lo > hi` or the result covers the full span. Same render-phase pattern as `App.tsx` and `Movies.tsx`. Unlike Movies, a range with no overlap is reset rather than kept: Stats has no chip to show it, and the Slider can't draw it.

**D5: Top 10 toolbar (B132).** Toolbar row: `flexWrap: 'wrap'`, `rowGap: 8`. Select: `width: 200, maxWidth: '100%'`, so it keeps its width and the vote note moves to the next line.

**D6: Oldest (B133).** `raw` = negative timestamp of `Release Date` if it parses. Otherwise Jan 1 of `Release Year` if it parses. Otherwise `NaN`, so the existing filter drops the movie. Display matches Most Recent: `formatDateDDMMYYYY` when the date is valid, otherwise the year. The filter keeps `v !== 0` for the other metrics. For `oldest`, a 1970-01-01 date gives raw 0, so the filter checks `!isNaN && isFinite` only for date metrics.

**D7: Top 10 colours (B34).** `textPrimary` → `var(--text-primary)`, `textSecondary` and `textMuted` → `var(--text-secondary)`. The row/rank/border backgrounds keep their `isDark` branches. They are surfaces, not text, and are out of scope.

**D8: Stable chart callbacks (B13 part).** `useCallback` for `handleLanguageClick`, `handleYearClick` (deps: the memoized codes/labels and `drillDown`) and ExploreTab's `handleGenreClick`. `useCallback` predicates replace the inline `isClickable` arrows. `useDrillDown()` must return a stable function. Check `DrilldownContext.tsx` during apply, and memoize it there if it doesn't.

**D9: Hover (B134).** Delete `hoverBackgroundColor`, so Chart.js derives the hover colour.

## Risks / Trade-offs

- [A wide year span gives the per-year line many points (e.g. 127 for 1900–2026)] → Chart.js handles that easily. Labels already auto-skip on the category axis.
- [Resetting a range that no longer overlaps loses the user's choice] → It only happens when the data itself moved out of the range, and the label would be wrong otherwise.
- [Same-file edits with `fix-dashboard-review`] → Different lines. Whichever change is applied second rebases.
