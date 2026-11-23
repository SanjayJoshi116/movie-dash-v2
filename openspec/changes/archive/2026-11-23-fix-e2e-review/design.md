## Context

Batch M reviewed `tests/app.spec.ts` and `tests/helpers.ts`. Checked against the code on 2026-11-20:

- **B162:** `app.spec.ts:368-395`. The director, runtime and revenue tests assert only `.ant-tag` text.
- **B163:** `app.spec.ts:764-776`. `allInnerTexts()` is read with no prior wait, and the per-cell loop passes on `[]`.
- **B164:** `helpers.ts:15-26`. `page.route` only. `fetchMovies` uses `page.request` (`helpers.ts:99-101`), which page routes don't intercept. The `no-restricted-imports` lint rule (`eslint.config.mjs:73-80`) only covers the import.
- **B165:** `helpers.ts:174-177` spreads into `Math.min`/`Math.max`. `app.spec.ts:664` asserts a precondition, while `:881` skips.
- **B166:** `app.spec.ts:817` uses `voteBucketCounts(movies, 5, 2)` / `(10, 1)`, while the app uses `RATING_BUCKETS` (`Dashboard.tsx:36`) and `VOTE_BUCKETS` (`RatingsTab.tsx:20`).
- **B167:** `app.spec.ts:190` compares `getLanguageName(m.Language) === language`, while `Movies.tsx` matches `filters.languages.includes(movie.Language)`.
- **B168:** `helpers.ts:77` uses `filter({ hasText })` and `toContain`.
- **B169:** `helpers.ts:94` builds `[title="${option}"]`.
- **B170:** `app.spec.ts:264` checks visibility only; `:801` checks only that `.ant-tag` exists.
- **B171:** `helpers.ts:104-105` has two JSDoc blocks.

## Goals / Non-Goals

**Goals:** every test fails when its named behaviour breaks; the guard covers every way a test can reach `/api`; the expected values come from the app's own definitions.

**Non-Goals:**
- B33 (page-title test name; it needs a real per-page `document.title`).
- B146 normalisation itself.
- New coverage beyond the rewritten tests.
- The e2e cases other open changes add.

## Decisions

**D1: Mocked rows for exact filter counts (B162, B170).** The range tests use `mockMovies(page, rows)` with 12 rows:
- 3 directors with known counts.
- Runtimes 80–135 in steps of 5.
- Revenues 0 to 11M, with one row at revenue 0, which counts as unknown and is excluded while the filter is active.

Each test applies its filter, reads the committed bounds from the chip text (`Runtime: a–b`, `Revenue: $x–$y` parsed back with the same `formatRevenue`), and asserts `expectTotal(count of rows inside the bounds, unknowns excluded)`. Reading the bounds from the chip keeps the test independent of slider step sizes.

The pagination test uses 25 mocked rows. It clicks page 2, then checks the range text and that the first row is "Mock Movie 11". This replaces the visibility-only test; the existing "second page of pagination loads" test already covers the same ground, so the two are merged, and the freed slot goes to the rating-colour rewrite. That keeps the count at 65.

The rating test mocks one movie with vote 8.5. After the drawer opens, it asserts the vote tag has the colour class `MovieDrawer` uses for ≥ 8.

**D2: Combined filters (B163).** Compute `expected = movies.filter(m => matchesSearch(m, 'a') && m.Language === code).length` (code as in D4). Assert `expected > 0` as a precondition, choosing a language from the search's matches. Then `await expectTotal(page, expected)`, and only then read the cells.

**D3: Context-wide guard (B164).**
```ts
export const test = base.extend({
  context: async ({ context }, use) => { await context.route('**/api/**', guard); await use(context); },
  request: async ({ request }, use) => { await use(getOnly(request)); },
});
```
- `page` comes from `context`, so it's covered. Page-level `mockMovies`/DELETE mocks still run first: page routes take precedence over context routes, and `route.fallback()` hands unhandled requests on to the context guard. Check this order during apply with a throwaway spec that issues an unmocked DELETE.
- `getOnly` wraps `APIRequestContext`: `get` passes through, and `post`/`put`/`patch`/`delete`/`fetch` throw "e2e must not write the catalogue".
- `page.request` shares the context's request client but isn't routed, so lint covers it. A `no-restricted-syntax` rule in `tests/**` bans `MemberExpression` `.request.(post|put|patch|delete|fetch)` and calls to `newContext`.

**D4: Language by code (B167).** Find the codes whose name equals the picked label: `codes = new Set(movies.filter(m => getLanguageName(m.Language) === language).map(m => m.Language))`. If `codes.size !== 1`, `test.skip(true, 'several language codes share this name (B146)')`. Otherwise count by that code.

**D5: Shared buckets (B166).** `src/utils/chartBuckets.ts` exports `RATING_BUCKETS` and `VOTE_BUCKETS`, moved unchanged. `Dashboard.tsx` and `RatingsTab.tsx` import them. The test uses `countIntoBuckets(votes > 0, RATING_BUCKETS)` and picks the first bucket with a count > 0. If there is none, it skips with "no rated movies".

**D6: Helper fixes (B165, B168, B169, B171).**
- `yearSpan` computes min/max with a loop and returns `null` when there are no years. Both callers do `test.skip(!span || span.yearMin === span.yearMax, 'dataset spans fewer than two years')`.
- `selectInDrawer` locates the option with `dropdown.getByTitle(option, { exact: true })` and checks `toBe(option)`.
- `chooseOption` uses `openDropdown(page).getByTitle(option, { exact: true })`.
- Delete the first JSDoc on `paginationTotal`.

## Risks / Trade-offs

- [Mocked rows replace real-data coverage for range filters] → The real-data runs still cover search, language, genre and the drill-downs. Range filters need known values to assert exact counts.
- [Skipping the language test on B146 data] → It's explicit and cites the backlog ID. It goes away once B146 normalisation lands.
- [The context guard depends on the page-before-context route order] → It's Playwright's documented behaviour, and the throwaway spec checks it during apply.
