## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3l "Found 2026-11-20 (Batch I1 review: Stats page, §6 rows 25, 36–38, 43), owned by `fix-stats-review`" with B131–B135, the weakened toolbar finding (no page scroll, Select squeezed to 87 px), and that SR found nothing
- [x] 1.2 `BUG_BACKLOG.md`: mark B4, B24 (Stats part), B25, B34 and B13 (OverviewTab/ExploreTab part) as owned by `fix-stats-review`
- [x] 1.3 `BUG_BACKLOG.md` §6: tick CR + SR for rows 25, 36, 37, 38, 43 and Batch I1; update the Progress line

## 2. Overview tab (B4, B24, B135, B134, B13)

- [x] 2.1 `OverviewTab.tsx`: per-year counts from parsed years (skip NaN), labels from min to max year with 0 for gaps; `isClickable` = count > 0
- [x] 2.2 `OverviewTab.tsx`: earliest/latest in one loop as `number | null`; `MetricGroupCard` renders `null` as "—" with no suffix
- [x] 2.3 `OverviewTab.tsx`: remove `hoverBackgroundColor` from the language dataset
- [x] 2.4 `OverviewTab.tsx`: `useCallback` for `handleLanguageClick`/`handleYearClick` and both `isClickable` predicates
- [x] 2.5 `ExploreTab.tsx`: `useCallback` for `handleGenreClick`
- [x] 2.6 `DrilldownContext.tsx`: check that `useDrillDown()` returns a stable function, and memoize it if it doesn't

## 3. Stats page (B25, B131)

- [x] 3.1 `Stats.tsx`: `movies.length === 0` → `Empty` + "Go to Movies" button instead of the slider card and tabs
- [x] 3.2 `Stats.tsx`: `scopedMovies.length === 0` → `Empty` ("No movies released in this range") + Reset in place of `Tabs`
- [x] 3.3 `Stats.tsx`: render-phase `prevBounds` clamp of `yearRange` (reset to `null` when there's no overlap or it covers the full span)

## 4. Top 10 explorer (B132, B133, B34)

- [x] 4.1 `TopNExplorer.tsx`: toolbar `flexWrap: 'wrap'`, `rowGap: 8`; Select `maxWidth: '100%'`
- [x] 4.2 `TopNExplorer.tsx`: `oldest` ranks by `Release Date`, falling back to Jan 1 of `Release Year`, otherwise NaN; display matches `most_recent`; date metrics aren't dropped for raw 0
- [x] 4.3 `TopNExplorer.tsx`: text colours → `var(--text-primary)` / `var(--text-secondary)`

## 5. Tests (Stats Page suite, mocked rows)

- [x] 5.1 Undated + gap-year rows → Overview per-year chart has no "Unknown" label and covers the full span (check the chart's labels via a test hook or the drill-down on a known year)
- [x] 5.2 Range inside a data gap → Explore/Overview tabs replaced by the empty state; Reset shows the previous tab again
- [x] 5.3 `mockMovies(page, [])` → Stats shows the empty state and "Go to Movies" navigates to `/movies`
- [x] 5.4 Narrow the range, then use the `mockMovies` updater + refetch with a smaller max year → label is clamped, and Reset is hidden when the range covers everything
- [x] 5.5 "Oldest" with an undated row and two same-year rows → undated row absent, earlier date first
- [x] 5.6 320 px viewport, ≥10 rows with ≥50 votes → Select's width is 200 and the page doesn't scroll sideways

## 6. Docs and checks

- [x] 6.1 CLAUDE.md: Stats empty states, the year-range clamp, and the Overview per-year chart zero-filling (next to the Dashboard trend note)
- [x] 6.2 `npm run lint`, `npm run type-check`, `npm run test:e2e` (check ports 3000/5000 first)
- [x] 6.3 Visual check of Stats Overview and Explore in light and dark themes, plus at 320 px
- [x] 6.4 `BUG_BACKLOG.md` §6: Fix ◐ for rows 25, 36, 38, 43 and Batch I1; row 37 (`ChartBlock.tsx`, no findings) Fix ☑
