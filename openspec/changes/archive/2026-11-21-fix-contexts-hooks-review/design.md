## Context

Batch E of the per-module review (`BUG_BACKLOG.md` §6 rows 17–22) logged B102–B107 in §3h. Each was re-checked against the code on 2026-11-20:

- `ThemeContext.tsx:39-44`: the `useLayoutEffect` keyed on `isDark` runs on mount and calls `localStorage.setItem('theme', …)`, so the OS-derived default is saved on the first visit (B102). The key is the bare `'theme'` at lines 17 and 42 (B107).
- `MoviesContext.tsx:56`: `setMovies(response.data)` with no shape check (B103).
- `Movies.tsx:74`: `useDebounce(filters.search, 300)` delays every change, including a reset to `''` (B104).
- `Movies.tsx:64-72`: the drill-down preset is applied in a mount `useEffect`, after `usePersistedFilters` seeded state from `sessionStorage` and after the render-phase clamp at `Movies.tsx:50-56` may already have run on the old filters (B105).
- `usePersistedFilters.ts:41-45`: `localStorage.removeItem` and the `sessionStorage` read share one `try` (B106).

`fix-app-shell-review` (not applied yet) also edits `MoviesContext.tsx`, for B96's `errorMessage` helper and the first-load 503 retry. This change only adds a shape check ahead of that error path.

## Goals / Non-Goals

**Goals:** fix B102–B107 with no new dependencies, keep the existing lint rules (`react-hooks/set-state-in-effect`, no `@media`), and cover each fix with an e2e test using mocked routes.

**Non-Goals:** B96 and the 503 retry (`fix-app-shell-review`), B35 (`color-scheme` / white flash), syncing the theme across tabs, a frontend unit-test runner.

## Decisions

**D1 — Save the theme only on toggle; follow the OS until then (B102).** `ThemeProvider` keeps `isDark` plus `hasChoice` (initially true only if a valid value was saved). The layout effect only sets `data-theme`. `toggleTheme` computes `next = !isDark` from the current value, sets state, sets `hasChoice`, and writes storage in the handler (not inside a state updater, which StrictMode calls twice). A `useEffect` keyed on `hasChoice` subscribes to `matchMedia('(prefers-color-scheme: dark)')` `change` while `hasChoice` is false and calls `setIsDark(e.matches)` from the listener. Setting state from a subscription callback is allowed by `set-state-in-effect`. Removed in cleanup, wrapped in try/catch like `prefersDark()`. *Alternative:* keep writing on mount and add a "user chose" flag in storage. Rejected: two keys to keep in sync, and the stored value would still be an OS guess.

**D2 — `movieDash_theme`, no migration from `theme` (B107).** Every existing `theme` value was written on mount by B102, so it can't be told apart from a real choice. Migrating it would carry the bug forward for every existing user. Reading only the new key means the theme follows the OS once; a user who wants the other theme toggles once. The old `theme` key is not removed either: on `localhost:3000` it may belong to another project. *Alternative:* migrate once (what the backlog suggested). Rejected for the reason above.

**D3 — Non-array body is a failed load (B103).** In `MoviesContext`'s `.then`, if `!Array.isArray(response.data)`, take the same branch as `.catch` with the message `"Unexpected response from the server"`: first load → `error`/`loading false`; after a load → `refreshError`/`refreshing false`, keeping `movies`. Implemented by throwing an `Error` from the `.then` so it reaches the existing `.catch`, which then passes it through whatever message helper `fix-app-shell-review` adds. No per-row validation: the server owns row shape, and the crash is the top-level `.filter` call.

**D4 — `useDebounce` gets an `immediate` predicate (B104).** `useDebounce(value, delay, immediate?: (v: T) => boolean)`. When `immediate(value)` is true and `debounced !== value`, the hook sets `debounced` during render (the render-phase prev-value pattern this codebase uses instead of effects), so the cleared value applies in the same render as the cleared box. The timer still runs for other values. `Movies.tsx` passes `v => v === ''`. Because `debounced` itself becomes `''`, typing again right after a clear debounces from `''`, not from the old text. *Alternative:* `const effective = search === '' ? '' : debounced` in `Movies.tsx`. Rejected: typing within 300 ms of a clear would briefly re-apply the old text, which `debounced` still holds.

**D5 — Preset as initial state (B105).** `usePersistedFilters(defaults, preset?: Partial<FilterState> | null)`. If `preset` is given, the initializer returns `sanitizeFilters({ ...defaults, ...preset }, defaults)` and writes it to `sessionStorage` (idempotent, so StrictMode's double call is harmless); otherwise it restores as today. `Movies.tsx` reads `location.state.presetFilters` during render, passes it, and keeps a mount effect that only clears the router state (`navigate(pathname, { replace: true, state: null })`, an external-system sync). The existing one-time render-phase clamp then runs on the preset, so preset ranges are clamped like restored ones (year, runtime and revenue; vote ranges are never clamped, since the vote slider is fixed at 0–10). The sanitize pass matters because router state survives a reload in the browser's history entry.

**D6 — Separate try for the legacy cleanup (B106).** `localStorage.removeItem(OLD_STORAGE_KEY)` gets its own `try {} catch {}` before the `sessionStorage` read.

## Risks / Trade-offs

- [Existing users see the OS theme once (D2)] → One toggle restores their choice; noted in the proposal.
- [`fix-app-shell-review` and this change both edit `MoviesContext.tsx`] → Small, separate hunks (`.then` here, `.catch`/retry there). Whichever lands second rebases; task 2.2 checks the combined path.
- [Theme-following tests depend on Playwright's `emulateMedia` firing `change` events] → Chromium does; the suite already pins `colorScheme: 'dark'`, so the test switches it explicitly.
