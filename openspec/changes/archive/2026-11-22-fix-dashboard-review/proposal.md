## Why

The Batch F `/code-review` (high) of the Dashboard (`BUG_BACKLOG.md` §6 rows 23, 33, 34, 35: `Dashboard.tsx`, `PosterThumb.tsx`, `DashboardSection.tsx`, `StatCard.tsx`) reported 10 issues. 9 were confirmed by reading the code on 2026-11-20 and are logged as B108–B116. One was rejected: it claimed the mini charts start at phone height on desktop because `Grid.useBreakpoint()` is `{}` on the first render, but antd 6.7's `getSnapshot` reads `matchMedia` before the first commit (`node_modules/antd/es/_util/responsiveObserver.js:81-84`, the same fact as B94). The `/security-review` found nothing.

The most visible issue: the Dashboard's "Top Rated" card ignores vote count, so a 1-vote 10.0 can beat The Godfather. That breaks the existing `accessible-ui` requirement "Top-rated rankings require meaningful vote counts", which the Stats explorer already follows.

## What Changes

- **B108 — "Top Rated" ignores vote count** (`Dashboard.tsx:151`). Use the same rule as Stats' Highest Rated (at least 50 votes, dropped when fewer than 10 movies qualify), from one shared helper.
- **B109 — A failed drawer chunk breaks the Dashboard until reload** (`Dashboard.tsx:398`). A local boundary around the lazy drawer shows a message and lets the next click retry the load, instead of the route error screen.
- **B110 — Negative revenue lowers Total Box Office** (`Dashboard.tsx:133`). Sum only revenue above 0, as the Box Office tab does.
- **B111 — Clickable cards hide their value from screen readers** (`StatCard.tsx:22`, `Dashboard.tsx:62`, `Dashboard.tsx:338`). The accessible name includes what is on screen (value, highlight type, date, rating).
- **B112 — Recent Releases loses list semantics** (`Dashboard.tsx:336`). Keep each `<li>` a list item and put a real `<button>` inside it.
- **B113 — Mini charts rebuild on every Dashboard render** (`Dashboard.tsx:210-227, 317`). Memoize the click handlers and `isClickable`.
- **B114 — Unrated movies show "⭐ 0", and averages show 0 with no data** (`Dashboard.tsx:359, 277, 254-255`). "Not rated" tag for unrated movies; "—" for an average with no data.
- **B115 — Hero tint only works with `#RRGGBB`** (`StatCard.tsx:29`, nit). Build it with `withAlpha` and document the hex-only `color` prop.
- **B116 — Heading levels skip h4** (`DashboardSection.tsx:16`, nit). Section titles become h4 with the same visual size.
- Bookkeeping: log B108–B116 in `BUG_BACKLOG.md` §3i, tick CR/SR for rows 23, 33–35 and Batch F, and set Fix ◐ once implemented.

**Already in the backlog:** Older IDs covered: B108 = B7, B113 = Dashboard part of B13 (the other tabs stay open), B111 = StatCard/Dashboard part of B30, B114 = Dashboard part of B24. B109 shares B10’s root cause but B10 (route chunks) stays open. Update both IDs when archiving.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `accessible-ui`: the top-rated vote rule also covers the Dashboard's Top Rated highlight. Clickable summary cards and list items announce what they show, lists keep their list role, and Dashboard headings don't skip levels.
- `dashboard-layout`: stat cards and badges never show unknown values as real ones (negative revenue, unrated movies, averages with no data), and a failed details load doesn't take down the Dashboard.

## Impact

- Code: `src/pages/Dashboard.tsx`, `src/components/StatCard.tsx`, `src/components/DashboardSection.tsx`, `src/components/TopNExplorer.tsx` and `src/utils/statsHelpers.ts` (shared rating pool), `src/index.css` (one button-reset class).
- Tests: new e2e cases in `tests/app.spec.ts` (Dashboard suite) with mocked rows. The existing "highlight card click opens movie drawer" test clicks the text "Top Rated" and still works.
- No server changes. `PosterThumb.tsx` is unchanged.
- `fix-app-shell-review` also modifies `accessible-ui` ("Interactive controls have accessible names"). This change adds new requirements next to it instead of modifying the same one, so the two can be archived in either order.
