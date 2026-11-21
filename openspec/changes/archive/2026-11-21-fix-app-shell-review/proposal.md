## Why

The Batch D `/code-review` (high) of the app shell (`BUG_BACKLOG.md` §6 rows 9–16: `main.tsx`, `App.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx`, `ErrorBoundary.tsx`, `LoadingError.tsx`, `ScrollToTop.tsx`) found 8 new issues, all confirmed by reading the code and `node_modules/antd` 6.7.0. The `/security-review` of the same batch found nothing. Two issues are visible to every user: tablet-width loads show an expanded sidebar, and a failed first load shows a "0 movies" badge that makes the data look gone. The rest are recovery, navigation and screen-reader gaps in the shell.

## What Changes

- **B94 — Tablet sidebar never auto-collapses on load** (`App.tsx:44`). antd 6.7's `useBreakpoint` reads `matchMedia` in its first `getSnapshot`, so `screens` is real on the first render, `prevMd === screens.md`, and the render-phase collapse never runs. Start `collapsed` from the first-render breakpoint. Correct the stale "`useBreakpoint()` is `{}` on the first render" comment (`App.tsx:48-49`) and the matching CLAUDE.md line.
- **B95 — TopBar shows "0 movies in catalogue" during a first-load error** (`TopBar.tsx:33`). Hide the count badge while `error` is set.
- **B96 — First-load error shows axios's generic text** (`MoviesContext.tsx` → `LoadingError.tsx:51`). Show the server's `{ error }` body message ("Data still loading") when there is one. Retry a first-load `503` once automatically, which covers the dev race where Vite serves the page before Express has loaded the CSV.
- **B97 — Crashed page doesn't reset on same-section navigation** (`App.tsx:103`). The ErrorBoundary is keyed on `pathname` only, so clicking Stats from a crashed `/stats?tab=people` keeps the error view. Reset on PUSH/POP navigation, not on REPLACE, because Stats' `?tab=` sync uses replace.
- **B98 — Back/Forward always scrolls to top** (`ScrollToTop.tsx:7`). Skip the scroll on POP navigations.
- **B99 — Refresh spinner is never announced** (`TopBar.tsx:52`). antd's `Spin` spreads `aria-label` onto a role-less `div`, where screen readers ignore it. Give the indicator real status text.
- **B100 — Collapsed Sidebar logo link is announced as "play-circle"** (`Sidebar.tsx:62`). Give the link an accessible name and hide the icon.
- **B101 — BottomNav icons leak into link names** ("unordered-list Movies") (`BottomNav.tsx:55`). Hide the icons from assistive technology.
- Bookkeeping: log B94–B101 in `BUG_BACKLOG.md`, tick CR/SR for rows 9–16 and Batch D, and set Fix ◐ once implemented.

Already-logged shell items (B10, B11, B12, B23, B35) are still present but out of scope here.

**Already in the backlog:** B95 is the same as older B27; mark both fixed.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `accessible-ui`: the navigation shell must also collapse the sidebar correctly at tablet width on first paint. Error-view recovery must also cover same-section navigation. The catalogue count must not show while a first load has failed. Load errors must show the server's reason. Back/Forward must keep the scroll position. The refresh indicator and nav links must have correct accessible names, with decorative nav icons hidden.

## Impact

- Code: `src/App.tsx`, `src/components/TopBar.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/ScrollToTop.tsx`, `src/components/Sidebar.tsx`, `src/components/BottomNav.tsx`, `src/contexts/MoviesContext.tsx` (a Batch E file, touched only for error-message extraction and the 503 retry).
- Tests: new e2e cases in `tests/app.spec.ts` (Navigation/Mobile/Edge Cases suites). Mocked routes only; no server changes.
- Docs: CLAUDE.md (`useBreakpoint` first-render note; ErrorBoundary reset rule), `BUG_BACKLOG.md`.
- No API, dependency or bundle-budget change.
