## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3m "Found 2026-11-20 (Batch I2 review: Stats tabs, §6 rows 39–42), owned by `fix-stats-tabs-review`" with B136–B138, the two rejected zero-bar findings and why, the findings owned elsewhere (B119, B17), and that SR found nothing
- [x] 1.2 `BUG_BACKLOG.md`: mark B6, B18 and B13's People/Ratings/Runtime/BoxOffice part as owned by `fix-stats-tabs-review`
- [x] 1.3 `BUG_BACKLOG.md` §6: tick CR + SR for rows 39–42 and Batch I2; update the Progress line

## 2. Unrated votes (B6, B18)

- [x] 2.1 `statsHelpers.ts`: add `parseVote(raw)` → `number | null` (finite and > 0)
- [x] 2.2 `PeopleTab.tsx`: director and actor averages use `parseVote`
- [x] 2.3 `RatingsTab.tsx`: genre, language and year averages, plus the histogram and scatter, use `parseVote`
- [x] 2.4 `RuntimeTab.tsx`: runtime-bucket average uses `parseVote`
- [x] 2.5 `RatingsTab.tsx`: radar top 8 from `sums` (rated count desc, code asc)

## 3. Year line (B136)

- [x] 3.1 `RatingsTab.tsx`: labels from min to max year, `null` for empty years, `isClickable` = not null (reuse `fix-stats-review`'s year-span helper if it has landed)

## 4. Chart colours (B137, B138)

- [x] 4.1 `RatingsTab.tsx`: remove the radar `pointBorderColor` and the scatter `hoverBackgroundColor`

## 5. Stable callbacks (B13)

- [x] 5.1 `useCallback` for every chart click handler in the four tabs, plus `useCallback` predicates for the inline `isClickable` arrows; `RuntimeTab` `maxRuntime` → `useMemo`
- [x] 5.2 `BoxOfficeTab.tsx`: `formatRoi` and `MIN_BUDGET_FOR_ROI` at module scope
- [x] 5.3 `DrilldownContext.tsx`: check that `useDrillDown()` is stable (skip if `fix-stats-review` 2.6 is done)

## 6. Tests (Stats Page suite, mocked rows)

- [x] 6.1 Two films by one director, one 8.0 and one unrated, plus other directors with 2+ rated films → that director isn't in "Highest Rated Directors"; the Directors drill-down still lists both films
- [x] 6.2 Rows with an empty Language → radar labels contain no "Unknown" (read them through the chart instance or an exposed test hook)
- [x] 6.3 Rated rows only in 1962 and 1971 → year line labels cover 1962–1971, and clicking a 1962 point drills down to that year

## 7. Docs and checks

- [x] 7.1 CLAUDE.md: `parseVote` is the one rule for "vote 0 = unrated" in Stats charts (`statsHelpers.ts` section)
- [x] 7.2 `npm run lint`, `npm run type-check`, `npm run test:e2e` (check ports 3000/5000 first)
- [x] 7.3 Visual check of the Ratings tab (radar points, scatter hover, broken year line) in light and dark
- [x] 7.4 `BUG_BACKLOG.md` §6: Fix ◐ for rows 39–42 and Batch I2
