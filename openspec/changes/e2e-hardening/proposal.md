## Why

The e2e suite (`tests/app.spec.ts`, 56 tests) gives weaker guarantees than its size suggests (audit §4 in `docs/audit-findings-2026-10-08.md`):
- **Timing-dependent:** 14 fixed `waitForTimeout` sleeps.
- **Fragile selectors:** several unscoped ones that can match hidden Ant tab panes.
- **Tests that can't fail:** two always pass because they assert `≤ pageSize` on an already-paginated view. One silently skips itself. The language and genre filter tests check only that a badge dot appears.
- **Mislabelled test:** "column sorting on Name" actually clicks the ID column.
- **Masking config:** `retries: 1` hides flakiness, and readiness waits only on Vite.
- **No coverage at all** for several features that already exist: Add Movie, Delete, Stats year slider and Reset, chart PNG download, Dashboard empty state, mobile bottom navigation, grid sort beyond name.
- **No lint** on the Python tools.

## What Changes

- **Replace sleeps with assertions.** Remove every fixed `waitForTimeout` in favour of web-first assertions (`expect(...).toHaveCount`, `toContainText`, `expect.poll`).
- **Scope selectors.** Scope tab-dependent selectors to `.ant-tabs-tabpane-active`. Replace positional `.first()`/`.last()` on generic Ant classes with role- or label-based locators.
- **Fix weak tests.**
  - Make the vacuous assertions meaningful.
  - Turn the silent skip into an explicit precondition.
  - Fix the "sort by Name" test to target the Name column.
  - Make the language and genre filter tests assert that results actually narrow.
- **Config.** Set `retries: 0` locally and keep `1` only in CI, with the trace kept for diagnosis.
- **New tests for existing features.** All mutating `/api` calls are mocked with `page.route`, so e2e never modifies a real `src/movies.csv`:
  - Add Movie (search → import → modal state)
  - Delete (Popconfirm → refetch → drawer closes)
  - Stats year slider and Reset
  - chart PNG download (download event)
  - Dashboard empty state (mocked empty `/api/movies`)
  - mobile BottomNav (phone viewport)
  - grid sort options
- **Python lint.** Add `ruff check` for `movie-search.py` and `backfill_posters.py` to CI.

Tests for behaviour introduced by the other proposed changes are owned by those changes, not this one.

## Capabilities

### New Capabilities
<!-- None — test/tooling only; `skip_specs: true` -->

### Modified Capabilities
<!-- None -->

## Impact

- `tests/app.spec.ts`, possibly split into per-area files under `tests/`, plus a shared `tests/helpers.ts`.
- `playwright.config.ts`.
- `.github/workflows/ci.yml`: Python setup plus a `ruff` step; `requirements-dev.txt` or a pinned `pip install ruff`.
- Depends on `fix-ci-green` (stable search selector and webServer readiness) landing first.
