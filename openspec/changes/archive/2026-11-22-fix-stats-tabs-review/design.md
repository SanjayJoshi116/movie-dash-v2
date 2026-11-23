## Context

Batch I2 (`BUG_BACKLOG.md` §6 rows 39–42) reviewed the People, Ratings, Runtime and Box Office tabs. Findings re-checked against the code on 2026-11-20:

- `PeopleTab.tsx:53-54, 73-74`, `RatingsTab.tsx:40-41, 64-65, 90-92`, `RuntimeTab.tsx:47-48` (file lines 178-179 in the review): averages check `!isNaN(v)` only. The vote histogram (`RatingsTab.tsx:32`) and scatter (`:116`) already skip `v <= 0` (B6).
- `RatingsTab.tsx:71-73`: `top8` comes from `groupByField(movies, 'Language')`, which buckets blank languages as `'Unknown'`. `sums` skips blank languages, so `'Unknown'` (or a language with no rated film) gets a 0 (B18).
- `RatingsTab.tsx:98`: years appear only when they have data, on a category axis (B136).
- `RatingsTab.tsx:82`: `pointBorderColor: isDark ? '#fff' : '#1e1e3f'` (B137). `RatingsTab.tsx:125`: `hoverBackgroundColor: CHART_PRIMARY` (B138).
- Handlers in all four tabs and inline `isClickable` arrows (`PeopleTab.tsx:112`, `RuntimeTab.tsx:250`) are new on every render. `BoxOfficeTab.tsx:93, 112` defines `MIN_BUDGET_FOR_ROI` and `formatRoi` inside the component, and `formatRoi` is passed as `formatValue` (B13).

Rejected: a zero-value bar has no area. Chart.js `BarElement.inRange` (`node_modules/chart.js/dist/chart.js:7205`) uses `_isBetween` with a 1e-6 epsilon, and the default interaction is `nearest` with `intersect: true`. So empty runtime buckets and zero-count vote bars can't be hovered or clicked.

## Goals / Non-Goals

**Goals:** fix B6, B18, B136–B138 and the rest of B13 in these four tabs, with no change to how charts look when every movie is rated.

**Non-Goals:**
- Runtime 0 (B119, `fix-movies-filtering-review`) and missing-field `.split` (B17, `fix-movies-views-review`).
- B41 (duplicated aggregation code). Only `parseVote` is shared here.
- Defensive `isClickable` on zero bars (rejected above).
- A wrapper-level fix for B13.

## Decisions

**D1: `parseVote` (B6).** `statsHelpers.ts`: `parseVote(raw: string | undefined): number | null` returns `parseFloat(raw)` when it's finite and > 0, otherwise `null`. Every average in the four tabs uses it and skips `null`. The histogram and scatter switch to it too, with no behaviour change, so all rating code has one rule. `MIN_FILMS` then counts rated films only, as B6 asks: a director with one rated and one unrated film no longer qualifies for "2+ films".

**D2: Radar languages (B18).** Top 8 = entries of `sums` (languages with ≥1 rated movie), sorted by `count` descending, then by code for ties. Spokes are always real averages. A blank language never reaches `sums`.

**D3: Continuous year line (B136).** Build `{ year → {sum, count} }` from parsed years (`parseInt`, skip NaN). Labels run from min to max year. Data is `average | null`, and `spanGaps` is left at its default (`false`), so the line breaks across empty years instead of drawing a straight line across them. `isClickable(i)` = data is not null. If `fix-stats-review` is archived first, reuse its year-span helper.

**D4: Colours (B137, B138).** Delete `pointBorderColor`; Chart.js resolves point borders from the dataset `borderColor` (`CHART_PRIMARY`). Delete the scatter `hoverBackgroundColor`; the derived hover colour still differs from the 0.5-alpha fill. Check both visually in light and dark during apply.

**D5: Stable callbacks (B13).** `useCallback` for `handleDirectorClick`, `handleAvgVoteDirectorClick`, `handleGenreClick` (Runtime, Ratings and BoxOffice), `handleRuntimeBucketClick`, `handleDecadeClick`, `handleVoteBucketClick` and `handleYearClick`. Deps are the memoized chart data plus `drillDown`. `RuntimeTab`'s `maxRuntime` moves into a `useMemo`. `useCallback` predicates replace the inline `isClickable` arrows. `formatRoi` and `MIN_BUDGET_FOR_ROI` move to module scope. Whether `useDrillDown()` is stable is checked in `fix-stats-review` task 2.6; if that change isn't applied yet, do the same check here.

## Risks / Trade-offs

- [Top-15 "Highest Rated" lists change for catalogues with unrated rows] → Intended: the old values were wrong.
- [A line broken by gaps looks sparse for patchy old years] → It's accurate. Hover still works on every real point.
- [Same lines as `fix-movies-filtering-review` 3.3 in `RuntimeTab.tsx`] → Whichever change is applied second rebases.
