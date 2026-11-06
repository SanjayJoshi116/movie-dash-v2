## Context

See proposal.md, Why. Locally, `reuseExistingServer` means e2e often runs against the developer's real `npm run dev` and therefore their real `src/movies.csv` (about 2,000 rows), which is gitignored and not backed up. CI seeds the 5-row template. Tests must pass against both, and must never mutate the real file.

## Goals / Non-Goals

**Goals:**
- Deterministic tests: no sleeps, and no flakes masked by retries locally.
- Coverage for every user-facing feature that exists today.
- Zero risk to local data.

**Non-Goals:**
- Visual regression snapshots.
- API-level unit tests for `server/server.ts`. Worth doing, but it needs a test runner choice (Vitest or `node:test`) and is a separate change.
- An axe accessibility scan. Could follow `a11y-polish`.

## Decisions

### 1. Mock all mutations and TMDB with `page.route`
- `POST /api/tmdb/import`, `DELETE /api/movies/*` and `GET /api/tmdb/search` are intercepted per test with canned JSON.
- For refetch assertions, intercept the subsequent `GET /api/movies` to return the expected list: the original plus or minus one.

*Alternative:* a separate test CSV, with the server started on a different port and `CSV_PATH` env. Rejected for now because the server has no CSV path override, and adding one belongs with `csv-write-safety`. Mocks are sufficient to test UI behaviour.

### 2. Dataset-agnostic assertions
Tests read counts from the UI or from a `request.get('/api/movies')` fixture and assert relative to them, never against hardcoded numbers. Where a test needs specific data (for example, more than one page), it either mocks `/api/movies` or asserts the precondition explicitly with a clear message, instead of silently skipping.

### 3. Shared helpers
Put these in `tests/helpers.ts`:
- `searchBox(page)` (from `fix-ci-green`)
- `activeTabPane(page)`
- `openFiltersDrawer(page)`
- `selectInDrawer(page, label, option)`
- `mockMovies(page, rows)`

Optionally split the 572-line spec into per-area files (`dashboard.spec.ts`, `movies.spec.ts`, …). Low risk, and it makes failures easier to find.

### 4. Retries
`retries: process.env.CI ? 1 : 0`. Keep `trace: 'on-first-retry'` so a CI retry always has a trace.

### 5. Python lint
`ruff check movie-search.py backfill_posters.py` with the default rule set. Pin the version in `requirements-dev.txt`. Fix or `# noqa`-annotate existing findings in the same change.

## Risks / Trade-offs

- **Mocked mutations don't exercise the server write path.** Accepted. The server-side guarantees from `csv-write-safety` need their own API tests (see Non-Goals).
- **Splitting the spec file makes the git diff noisy.** Do the split as a separate first commit with no logic changes.
