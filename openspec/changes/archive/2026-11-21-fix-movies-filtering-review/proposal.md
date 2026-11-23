## Why

The Batch G `/code-review` (high) of the Movies page and filtering (`BUG_BACKLOG.md` §6 rows 24, 30, 31, 32, 54, 55, 74: `Movies.tsx`, `FiltersDrawer.tsx`, `ActiveFilters.tsx`, `RangeSlider.tsx`, `filterChips.ts`, `filterSpans.ts`, `search.ts`) reported 8 issues. 7 were confirmed by reading the code on 2026-11-20 and are logged as B117–B123. The eighth (old search filtering for 300 ms after a clear or drill-down) is already B104/B105, owned by `fix-contexts-hooks-review`. The `/security-review` found nothing.

The important one breaks the bucket/filter rule in `analytics-drilldown`: after a rating drill-down, touching either Vote Average handle silently saves `3.999` as `4.0`, so films the chart counted in "4–6" show up in the "2–4" list.

## What Changes

- **B117 — Vote slider rounds drill-down bounds** (`FiltersDrawer.tsx:155`). `step={0.1}` makes `@rc-component/slider` round `[2, 3.999]` to `[2, 4]`, and any commit saves that. `RangeSlider` keeps a handle the user didn't move at its exact committed value.
- **B118 — Revenue slider steps $1 by keyboard** (`FiltersDrawer.tsx:172`). No `step` over a range of up to ~$3B; every key press commits. Give it a rounded step of about 1/100 of the span.
- **B119 — Runtime 0 counts as a real runtime** (`filterSpans.ts:21`, `Movies.tsx:117-121`). TMDB's unknown runtime is stored as `0`, so the slider starts at 0 and a 0–90 range lists it. Treat runtime ≤ 0 as unknown, like vote and revenue, including in the Runtime tab's bucket chart so drill-downs still match.
- **B120 — Search isn't trimmed** (`search.ts:24`, `filterChips.ts:19,33`). A trailing space gives no matches; a lone space shows a blank "Search:" chip and the active badge.
- **B121 — Genre filter crashes without a `Genres` column** (`Movies.tsx:91`). `movie.Genres.split` on a catalogue with no such column throws while a genre filter is saved. Guard it like `FiltersDrawer.tsx:52` does.
- **B122 — Export CSV explanation is mouse-only** (`Movies.tsx:202`). The tooltip is on an unfocusable icon. Attach the hint to the Export button.
- **B123 — Export file is always named `movies-filtered-N.csv`** (`Movies.tsx:198`). Use `movies-N.csv` when no search or filter is active.
- Bookkeeping: log B117–B123 in `BUG_BACKLOG.md` §3j, tick CR/SR for rows 24, 30–32, 54, 55, 74 and Batch G, and set Fix ◐ once implemented.

**Already in the backlog:** Older IDs covered: B119 = B5, B120 = trim part of B20 (accent folding stays open). B121 becomes redundant once `fix-movies-views-review` normalises missing fields. Update both IDs when archiving.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `analytics-drilldown`: runtime joins vote and revenue in "unknown numeric values are excluded by range filters" (runtime ≤ 0 is unknown).
- `movie-browsing`: range filter controls keep bounds the user didn't change and step usefully by keyboard; search ignores surrounding whitespace; a missing catalogue column never crashes filtering; the export filename says whether it is filtered.
- `accessible-ui`: explanatory hints on controls are reachable by keyboard and screen readers.

## Impact

- Code: `src/components/RangeSlider.tsx`, `src/components/FiltersDrawer.tsx`, `src/pages/Movies.tsx`, `src/utils/filterSpans.ts`, `src/utils/filterChips.ts`, `src/utils/search.ts`, `src/components/StatsTabs/RuntimeTab.tsx` (Batch I file, one filter line), `src/index.css` (`.visually-hidden`, unless `fix-app-shell-review` has added it).
- Tests: `tests/app.spec.ts` "CSV export triggers download" expects `movies-filtered`; it runs with no filters, so its regex changes to `movies-\d+\.csv`. New e2e cases with mocked rows. `tests/helpers.ts`'s `searchMatchCount` uses `matchesSearch`, so it picks up trimming automatically.
- `fix-contexts-hooks-review` also edits `Movies.tsx` (debounce, preset) and adds `movie-browsing` requirements; this change only adds different requirements and touches different lines, so either order works.
