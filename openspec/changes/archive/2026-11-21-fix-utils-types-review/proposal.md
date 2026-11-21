## Why

The Batch K `/code-review` (high) of the remaining utils and types (`BUG_BACKLOG.md` §6 rows 53, 56–61, 75: `statsHelpers.ts`, `chartTheme.ts`, `formatDate.ts`, `languages.ts`, `path.ts`, `poster.ts`, `types/movie.ts`, `slugify.ts`) reported 9 issues. The `/security-review` found nothing exploitable but noted one functional bug: `getLanguageName('constructor')` returns an inherited function.

All 10 were checked against the code on 2026-11-20:

- **Already owned elsewhere:** a CSV row missing its trailing cells crashes `formatDateDDMMYYYY(undefined)` and the table sorters. This is B129, which `fix-movies-views-review` task 4.5 fixes by normalising every `CATALOGUE_COLUMNS` field to a string in `MoviesContext`. This change still makes `formatDateDDMMYYYY` tolerate a missing value.
- **Fixed here:** B143–B145 and B148–B151.
- **Confirmed but logged as open and not fixed here (B146, B147):**
  - Case and whitespace variants of a language (`'EN'`, `' en'`) show as separate slices. Only hand-edited rows can have them (TMDB sends lowercase ISO codes). Folding them in the chart alone would break "drill-down result matches the clicked element's count", because the Movies language filter matches exactly. The fix belongs in the same row normalisation as B129.
  - A company or country name that contains a comma is split into fake categories. Fixing it means changing the `catalog-data-format` separator rule, a format decision for the user.

`B15` (no frontend unit tests) names `formatRevenue`, `groupByField` and `withAlpha`. This change adds the unit-test runner and covers the helpers it touches.

## What Changes

- **B143: `formatRevenue` shows `$1000K` / `$1000.0M`** (`statsHelpers.ts:118-124`). Round first, then move up a unit if the rounded value reaches 1000 (999,600 → `$1.0M`, 999,960,000 → `$1.0B`).
- **B144: `makeDoughnut` sets `hoverBackgroundColor`** (`statsHelpers.ts:88`). Remove it, as CLAUDE.md asks.
- **B145: `makePolar` builds fills with `c + 'cc'`** (`statsHelpers.ts:98`). Use `withAlpha(c, 0.8)`.
- **B148: `formatDateDDMMYYYY` garbles anything that isn't `YYYY-MM-DD`** (`formatDate.ts:1-4`). Reformat only an exact `YYYY-MM-DD` match; otherwise return the input unchanged (`''` for `undefined`).
- **B149: nothing checks that `CATALOGUE_COLUMNS` lists every `Movie` field** (`types/movie.ts:22`). Declare it `as const satisfies readonly (keyof Movie)[]` and add a compile-time check that no `Movie` key is missing.
- **B150: `withAlpha` silently mis-parses anything but `#RRGGBB`** (`chartTheme.ts:26-29`). Accept `#RGB` and `#RRGGBB`; throw a `TypeError` for anything else. All current inputs are palette constants, so a bad one fails at once in development.
- **B151: `getLanguageName` returns inherited properties** (`languages.ts:44`). `'constructor'` returns a function. Look up own keys only (`hasOwnProperty.call`).
- **B15 (part): frontend unit tests.** Add `npm run test:unit` (`tsx --test tests/unit/*.test.ts`, Node's `node:test`, as the server tests do), exclude `tests/unit/` from Playwright, and add a CI step. Cover `formatRevenue`, `withAlpha`, `formatDateDDMMYYYY`, `getLanguageName`, `groupByField`, `topNWithOther` and `bucketToRange`/`countIntoBuckets`.
- Bookkeeping: log B143–B151 in `BUG_BACKLOG.md` §3o (B146/B147 open, not owned by any change), add the Batch K crash path to B129, mark B15 partly owned, tick CR/SR for rows 53, 56–61, 75 and Batch K, and set Fix ◐ once implemented.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `analytics-drilldown`: "Money values are labelled accurately" adds unit-boundary rounding.
- `dev-quality-gates`: shared display helpers have unit tests that CI runs.

## Impact

- Code: `src/utils/statsHelpers.ts`, `chartTheme.ts`, `formatDate.ts`, `languages.ts`, `src/types/movie.ts`. No changes to `path.ts`, `poster.ts` or `slugify.ts`.
- Tests and config: new `tests/unit/*.test.ts`, a `test:unit` script in `package.json`, `testIgnore: ['unit/**']` in `playwright.config.ts`, a step in `.github/workflows/ci.yml`. `tsconfig.node.json` already type-checks `tests/`.
- Server: `server/tsconfig.json` already includes `src/types/movie.ts`. The new `satisfies` check compiles under TS 6.
- Overlap:
  - `fix-dashboard-review` D7 moves StatCard's tint to `withAlpha`. All its callers pass `#RRGGBB`, so the stricter `withAlpha` doesn't affect it.
  - `fix-stats-tabs-review` adds `parseVote` to `statsHelpers.ts` in a different part of the file.
  - No other open change edits `dev-quality-gates` or "Money values are labelled accurately".
