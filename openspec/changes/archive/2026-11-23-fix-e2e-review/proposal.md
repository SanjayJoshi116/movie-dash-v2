## Why

The Batch M `/code-review` (high) of the e2e suite (`BUG_BACKLOG.md` §6 rows 67, 73: `tests/app.spec.ts`, `tests/helpers.ts`) reported 10 issues. All were confirmed by reading the specs and the app code on 2026-11-20. None is a production bug. Two tests pass when the feature they name is broken. The write guard that CLAUDE.md promises ("e2e can never write the real CSV") covers only the `page` route table. The rest are fragile helpers and test names that claim more than they check. The reviewer left out the already-logged B33, B48 and B146. The `/security-review` found no current way to write the real catalogue: every spec uses the guarded `page`, its own mocks hand unhandled requests back with `route.fallback()`, and `page.request` is only used for `GET /api/movies`.

This is the last batch. With it, all 75 modules have been reviewed.

## What Changes

**Tests that pass when the feature is broken:**
- **B162: director, runtime and revenue filter tests check only the chip** (`app.spec.ts:368-395`). Fix: run them on mocked rows with known directors, runtimes and revenues, and assert the exact `expectTotal()` after each filter.
- **B163: "multiple filters combined" never checks the combined count** (`app.spec.ts:764-776`). It reads `allInnerTexts()` straight away, so an empty table passes. Fix: compute `matchesSearch(m, 'a') && <language matches>`, require it to be > 0, call `expectTotal()`, then check the cells.

**Write-guard gaps:**
- **B164: the guard routes only `page`** (`helpers.ts:17`). `page.request`, the `request` fixture and new pages or contexts skip it. No spec misuses this today. Fix:
  - Register the guard on the context (`context.route`), so any page the test opens is covered.
  - Override the `request` fixture with a GET-only wrapper.
  - Add a lint ban on `.request.{post,put,patch,delete,fetch}` and on `newContext` in `tests/`.
  - `fetchMovies` keeps using `page.request.get`.

**Fragile helpers and expectations:**
- **B165: `yearSpan()` returns ±Infinity with no years and spreads into `Math.min/max`** (`helpers.ts:174`). The two callers handle a one-year dataset differently. Fix: compute with a loop, return `null` when there are no years, and have both tests `test.skip` with the same reason when the span is under two years.
- **B166: `voteBucketCounts()` hardcodes the bucket bounds** (`app.spec.ts:817`). Fix: move `RATING_BUCKETS` (Dashboard) and `VOTE_BUCKETS` (Ratings tab) to `src/utils/chartBuckets.ts`, use them in the app and the test with `countIntoBuckets`, and assert the chosen bucket's count is > 0.
- **B167: the language test counts by display name, while the filter matches the code** (`app.spec.ts:190`). It fails when two codes share a name (B146 data). Fix: count by code. If the picked name maps to more than one code, `test.skip` and cite B146.
- **B168: `selectInDrawer(option)` matches by substring** (`helpers.ts:77`), so "Drama" can pick "Docudrama". It's latent: no caller passes `option`. Fix: exact title match, and `toBe(option)`.
- **B169: `chooseOption()` puts `option` unescaped into a CSS attribute selector** (`helpers.ts:94`). Fix: `getByTitle(option, { exact: true })`.

**Names and docs:**
- **B170: two test names claim more than they check** (`app.spec.ts:264` pagination, `:801` rating colour). Fix: the pagination test pages forward on mocked rows and checks the range text. The rating test opens a known-rated mocked movie and checks its tag's colour.
- **B171: duplicate JSDoc on `paginationTotal()`** (`helpers.ts:105`). Remove one.

Bookkeeping: log B162–B171 in `BUG_BACKLOG.md` §3q, tick CR/SR for rows 67, 73 and Batch M, and update the Progress line to 75 of 75.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `dev-quality-gates`: "End-to-end specs cannot bypass the write guard" also covers pages and contexts the test opens, and API requests that skip page routing.

## Impact

- Tests: `tests/app.spec.ts`, `tests/helpers.ts`, `eslint.config.mjs` (the `tests/` rules).
- App code (no behaviour change): `src/utils/chartBuckets.ts` (new) holds `RATING_BUCKETS` and `VOTE_BUCKETS`, and `Dashboard.tsx` and `RatingsTab.tsx` import them.
- Test count: B162/B170 rewrite existing tests rather than adding new ones, so the documented 65 tests / 13 suites stay the same.
- Overlap:
  - `fix-dashboard-review` edits `Dashboard.tsx` near `RATING_BUCKETS`.
  - `fix-stats-tabs-review` edits `RatingsTab.tsx`.
  - Several open changes add e2e cases to `app.spec.ts`.
  - All of these are edits to the same files, not conflicting behaviour; whichever change lands later rebases.
  - Spec deltas: `fix-utils-types-review` and `fix-server-tests-review` add requirements to `dev-quality-gates`. Only this change modifies "End-to-end specs cannot bypass the write guard".
