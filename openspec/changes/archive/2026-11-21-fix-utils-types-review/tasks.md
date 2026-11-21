## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3o "Found 2026-11-20 (Batch K review: utils + types, §6 rows 53, 56–61, 75)" with B143–B151 (B146/B147 open and owned by no change, with reasons), the missing-trailing-cells finding pointing to B129, and SR's result
- [x] 1.2 `BUG_BACKLOG.md`: add the `formatDateDDMMYYYY(undefined)` crash path to B129; mark B15 as partly owned by `fix-utils-types-review`
- [x] 1.3 `BUG_BACKLOG.md` §6: tick CR + SR for rows 53, 56–61, 75 and Batch K; update the Progress line

## 2. Unit-test runner (B15 part)

- [x] 2.1 `package.json`: `"test:unit": "tsx --test tests/unit/*.test.ts"`
- [x] 2.2 `playwright.config.ts`: `testIgnore: ['unit/**']`
- [x] 2.3 `.github/workflows/ci.yml`: `npm run test:unit` after `npm run test:server`

## 3. Helpers

- [x] 3.1 `statsHelpers.ts`: `formatRevenue` rounds first, then moves up a unit (B143)
- [x] 3.2 `statsHelpers.ts`: `makeDoughnut` without `hoverBackgroundColor`; `makePolar` fills via `withAlpha(c, 0.8)` (B144, B145)
- [x] 3.3 `formatDate.ts`: exact `YYYY-MM-DD` match, otherwise input unchanged; accepts `undefined` (B148)
- [x] 3.4 `chartTheme.ts`: `withAlpha` accepts `#RGB`/`#RRGGBB`, throws otherwise (B150)
- [x] 3.5 `languages.ts`: own-key lookup via `hasOwnProperty.call` (B151; `Object.hasOwn` needs ES2022 lib)
- [x] 3.6 `types/movie.ts`: `as const satisfies` + compile-time missing-column check (B149); check that `server/tsconfig.json` still builds and that the Python `CATALOGUE_COLUMNS` equality test still passes

## 4. Unit tests (`tests/unit/`)

- [x] 4.1 `formatRevenue.test.ts`: 0, negatives, non-finite, 999, 999.6, 999_600, 1_000_000, 999_960_000, 1.5e9
- [x] 4.2 `chartTheme.test.ts`: `withAlpha` for `#RRGGBB`, `#RGB`, and a throw for `#RRGGBBAA` / `'red'`
- [x] 4.3 `formatDate.test.ts`: valid date, timestamp, unpadded, empty, `undefined`
- [x] 4.4 `languages.test.ts`: known code, uppercase code, unknown code, `'constructor'`
- [x] 4.5 `statsHelpers.test.ts`: `groupByField` (multi-valued split, blank → skipped / "Unknown"), `topNWithOther` (7 + Other), `bucketToRange`/`countIntoBuckets` (half-open, last bucket open, the 4.0 → "4–6" case)

## 5. Docs and checks

- [x] 5.1 CLAUDE.md: `npm run test:unit` in Commands and in the CI line; test count in Stack; `withAlpha` accepts `#RGB`/`#RRGGBB` only
- [x] 5.2 `npm run lint`, `npm run type-check`, `npm run build:server`, `npm run test:unit`, `npm run test:server`, `python -m unittest discover -s tests/python`, `npm run test:e2e` (check ports 3000/5000 first)
- [x] 5.3 `BUG_BACKLOG.md` §6: Fix ◐ for rows 53, 56, 57, 58, 61 and Batch K; rows 59, 60, 75 (no findings) Fix ☑
