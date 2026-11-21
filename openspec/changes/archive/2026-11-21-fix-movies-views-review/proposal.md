## Why

The Batch H `/code-review` (high) of the Movies views, mutations and export (`BUG_BACKLOG.md` §6 rows 26–29, 52: `AddMovieModal.tsx`, `MovieDrawer.tsx`, `MovieTable.tsx`, `MovieCardGrid.tsx`, `exportCsv.ts`) reported 10 issues. All were confirmed by reading the code on 2026-11-20. 3 were already logged (B14, B19, B31). A fourth widens the existing B17 missing-field crash to these files and is logged as B129. 6 are new: B124–B128 and B130. The `/security-review` found nothing exploitable.

These files also carry older open items the review skipped for space: B21, B24 (drawer and grid parts), B30 (grid part) and B37. They are re-checked here and still present, so this change fixes them too. B49 (antd `List` deprecation) stays out: it is a rewrite tied to antd 7.

The most visible issues: a search typed while another is running is silently dropped, so the list shows results for the old text. That contradicts the "Rapid successive searches" scenario in `catalog-persistence`, whose requirement also forbids starting a search while one is running, so the spec contradicts itself. Separately, a short row or a catalogue without a column crashes the grid, the drawer and the table sorters.

## What Changes

**Add Movie** (`AddMovieModal.tsx`)
- **B125:** a new search replaces one still in progress; the stale reply is dropped (existing `searchIdRef`), and the old request is aborted.
- **B126:** a `409 already in catalogue` marks the row "Added" and refreshes the catalogue, instead of showing an error.
- **B37:** "Added" is derived from the current catalogue, so a movie deleted afterwards can be imported again.
- **B128:** starting an import no longer clears an unrelated error that is still showing.

**Movie details** (`MovieDrawer.tsx`)
- **B19:** a delete still running only closes the drawer, or reports its error, if the drawer still shows the movie it was started for.
- **B31:** the heading emoji is hidden from screen readers.
- **B24:** blank or unknown values (date, runtime ≤ 0, vote ≤ 0) show "—" or are left out, not "Release  ()", "0 mins" or "⭐ 0".

**Views**
- **B124:** the table's Language column sorts by the language name it shows (`MovieTable.tsx:47`).
- **B21:** a sort on a column hidden at the current width is cleared, so it no longer sorts the export unseen (`MovieTable.tsx`).
- **B24:** the grid card leaves out a blank year and "0 mins".
- **B30:** grid cards keep their name and add their visible details as an accessible description (`MovieCardGrid.tsx`).
- **B129 (with B17):** missing fields are normalised once, when the catalogue is fetched (`MoviesContext.tsx`). Every `CATALOGUE_COLUMNS` key becomes a string, so no `.split`/`localeCompare` site can crash. This also fixes B17's Stats tabs.

**Export** (`exportCsv.ts`)
- **B14:** the export starts with a UTF-8 BOM so Excel reads accents correctly.
- **B127:** the blob URL is revoked after the download starts, not straight after `click()`.
- **B130:** header names go through the same formula guard as data cells.

**Bookkeeping:** log B124–B130 in `BUG_BACKLOG.md` §3k, mark B14/B17/B19/B21/B24 (drawer, grid)/B30 (grid)/B31/B37 as owned by this change, tick CR/SR for rows 26–29, 52 and Batch H, and set Fix ◐ once implemented.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `catalog-persistence`: Add Movie lets a new search replace a running one (drops "SHALL NOT start a new search while one is in progress"), treats "already in catalogue" as added, derives "Added" from the catalogue, and keeps errors from other operations visible. A delete affects only the movie it was started for.
- `movie-browsing`: the table sorts what it displays, a hidden column doesn't keep sorting, missing fields never crash the views, movie details show unknown values as unknown, and the export opens correctly in spreadsheets with header names guarded too.
- `accessible-ui`: grid cards expose their visible details to screen readers.

## Impact

- Code: `src/components/AddMovieModal.tsx`, `MovieDrawer.tsx`, `MovieTable.tsx`, `MovieCardGrid.tsx`, `src/utils/exportCsv.ts`, `src/contexts/MoviesContext.tsx` (normalisation only).
- Tests: new e2e cases with mocked routes. The grid sort test reads `aria-label="View details for X"`; that label is kept (D6). `catalog-persistence`'s "Rapid successive searches" scenario gets a real test.
- Overlap: `fix-contexts-hooks-review` and `fix-app-shell-review` also edit `MoviesContext.tsx` (shape check, error text). The normalisation runs after that change's array check. With it in place, `fix-movies-filtering-review`'s B121 guard is redundant but harmless.
