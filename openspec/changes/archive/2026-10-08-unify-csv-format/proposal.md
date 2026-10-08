## Why

Three things write rows to `src/movies.csv`: the in-app import, `movie-search.py`, and the README's "build your own dataset" instructions, with `public/movies.template.csv` as the example. They disagree on value formats (audit finding S11):
- **Production Country/Company:** the README and template use the first entry only, with an ISO country code (`US`). The real data and both writers use every name, comma-joined (`United Kingdom, United States of America`).
- **Missing values:** `movie-search.py` writes the string `"N/A"`, and the server writes an empty string. The user's CSV already holds 57 `"N/A"` directors and 16 `"N/A"` release years. They appear in the analytics as a director called "N/A" and are a drill-down target.
- **Grouping:** the charts treat a multi-country value like `"United Kingdom, United States of America"` (54 rows) as its own country, separate from either country.

The user has chosen the comma-joined full-name format as the standard.

## What Changes

- **One format.** The standard catalogue format for multi-valued text fields is every name, comma-joined: `Genres`, `Actors/Actresses`, `Production Company`, `Production Country`.
- **Empty means missing.** A missing value is stored as an empty field, never as `"N/A"`.
- **Python tool.** `movie-search.py` writes empty strings instead of `"N/A"`.
- **Legacy values.** On load, the server reads legacy `"N/A"` values as empty, so existing rows display and aggregate correctly without rewriting the user's file.
- **Charts.** Analytics split `Production Country` and `Production Company` on commas, as they already do for `Genres`. A UK/US co-production then counts toward both countries.
- **Docs and template.** The README column-mapping table and `public/movies.template.csv` show the standard format.

## Capabilities

### New Capabilities
- `catalog-data-format`: the canonical value format of catalogue fields, shared by every writer, and how readers interpret legacy and missing values.

### Modified Capabilities
<!-- None -->

## Impact

- `movie-search.py`: missing-value defaults.
- `server/server.ts`: normalization of `"N/A"` on load. This sits next to the loader `csv-write-safety` introduces, so land that change first or merge carefully.
- `src/utils/statsHelpers.ts` (`groupByField`): split multi-valued company and country fields.
- `src/components/StatsTabs/PeopleTab.tsx`, `RuntimeTab.tsx`: counts change as values split.
- `README.md`, `public/movies.template.csv`.
- No change is needed to the user's existing `src/movies.csv`.
