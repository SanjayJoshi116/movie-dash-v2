## Context

See proposal.md for the eight findings (B94–B101) and specs/accessible-ui for the required behaviour. Constraints that shape the fixes:

- antd 6.7.0 `Grid.useBreakpoint()` uses `useSyncExternalStore`. Its `getSnapshot` calls `window.matchMedia` straight away, so `screens` holds real values on the first render. It is not `{}`, which is what `App.tsx`'s comment and CLAUDE.md say.
- `react-hooks/set-state-in-effect` forbids syncing hook output into state from an effect. Use the render-phase prev-value pattern or a lazy `useState` initialiser.
- `Stats.tsx` keeps `?tab=` in sync with `navigate(..., { replace: true })`. Anything that resets on a location change must ignore REPLACE navigations, or every tab switch would remount Stats.
- The app uses `<BrowserRouter>` (declarative mode), not a data router, so react-router's `<ScrollRestoration>` is not available.
- `MoviesContext` is a Batch E file. Only its error extraction and first-load retry change here.
- `src/` has no `@media` queries and no visually-hidden utility class yet.

## Goals / Non-Goals

**Goals:** fix B94–B101 with small local edits, and add e2e coverage where the behaviour can be driven deterministically.

**Non-Goals:**
- Migrating to `createBrowserRouter` or a data router.
- Fixing the already-logged shell items B10, B11, B12, B23 and B35.
- Saving scroll positions ourselves (no per-key scroll store).
- Server changes. `{ error }` bodies already exist.

## Decisions

**D1 — Initial sidebar state from the first-render breakpoint (B94).** Use `useState(() => screens.md === false)` for `collapsed` and keep the `prevMd` render-phase block for later resizes. `=== false` (not `!screens.md`) means an unknown value, such as a hypothetical SSR snapshot, starts expanded, as it does today. *Alternative:* a `useLayoutEffect` that collapses after mount. Rejected: lint-banned pattern, and a visible expand-then-collapse flash. Also rewrite the comment at `App.tsx:48-49`: `isMobile` still uses `=== false` defensively, but the reason is now "don't assume a value", not "it starts as `{}`".

**D2 — Boundary reset on non-REPLACE navigation (B97).** Keep `key={location.pathname}`, which gives each section a fresh boundary. Add a `resetKey` prop. `AppContent` derives it render-phase: when `location.key` changes and `useNavigationType() !== 'REPLACE'`, store the new key as `resetKey`. `ErrorBoundary.componentDidUpdate` clears `hasError` when `resetKey` changes while it is in error. When there is no error, a changing `resetKey` does nothing, so a healthy page is never remounted. *Alternatives:* keying on `pathname + search` remounts Stats on every tab switch, which the spec forbids. Keying on `location.key` remounts the page on every replace and on every same-route push. *Known limit:* a link to the exact current URL is a REPLACE in react-router, so it won't reset. That is acceptable: the same URL would crash again anyway, and "Try Again" covers it.

**D3 — Skip scroll-to-top on POP (B98).** `ScrollToTop` reads `useNavigationType()` and returns early for `'POP'`, which leaves restoration to the browser (`history.scrollRestoration` stays `'auto'`). Initial page load is also a POP, and it starts at the top anyway. *Alternative:* `<ScrollRestoration>`. Rejected because it needs the data-router migration (Non-Goal). *Trade-off:* for lazy routes (Movies/Stats) the browser may restore before the chunk renders, so the position can be partly lost. The spec only requires that the app doesn't force the page to the top.

**D4 — Server error text + one 503 retry (B96).** Add an `errorMessage(err)` helper in `MoviesContext`. It returns `err.response.data.error` when axios gives a string there, and otherwise `err.message`. It applies to both `error` and `refreshError`. First load only: on a `503`, if no retry has been made yet, schedule one refetch after 1 s (timer cleared in the effect cleanup; the attempt is counted in a ref that is reset when a load succeeds). Then show the error as before. *Alternative:* retry with backoff until it succeeds. Rejected: it hides a stuck server and conflicts with the Retry button. One retry covers the dev start-up race (CSV load takes well under a second for the user's data).

**D5 — Hide badge on first-load error (B95).** TopBar renders `loading ? <Spin/> : error ? null : <Badge/>`. `error` is only set while nothing has loaded (a refresh failure goes to `refreshError` and the last data stays), so this never hides a real count.

**D6 — Persistent status region for refresh (B99).** Always render a `<span role="status">` in TopBar. While `refreshing`, it contains the small `Spin` (marked `aria-hidden`) and visually hidden text "Refreshing catalogue…". The live region must exist before its content changes, or screen readers don't announce it. Add a `.visually-hidden` utility (the standard clip pattern) to `src/index.css`, since none exists. This is not a media query, so the no-`@media` rule still holds.

**D7 — Nav names (B100, B101).** Sidebar brand `<Link>` gets `aria-label="MovieDash – Dashboard"`, which contains the visible "MovieDash" text (label-in-name), and the icon gets `aria-hidden`. BottomNav wraps `{item.icon}` in `<span aria-hidden="true">`. The Sidebar `Menu` items are not changed: antd's Menu already renders the icon outside the `<Link>`.

## Risks / Trade-offs

- [The first-load retry delays the error by 1 s on a real 503] → only 503 is retried, only once, and the skeleton stays up during the wait, so the user sees "loading" rather than a frozen screen.
- [The render-phase `resetKey` bookkeeping adds state to `AppContent`] → it uses the same prev-value pattern as `prevMd`, with a comment that points at D2.
- [B97 has no e2e test: there is no way to make a page throw from a test without a test-only hook] → verify by hand with a temporary `throw` in the People tab (task), and cover the no-remount-on-tab-switch half in e2e.
- [The e2e scroll-restore check could be flaky if the page is too short to scroll] → the test sets a small viewport height and checks `scrollY > 0` with `expect.poll`, and skips nothing silently: it asserts the page is scrollable first.
