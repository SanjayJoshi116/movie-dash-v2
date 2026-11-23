## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3q "Found 2026-11-20 (Batch M review: e2e spec + helpers, §6 rows 67, 73), owned by `fix-e2e-review`" with B162–B171 and SR's result
- [x] 1.2 `BUG_BACKLOG.md` §6: tick CR + SR for rows 67, 73 and Batch M; update the Progress line to 75 of 75

## 2. Write guard (B164)

- [x] 2.1 `helpers.ts`: guard on `context.route`; GET-only `request` fixture
- [x] 2.2 `eslint.config.mjs` (`tests/**`): ban `.request.(post|put|patch|delete|fetch)` and `newContext`
- [x] 2.3 Throwaway `tests/*.tmp.spec.ts`: page-level `mockMovies` still wins; an unmocked DELETE from a second `context.newPage()` is aborted; `request.delete` throws. Delete the spec after

## 3. Shared buckets (B166)

- [x] 3.1 `src/utils/chartBuckets.ts`: move `RATING_BUCKETS` (Dashboard) and `VOTE_BUCKETS` (RatingsTab) unchanged; update both imports
- [x] 3.2 `app.spec.ts`: replace `voteBucketCounts` with `countIntoBuckets` + the shared buckets; require the clicked bucket's count > 0, or skip with "no rated movies"

## 4. Tests that can pass when broken (B162, B163, B170)

- [x] 4.1 Director, runtime and revenue tests on mocked rows; the expected total comes from the chip's committed bounds, with unknown values excluded
- [x] 4.2 Combined filters: compute the AND count, check it's > 0, `expectTotal`, then the cells
- [x] 4.3 Merge the pagination visibility test into "second page of pagination loads"; rewrite the rating-colour test on a mocked 8.5-rated movie and check the tag colour; keep 65 tests / 13 suites

## 5. Helpers (B165, B167, B168, B169, B171)

- [x] 5.1 `yearSpan`: loop, `null` with no years; both callers skip with the same reason
- [x] 5.2 Language test: count by code; skip when the name maps to several codes (B146)
- [x] 5.3 `selectInDrawer`: exact title match + `toBe`; `chooseOption`: `getByTitle(…, { exact: true })`
- [x] 5.4 Remove the duplicate `paginationTotal` JSDoc

## 6. Checks

- [x] 6.1 Break each target once and confirm its test fails, then revert:
  - drop the director/runtime/revenue checks in `Movies.tsx`
  - switch search+language to OR
  - change a bound in `RATING_BUCKETS`
- [x] 6.2 `npm run lint`, `npm run type-check`, `npm run test:e2e` on the real CSV and with `CI=1` on the template CSV (check ports 3000/5000 first)
- [x] 6.3 CLAUDE.md: the guard covers the context and the `request` fixture (lint bans `.request` writes and `newContext`); `chartBuckets.ts` shared by the app and e2e
- [x] 6.4 `BUG_BACKLOG.md` §6: Fix ◐ for rows 67, 73 and Batch M
