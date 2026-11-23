## Why

The Batch I1 `/code-review` (high) of the Stats page (`BUG_BACKLOG.md` §6 rows 25, 36, 37, 38, 43: `Stats.tsx`, `TopNExplorer.tsx`, `ChartBlock.tsx`, `OverviewTab.tsx`, `ExploreTab.tsx`) reported 10 issues. All were checked against the code on 2026-11-20. 9 are confirmed as reported. One is confirmed in a weaker form: it claimed the Top 10 toolbar makes the page scroll sideways on a phone, but a Playwright check at 320 and 375 px showed no horizontal scroll. Instead, the Select shrinks to 87 px and cuts off its label. The `/security-review` found nothing.

Five of the issues were already in the backlog (B4, B24 Stats part, B25, B34). Five are new and logged as B131–B135. The open OverviewTab/ExploreTab part of B13 (chart options rebuilt on every render) is in the same files and is fixed here too.

## What Changes

- **B4: "Movies Released per Year" has an "Unknown" point and skips gap years** (`OverviewTab.tsx:120-135`). Leave out undated movies, sort the years as numbers, and fill every year from first to last with 0 (zero years can't be clicked).
- **B24 (Stats part): Earliest and Latest Release show "0"** when no movie in scope has a year (`OverviewTab.tsx:71-77`). Show "—" instead.
- **B25: Stats has no empty state** (`Stats.tsx`). An empty catalogue shows an `Empty` with "Go to Movies", like the Dashboard. A year range with no releases shows an `Empty` with a Reset button in place of the tabs.
- **B34: Light-theme text in Top 10 is too faint** (`TopNExplorer.tsx:73-75`). Use the `--text-primary`/`--text-secondary` tokens instead of hardcoded rgba values.
- **B13 (OverviewTab/ExploreTab part): chart options rebuild on every render.** `useCallback` the click handlers and memoize the `isClickable` predicates, so the count-up animation stops forcing ~100 chart updates.
- **B131: Release Year Range isn't re-checked when the data changes** (`Stats.tsx:40, 113`). Clamp it to the new span (render-phase prev-value pattern). Reset it if it no longer overlaps or covers the whole span.
- **B132: Top 10 metric Select shrinks to 87 px at 320 px** and cuts off "Highest Rated" (`TopNExplorer.tsx:82-88`). The toolbar wraps instead.
- **B133: "Oldest" ranks undated movies and orders same-year ties by file position** (`TopNExplorer.tsx:34-35`). Rank by release date (falling back to the year), and leave out movies with neither.
- **B134: Language bars have no hover feedback** (`OverviewTab.tsx:116`). Remove `hoverBackgroundColor`, which CLAUDE.md says to leave unset.
- **B135: `Math.min(...years)` / `Math.max(...years)` can throw `RangeError` on a very large catalogue** (`OverviewTab.tsx:74-75`, nit). Use a single loop, as `Stats.tsx` does.
- Bookkeeping: log B131–B135 in `BUG_BACKLOG.md` §3l, mark B4/B24/B25/B34 and the B13 part as owned by this change, tick CR/SR for rows 25, 36–38, 43 and Batch I1, and set Fix ◐ once implemented.

Not included: the `m.Genres.split` without a null check in ExploreTab (B17) is owned by `fix-movies-views-review`. `ChartBlock.tsx` had no findings.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `analytics-drilldown`: the Stats per-year chart is ordered and continuous, the Stats summary doesn't show unknown years as 0, the Release Year Range stays inside the data, Stats has empty states, and "Oldest" ranks by known release dates only.
- `accessible-ui`: "Content is legible in both themes" also covers Top 10 row text and the explorer toolbar at phone width.

## Impact

- Code: `src/pages/Stats.tsx`, `src/components/TopNExplorer.tsx`, `src/components/StatsTabs/OverviewTab.tsx`, `src/components/StatsTabs/ExploreTab.tsx`. `ChartBlock.tsx` is unchanged.
- Tests: new mocked e2e cases in `tests/app.spec.ts` (Stats Page suite). The existing Stats slider/Reset and drill-down tests must still pass.
- No server changes.
- Overlap: `fix-dashboard-review` task 2.2 switches `TopNExplorer`'s `highest_rated` pool to a shared `ratingPool()`. This change edits other lines of the same file (`oldest`, colours, toolbar). Whichever is applied second rebases onto the first. The spec deltas don't overlap: that change modifies "Top-rated rankings require meaningful vote counts", and this one modifies "Content is legible in both themes".
