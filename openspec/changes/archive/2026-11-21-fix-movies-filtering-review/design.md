## Context

Batch G (`BUG_BACKLOG.md` §6 rows 24, 30, 31, 32, 54, 55, 74) reviewed the Movies page and its filtering code. Findings re-checked against the code on 2026-11-20:

- `FiltersDrawer.tsx:152-159`: vote `RangeSlider` with `step={0.1}`. `@rc-component/slider`'s `formatValue` (`es/hooks/useOffset.js:70-93`, via `Slider.js` `rawValues`) aligns every value to the step, min, max or a mark, so `[2, 3.999]` is shown and committed as `[2, 4]`. `RangeSlider.onChangeComplete` passes that straight to `onCommit` (B117).
- `FiltersDrawer.tsx:170-177`: revenue `RangeSlider` with no `step` → antd's default `1` (B118).
- `filterSpans.ts:21-22` counts runtime `0`; `Movies.tsx:117-121` only drops NaN. `server/app.ts:650` stores TMDB's `runtime: 0` as `'0'`. `RuntimeTab.tsx:46-48` puts `0` in "< 60 min" while its other charts skip `r <= 0` (B119).
- `search.ts:24` lowercases without trimming; `filterChips.ts:19` and `:33` test `search !== ''` / truthiness (B120).
- `Movies.tsx:91` `movie.Genres.split(',')`; `FiltersDrawer.tsx:52` already guards `if (m.Genres)` (B121).
- `Movies.tsx:201-203`: Tooltip on a bare `InfoCircleOutlined` (B122). `Movies.tsx:198`: fixed `movies-filtered-` prefix (B123).

Duplicate, not in scope: the debounced search lag after Clear all / drill-down is B104/B105 (`fix-contexts-hooks-review`).

## Goals / Non-Goals

**Goals:** fix B117–B123, keep the inclusive `[min, max − step]` drill-down semantics (CLAUDE.md: the user chose that over half-open filters), and add mocked e2e coverage.

**Non-Goals:** changing the vote slider's 0.1 visual step or its tooltip format; making `Movie` fields optional in the type (a wider change); the debounce lag (B104).

## Decisions

**D1 — `RangeSlider` keeps untouched bounds (B117).** On commit, for each end `i`: if `next[i]` equals what the slider shows for the committed `value[i]` (the same step alignment rc-slider applies: `min + round((v − min) / step) · step`, clamped, with min/max always allowed), keep `value[i]`; otherwise use `next[i]`. The draft shown while dragging stays as rc-slider renders it. This lives in `RangeSlider`, so every range filter gets it; for year/runtime (integer step, integer bounds) it is a no-op. *Alternative:* `step={VOTE_STEP}` (0.001). Rejected: arrow keys would move 0.001 (10,000 steps), the B118 problem again. *Alternative:* `step={null}` with marks. Rejected: no keyboard stepping between marks.

**D2 — Rounded revenue step (B118).** `niceStep(span / 100)`: the largest of 1, 2 or 5 × 10^k not above the input, minimum 1, in `filterSpans.ts` next to the spans. rc-slider always allows `min` and `max` themselves (`useOffset.js:79`), so dragging to either end still clears the filter.

**D3 — Runtime ≤ 0 is unknown (B119).** `computeFilterSpans` skips `r <= 0`. `Movies.tsx`'s runtime filter excludes `runtime <= 0` while active (comment as for vote/revenue). `RuntimeTab.tsx`'s bucket chart skips `r <= 0`, so "< 60 min" counts what its drill-down `[0, 59]` lists. `handleRuntimeBucketClick`'s max is unaffected.

**D4 — Trim at the matching points (B120).** `matchesSearch` trims `term`; `Movies.tsx` skips the search clause when `debouncedSearch.trim()` is empty; `isFiltersActive` uses `search.trim() !== ''`; the chip appears only for a non-blank trimmed search and shows the trimmed text. The input keeps exactly what the user typed (so "the " while typing "the matrix" isn't eaten). `tests/helpers.ts`'s `searchMatchCount` calls `matchesSearch`, so expectations follow.

**D5 — Guard `Genres` (B121).** `(movie.Genres ?? '').split(',')`. A movie with no value matches no genre. Other `Movies.tsx` fields already go through `parseInt`/`parseFloat`/`includes`, which tolerate `undefined`.

**D6 — Hint on the button (B122).** Remove the icon. Wrap the Export button in the Tooltip (antd shows it on hover and focus) and give the button `aria-describedby="export-csv-hint"` pointing at a `.visually-hidden` span with the same text, so screen readers announce it without the tooltip. Use the `.visually-hidden` class `fix-app-shell-review` adds (its D6); if this change lands first, add it here with the same clip pattern and that change reuses it.

**D7 — Filename (B123).** `filtersActive ? `movies-filtered-${n}.csv` : `movies-${n}.csv``. Sorting alone doesn't count as filtered: the rows are the full set.

## Risks / Trade-offs

- [D1 compares against rc-slider's internal alignment] → It's a small pure helper covered by the e2e drill-down test; if a slider upgrade changes alignment, the test fails rather than silently corrupting bounds.
- [Runtime-0 movies drop out of runtime-filtered lists] → Intended and consistent with vote/revenue; they still list with no runtime filter.
- [Existing export test expects `movies-filtered`] → Updated in the same change (task 6.3).
