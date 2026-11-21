## Why

The Batch E `/code-review` (high) of contexts and hooks (`BUG_BACKLOG.md` §6 rows 17–22: `MoviesContext.tsx`, `ThemeContext.tsx`, `DrilldownContext.tsx`, `useMovies.ts`, `useDebounce.ts`, `usePersistedFilters.ts`) logged B102–B107. All six were re-checked against the code on 2026-11-20 and are still present. The `/security-review` of the same batch found nothing. Two break a spec promise today: the theme stops following the OS after the first visit (`movie-browsing` "Preferences degrade gracefully"), and a 200 response that isn't a list crashes every page instead of showing the load error.

## What Changes

- **B102 — Theme stops following the OS after the first visit** (`ThemeContext.tsx:39-44`). The layout effect saves the OS-derived default on mount, as if the user had chosen it. Save only when the user toggles. While nothing is saved, follow `prefers-color-scheme` changes live.
- **B103 — A 200 response that isn't an array crashes every page** (`MoviesContext.tsx:56`). Treat a non-array body as a load failure: first load → `error`, refetch → `refreshError` with the last data kept.
- **B104 — Old search keeps filtering for 300 ms after it is cleared** (`Movies.tsx:74`). Clearing the search (Clear all, the search chip, emptying the box) applies at once. Typing stays debounced.
- **B105 — A drill-down first renders the saved filters, then the preset** (`Movies.tsx:64-72`). The drill-down preset becomes the Movies page's initial filter state, so the saved filters never render. The preset then goes through the same one-time clamp to the data as restored filters.
- **B106 — Blocked `localStorage` stops saved filters restoring** (`usePersistedFilters.ts:42`). The legacy `localStorage` cleanup gets its own `try`, so a throw there doesn't skip the `sessionStorage` read.
- **B107 — Theme storage key isn't namespaced** (`ThemeContext.tsx:17,42`). Store the theme under `movieDash_theme`. The old `theme` key is ignored, not migrated (see design D2).
- Bookkeeping: tick SR for rows 17–22 and Batch E in `BUG_BACKLOG.md` §6, mark B102–B107 as owned by this change in §3h, set Fix ◐ once implemented. Update the CLAUDE.md lines for `ThemeContext`, `usePersistedFilters` and `useDebounce`.

Not in scope: B96 (generic axios error text) and its 503 retry are owned by `fix-app-shell-review`, which also edits `MoviesContext.tsx`. B35 (`color-scheme`, white flash) stays open. Nothing was found in `DrilldownContext.tsx` or `useMovies.ts`.

**Already in the backlog:** B102 is the same as older B22; mark both fixed.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `movie-browsing`: a saved theme is only one the user chose, the theme follows OS changes until then, and it is stored under an app-specific key. Clearing the search applies at once. A drill-down's filters are the first ones shown and are clamped like restored ones. Filters still restore when only `localStorage` is blocked. A malformed catalogue response shows the load error instead of crashing.

## Impact

- Code: `src/contexts/ThemeContext.tsx`, `src/contexts/MoviesContext.tsx`, `src/hooks/useDebounce.ts`, `src/hooks/usePersistedFilters.ts`, `src/pages/Movies.tsx`.
- Tests: new e2e cases in `tests/app.spec.ts` (Theme, Filter Persistence, Edge Cases suites). Mocked routes only; no server changes.
- Ordering: `fix-app-shell-review` also edits `MoviesContext.tsx` (error text, 503 retry). Either can land first; the B103 guard must feed the same error path that change's `errorMessage` helper uses.
- Users: anyone with a saved `theme` key gets the OS theme once and re-toggles if they want the other one.
