## Why

The Batch I2 `/code-review` (high) of the remaining Stats tabs (`BUG_BACKLOG.md` §6 rows 39–42: `PeopleTab.tsx`, `RatingsTab.tsx`, `RuntimeTab.tsx`, `BoxOfficeTab.tsx`) reported 10 issues. All were checked against the code on 2026-11-20:

- **Confirmed, already logged:** B6 (rating averages count unrated movies), B18 (language radar can plot a fake 0.0 "Unknown" spoke), and the rest of B13 (chart options rebuilt on every render).
- **Confirmed, owned by other changes:** runtime 0 is bucketed as "< 60 min" (B119, `fix-movies-filtering-review` task 3.3), and `Actors/Actresses` has an unguarded `.split` (B17, `fix-movies-views-review`).
- **Confirmed, new:** B136–B138.
- **Rejected (2):** "an empty runtime bucket shows Avg Vote 0.00 and can be clicked into an empty list" and "zero-count vote bars can be clicked". A bar with value 0 has no size. Chart.js 4 only hits a bar when the pointer is inside its bounds (`inRange` → `_isBetween`, epsilon 1e-6), and the default interaction is `intersect: true`. So that bar can't be hovered or clicked, and its "0.00" tooltip never shows.

The `/security-review` found nothing.

## What Changes

- **B6: unrated movies drag rating averages down.** `PeopleTab.tsx:54,74`, `RatingsTab.tsx:41,65,92`, `RuntimeTab.tsx:179` check only `isNaN(v)`. A shared `parseVote()` in `statsHelpers.ts` returns `null` for NaN or `≤ 0`, and every average skips those movies. `MIN_FILMS` counts rated films only.
- **B18: language radar has an "Unknown" / 0.0 spoke** (`RatingsTab.tsx:71-73`). Take the top 8 from the languages that have rated movies, so every spoke is a real average.
- **B136: "Average Vote by Year" skips years with no data** (`RatingsTab.tsx:87-109`). Labels cover every year from first to last. Years with no rated movie are `null`, so the line breaks there, and they can't be clicked.
- **B137: radar point borders are hardcoded hex** (`RatingsTab.tsx:82`). Remove `pointBorderColor`; Chart.js falls back to the dataset's `borderColor` (`CHART_PRIMARY`).
- **B138: scatter sets `hoverBackgroundColor`** (`RatingsTab.tsx:125`). Remove it, as CLAUDE.md asks.
- **B13 (People/Ratings/Runtime/BoxOffice part): new callbacks on every render.** `useCallback` the click handlers and `isClickable` predicates. Move `formatRoi` and `MIN_BUDGET_FOR_ROI` in `BoxOfficeTab.tsx` to module scope.
- Bookkeeping: log B136–B138 and the two rejected findings in `BUG_BACKLOG.md` §3m, mark B6, B18 and the remaining B13 part as owned by this change, tick CR/SR for rows 39–42 and Batch I2, and set Fix ◐ once implemented.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `analytics-drilldown`: Stats rating averages leave out unrated movies, and the per-year average line covers a continuous span.

## Impact

- Code: `src/components/StatsTabs/PeopleTab.tsx`, `RatingsTab.tsx`, `RuntimeTab.tsx`, `BoxOfficeTab.tsx`, `src/utils/statsHelpers.ts` (`parseVote`).
- Tests: new mocked e2e cases in `tests/app.spec.ts` (Stats Page suite).
- No server changes.
- Overlap:
  - `fix-movies-filtering-review` task 3.3 edits the same `RuntimeTab.tsx` bucket loop (it adds `r > 0`), and this change adds the vote check on the next line. Whichever is applied second rebases.
  - `fix-stats-review` (D1) builds a continuous year axis for Overview. If it lands first, reuse its helper for B136 rather than writing a second one.
  - Spec deltas: both other changes edit `analytics-drilldown` with different requirements (`fix-movies-filtering-review` modifies "Unknown numeric values are excluded by range filters"; `fix-stats-review` only adds), and this change only adds. They don't conflict.
