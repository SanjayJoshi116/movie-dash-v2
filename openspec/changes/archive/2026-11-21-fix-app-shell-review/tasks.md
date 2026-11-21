## 1. Backlog bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add a §3g "Found 2026-11-20 (Batch D review: app shell rows 9–16), fixed by `fix-app-shell-review`" with B94–B101 (severity + confidence, file:line, one-line fix), plus a line that SR found nothing and that B10/B11/B12/B23/B35 were re-checked and are still open
- [x] 1.2 §6: tick CR ☑ and SR ☑ for rows 9–16 and Batch D; Batch D findings column = "B94–B101 · `fix-app-shell-review`"; update the Progress line

## 2. Sidebar first-paint collapse (B94)

- [x] 2.1 `App.tsx`: `collapsed` = `useState(() => screens.md === false)`, after `screens` is read; keep the `prevMd` render-phase block
- [x] 2.2 Rewrite the `App.tsx:48-49` comment (antd 6.7 `useBreakpoint` is real on first render; `=== false` is defensive)
- [x] 2.3 CLAUDE.md: fix the BottomNav paragraph's "`useBreakpoint()` is `{}` on the first render" claim and mention the sidebar's initial state

## 3. Catalogue load errors (B95, B96)

- [x] 3.1 `MoviesContext.tsx`: `errorMessage(err)` helper (axios `response.data.error` string, else `err.message`, else 'Unknown error'); use it for `error` and `refreshError`
- [x] 3.2 `MoviesContext.tsx`: first load only, a `503` with no retry yet schedules one `refetch` after 1 s (cleared in cleanup, attempt ref reset on success); otherwise set `error` as today
- [x] 3.3 `TopBar.tsx`: render no count badge while `error` is set

## 4. Navigation behaviour (B97, B98)

- [x] 4.1 `ErrorBoundary.tsx`: optional `resetKey` prop; `componentDidUpdate` clears `hasError` when `resetKey` changed and the boundary is in error; update the class comment
- [x] 4.2 `App.tsx`: derive `resetKey` render-phase from `location.key` when `useNavigationType() !== 'REPLACE'`; pass it to the boundary (keep `key={location.pathname}`)
- [x] 4.3 `ScrollToTop.tsx`: return early when `useNavigationType() === 'POP'`
- [x] 4.4 CLAUDE.md: ErrorBoundary note gains the `resetKey` / non-REPLACE rule (no `search` in the key)

## 5. Accessibility (B99, B100, B101)

- [x] 5.1 `src/index.css`: add a `.visually-hidden` utility (clip pattern)
- [x] 5.2 `TopBar.tsx`: always-rendered `<span role="status">`; while refreshing it holds an `aria-hidden` `Spin` + visually hidden "Refreshing catalogue…"
- [x] 5.3 `Sidebar.tsx`: brand `Link` `aria-label="MovieDash – Dashboard"`, icon `aria-hidden`
- [x] 5.4 `BottomNav.tsx`: wrap `{item.icon}` in `<span aria-hidden="true">`
- [x] 5.5 CLAUDE.md Accessibility conventions: nav icons hidden, icon-only links named, live status regions stay mounted

## 6. E2E tests (`tests/app.spec.ts`, mocked routes only)

- [x] 6.1 Navigation: 700px viewport → sidebar is collapsed on load (no resize)
- [x] 6.2 Edge Cases: `/api/movies` → 500 `{ error: 'Catalogue file could not be loaded; see server log' }` → alert shows that text and no "movies in catalogue" badge
- [x] 6.3 Edge Cases: first `/api/movies` → 503, second → mocked rows → table renders with no error alert
- [x] 6.4 Navigation: scroll Dashboard (assert scrollable first), click Movies nav, `goBack()` → `expect.poll(scrollY) > 0`; then click Stats nav from scrolled Movies → `scrollY` is 0 (Chromium restores the scroll after the old `scrollTo(0, 0)` too, so this guards the spec rather than reproducing B98; the test also records scroll events after Back and fails on any forced jump to 0)
- [x] 6.5 Mobile: BottomNav links found by `getByRole('link', { name: 'Movies', exact: true })` (and Dashboard/Stats)
- [x] 6.6 Navigation: collapsed sidebar brand link is found by name "MovieDash – Dashboard"
- [x] 6.7 Movies Add & Delete: after a mocked import, with the refetch `GET` delayed, `getByRole('status')` contains "Refreshing catalogue"
- [x] 6.8 Stats Page: switching tabs keeps the Stats page mounted (e.g. a filter/slider state or the tab bar element survives `?tab=` replace)

## 7. Verify

- [x] 7.1 Manual: temporary `throw` in `PeopleTab`, open `/stats?tab=people`, click Stats in Sidebar and BottomNav → error view clears; remove the throw
- [x] 7.2 `npm run lint`, `npm run type-check`, `npm run build`, `npm run check:bundle`
- [x] 7.3 `npm run test:server` and `npm run test:e2e` (check ports 3000/5000 first, see CLAUDE.md gotchas)
- [x] 7.4 `openspec validate fix-app-shell-review --strict`
- [x] 7.5 `BUG_BACKLOG.md`: mark B94–B101 ✅, Batch D and rows 9–16 Fix → ◐ (☑ after archive)
