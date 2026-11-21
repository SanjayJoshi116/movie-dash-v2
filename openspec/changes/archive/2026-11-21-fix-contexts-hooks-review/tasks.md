## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md` §3h: note that B102–B107 are fixed by `fix-contexts-hooks-review` and that SR (2026-11-20) found nothing in rows 17–22
- [x] 1.2 `BUG_BACKLOG.md` §6: tick SR for rows 17–22 and Batch E; update the Progress line (Batch E CR + SR done)

## 2. Catalogue response shape (B103)

- [x] 2.1 `MoviesContext.tsx`: in `.then`, if `!Array.isArray(response.data)` throw `new Error('Unexpected response from the server')` so it reaches the existing `.catch` (first load → `error`, later → `refreshError`, `movies` kept)
- [x] 2.2 (N/A at apply 2026-11-21: `fix-app-shell-review` not landed yet; re-check when it lands) If `fix-app-shell-review` has landed, check the thrown error passes through its `errorMessage` helper unchanged and does not trigger the 503 retry
- [x] 2.3 e2e (Edge Cases): `GET /api/movies` mocked as 200 `text/html` body → load-error alert with Retry is visible, crash screen ("Try Again") is not

## 3. Theme (B102, B107)

- [x] 3.1 `ThemeContext.tsx`: storage key `movieDash_theme`; `readSavedTheme` reads only it (no migration from `theme`, which is left untouched)
- [x] 3.2 `ThemeContext.tsx`: add `hasChoice` state; layout effect only sets `data-theme`; `toggleTheme` computes `next` from `isDark`, sets state + `hasChoice`, writes storage in the handler (try/catch)
- [x] 3.3 `ThemeContext.tsx`: while `!hasChoice`, subscribe to `matchMedia('(prefers-color-scheme: dark)')` `change` and `setIsDark(e.matches)` from the listener; remove in cleanup; try/catch around `matchMedia`
- [x] 3.4 e2e (Theme): first visit leaves `localStorage.movieDash_theme` unset; `page.emulateMedia({ colorScheme: 'light' })` → `data-theme="light"` without reload
- [x] 3.5 e2e (Theme): toggle to light, `emulateMedia` dark → stays light, also after reload; `localStorage.movieDash_theme === 'light'`
- [x] 3.6 e2e (Theme): `localStorage.theme = 'light'` set by an init script (another app) with OS dark → app is dark

## 4. Search clear (B104)

- [x] 4.1 `useDebounce.ts`: optional `immediate?: (v: T) => boolean`; when it returns true and `debounced !== value`, set `debounced` render-phase; timer unchanged for other values
- [x] 4.2 `Movies.tsx`: `useDebounce(filters.search, 300, v => v === '')`
- [x] 4.3 e2e (Edge Cases): `page.clock.install()`, search a title, advance past 300 ms, press Clear all without advancing the clock → `expectTotal()` shows the full count

## 5. Drill-down preset (B105)

- [x] 5.1 `usePersistedFilters.ts`: second param `preset?: Partial<FilterState> | null`; initializer returns `sanitizeFilters({ ...defaults, ...preset }, defaults)` and writes it to `sessionStorage` when given, else restores as today
- [x] 5.2 `Movies.tsx`: read `location.state?.presetFilters` during render, pass it to `usePersistedFilters`; mount effect only clears router state (`replace: true, state: null`); remove the old `setFilters` call there
- [x] 5.3 e2e (Drill-down consistency): save a no-match search in sessionStorage, drill down from a Dashboard genre bar; an init-script `MutationObserver` records whether the search box ever held the saved text on `/movies` → never; results match the genre count
- [x] 5.4 e2e: a Stats Runtime-tab decade drill-down (`[2020, 2029]`, no year scope) on mocked data ending in 2024 shows the chip `Year: 2020–2024` (vote ranges are never clamped: the vote slider is fixed 0–10 by design)

## 6. Filter restore with blocked localStorage (B106)

- [x] 6.1 `usePersistedFilters.ts`: own `try/catch` around `localStorage.removeItem(OLD_STORAGE_KEY)`
- [x] 6.2 e2e (Filter Persistence): init script makes `window.localStorage` throw; apply a genre filter, reload → filter still applied, theme toggle still works

## 7. Docs and checks

- [x] 7.1 CLAUDE.md: `ThemeContext` (saved only on toggle, follows OS until then, key `movieDash_theme`), `usePersistedFilters` (preset param), `useDebounce` (`immediate`), and the Movies drill-down flow
- [x] 7.2 `npm run lint`, `npm run type-check`, `npm run test:e2e` (check ports 3000/5000 first, per Known gotchas)
- [x] 7.3 `BUG_BACKLOG.md` §6: Fix ◐ for rows 17, 18, 21, 22 and Batch E; rows 19 and 20 had no findings, so mark their Fix ☑
