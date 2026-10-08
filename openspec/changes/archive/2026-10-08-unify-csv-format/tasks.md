## 1. Writers

- [x] 1.1 `movie-search.py`: replace every `"N/A"` default in the row it builds (id, title, language, runtime, year, director, revenue, budget, popularity, votes, release date) with `""`
- [x] 1.2 Confirm the server import (`/api/tmdb/import`) already matches the standard format: all names comma-joined, empty when missing. No code change expected

## 2. Readers

- [x] 2.1 `server/server.ts` loader (implemented in `server/app.ts`, where the loader moved in `server-api-tests`): map field values equal to `N/A` to `''`. Apply it in the shared loader if `csv-write-safety` has landed; otherwise in the `data` handler
- [x] 2.2 `statsHelpers.groupByField`: split `Production Company` and `Production Country` on commas, trimming and skipping empties, the same way `Genres` is split
- [x] 2.3 Check the drill-downs and filters that use these fields still match. There's no country/company filter today; free-text search already substring-matches

## 3. Docs and template

- [x] 3.1 README column-mapping table: `Production Company` → `production_companies[].name` joined with `, `; `Production Country` → `production_countries[].name` joined with `, `; note "missing values are left empty"
- [x] 3.2 `public/movies.template.csv`: replace ISO codes (`US`, `FR`, …) with full country names
- [x] 3.3 CLAUDE.md Data section: one line on the canonical format and the `N/A` legacy handling

## 4. Verification

- [x] 4.1 With the user's CSV loaded, the People "Top Directors" chart has no "N/A" entry, and the country chart has no combined "X, Y" labels
  - Verified via `createApp()` on a temp copy of the real CSV + the UI's `groupByField`: 0 `N/A` values served; director "N/A" bucket gone (those 57 now count as "Unknown" — its empty drill-down is finding F4, owned by `drilldown-consistency`); 0 comma-joined country/company keys; USA 452 → 662 as co-productions now count per country.
- [x] 4.2 Confirm `npm run lint`, `npm run build` and `npm run test:e2e` pass (the e2e seed uses the updated template)
  - lint, type-check:server, build pass; `test:server` 44/44 (new `data-format.test.ts`); e2e 56/56 (`CI=1` fresh server, updated template, `--retries=0`); real CSV restored, sha256 verified.
