## 1. App shell

- [x] 1.1 `TopBar`: replace the `<a><Button/></a>` with `<Button href download aria-label="Download CSV template">`; add `aria-label` to the theme toggle; add `showZero` to the count badge
- [x] 1.2 `App.tsx`: render neither nav while `screens.sm === undefined`
- [x] 1.3 `Sidebar`/`BottomNav`: match the active path with trailing slashes stripped
- [x] 1.4 `ErrorBoundary`:
  - `resetKey` prop, reset on change
  - `componentDidCatch` logging
  - `onReset` → `refetch()`
  - no `100vh`
- [x] 1.5 `App.tsx`: pass `location.pathname` as `resetKey` and wire `onReset`
  - Note: no `resetKey` prop was added — `App.tsx` already mounts the boundary with `key={location.pathname}`, which remounts it (clearing the error) on every navigation; `onReset` → `refetch()` is wired.

## 2. Pages

- [x] 2.1 Wrap heading emoji (Dashboard, Movies, Stats) and Stats tab-label emoji in `<span aria-hidden="true">`
- [x] 2.2 `Movies.tsx`: give the Filters button `aria-label` "Filters, active" when filters are active
- [x] 2.3 `Dashboard.tsx`: format Recent Releases and highlight-card dates with `formatDateDDMMYYYY`

## 3. Components

- [x] 3.1 `MovieTable`: remove `role="button"`, `aria-label` and `tabIndex` from rows; render Name as a text-styled `<button>`; keep row click for the mouse
- [x] 3.2 `TopNExplorer`:
  - rank 6–10 colour from a theme token (`var(--text-muted)`)
  - `aria-label` on the Select
  - DD-MM-YYYY for "Most Recent"
  - a minimum of 50 votes for "Highest rated", with a fallback and a hint
- [x] 3.3 `ChartBlock`: export through an offscreen canvas filled with the theme background; add `aria-label` to the download button
- [x] 3.4 `AddMovieModal`: poster fallback on error (`POSTER_FALLBACK`); validate the year as `/^\d{4}$/` with inline error status

## 4. Verification

- [x] 4.1 Keyboard-only pass:
  - tab through the shell, Movies toolbar and table
  - open a movie with Enter
  - toggle the theme
- [x] 4.2 Light-theme visual pass on TopNExplorer and a PNG export opened in an image viewer
  - 4.1/4.2 verified with a throwaway Playwright spec (deleted) against the real CSV (read-only): Tab order has one named "Download CSV template" stop and a named theme toggle; no nested interactive elements in the header; no `tr[role=button]`; Enter on the name button opens the drawer; `/movies/` highlights Movies; "Filters, active" announced; a MutationObserver saw no `<nav>` (BottomNav) at any point on desktop load; exported PNG corner pixel = `#0d0d1a` (dark) / `#f5f7ff` (light), alpha 255; light-theme TopNExplorer screenshot reviewed — ranks 6–10 readable, "min. 50 votes" shown. 4/4.
- [x] 4.3 Confirm `npm run lint` and `npm run build` pass. No local e2e run: no test depends on the row `role="button"`/aria-label (rows are selected via `.ant-table-row` and clicked, which still works); CI runs the e2e suite on push
  - Correction during implementation: hiding heading emoji (2.1) changed headings' accessible names, and 5 e2e assertions selected headings by their emoji name — updated to `{ name: 'Movies' | 'Dashboard' | 'Statistics Dashboard', exact: true }`. Because tests changed, the full suite was run locally after all: lint + build pass, e2e 59/59 on the template CSV. (Port 3000 was occupied by another local project, so runs used a throwaway config on port 3100, deleted afterwards.)
