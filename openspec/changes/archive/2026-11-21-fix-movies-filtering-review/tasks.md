## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3j "Found 2026-11-20 (Batch G review: Movies page + filtering), owned by `fix-movies-filtering-review`" with B117–B123, the B104/B105 duplicate, and that SR found nothing
- [x] 1.2 `BUG_BACKLOG.md` §6: tick CR + SR for rows 24, 30, 31, 32, 54, 55, 74 and Batch G; update the Progress line

## 2. Range sliders (B117, B118)

- [x] 2.1 `RangeSlider.tsx`: on commit keep `value[i]` for each end whose `next[i]` equals the step-aligned committed value (helper: `alignToStep(v, min, max, step)`, min/max always allowed)
- [x] 2.2 `filterSpans.ts`: `niceStep(x)` (1/2/5 × 10^k, ≥ 1); `FiltersDrawer.tsx` revenue slider `step={niceStep((revenueMax - revenueMin) / 100)}`
- [x] 2.3 e2e (Drill-down consistency): mocked rows incl. a 4.0 movie; Dashboard "2–4" bar → open Filters → keyboard-step the lower vote handle → chip shows upper bound `3.999` and the 4.0 movie isn't listed
- [x] 2.4 e2e (Movies Advanced Filters): mocked revenues $1M–$2.8B; focus the lower revenue handle, press Right Arrow → chip's lower bound moves by ≥ $10M

## 3. Unknown runtime (B119)

- [x] 3.1 `filterSpans.ts`: skip `r <= 0` in `computeFilterSpans`
- [x] 3.2 `Movies.tsx`: runtime filter excludes `runtime <= 0` while active
- [x] 3.3 `RuntimeTab.tsx`: runtime bucket chart skips `r <= 0`
- [x] 3.4 e2e: mocked rows with runtime `0` and shortest real runtime 85 → runtime filter 85–90 doesn't list the 0 row; with no filter it is listed

## 4. Search and Genres (B120, B121)

- [x] 4.1 `search.ts`: trim the term in `matchesSearch`
- [x] 4.2 `Movies.tsx`: skip the search clause when the trimmed debounced search is empty
- [x] 4.3 `filterChips.ts`: `isFiltersActive` and the search chip use the trimmed search (chip text trimmed)
- [x] 4.4 `Movies.tsx`: `(movie.Genres ?? '').split(',')` — not needed: `fix-movies-views-review` (archived) normalises every catalogue column to a string in `MoviesContext`, and CLAUDE.md forbids per-site guards for that; 4.6 verifies the crash is gone
- [x] 4.5 e2e (Edge Cases): `"<name> "` matches like `"<name>"`; `" "` lists all, no chip, Filters button not "active"
- [x] 4.6 e2e (Edge Cases): mocked rows without `Genres` + saved `genres: ['Drama']` in sessionStorage → page loads, empty result, genre chip visible

## 5. Export (B122, B123)

- [x] 5.1 `index.css`: `.visually-hidden` (clip pattern) unless `fix-app-shell-review` already added it — already added by `fix-app-shell-review`, reused
- [x] 5.2 `Movies.tsx`: remove the info icon; Tooltip wraps the Export button; button `aria-describedby` → visually hidden hint span
- [x] 5.3 `Movies.tsx`: filename `movies-filtered-N.csv` only when `filtersActive`, else `movies-N.csv`
- [x] 5.4 e2e: Export button's accessible description contains "currently shown" (`toHaveAccessibleDescription`); with a genre filter the filename matches `movies-filtered-\d+\.csv`
- [x] 5.5 `tests/app.spec.ts` "CSV export triggers download": expect `^movies-\d+\.csv$` (no filters active)

## 6. Docs and checks

- [x] 6.1 CLAUDE.md: `RangeSlider` keeps untouched bounds; runtime ≤ 0 = unknown alongside vote/revenue; search is trimmed at match time; export filename rule
- [x] 6.2 `npm run lint`, `npm run type-check`, `npm run test:e2e` (check ports 3000/5000 first)
- [x] 6.3 `BUG_BACKLOG.md` §6: Fix ◐ for rows 24, 30, 32, 54, 55, 74 and Batch G; row 31 (`ActiveFilters.tsx`, no findings) Fix ☑
