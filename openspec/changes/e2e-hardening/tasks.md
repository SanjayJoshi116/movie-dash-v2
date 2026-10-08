## 1. Structure

- [ ] 1.1 Create `tests/helpers.ts`:
  - `searchBox`
  - `activeTabPane`
  - `openFiltersDrawer`
  - `selectInDrawer`
  - `mockMovies`
- [ ] 1.2 (Optional) Split `tests/app.spec.ts` into per-area spec files, as a commit with no logic changes
- [ ] 1.3 `playwright.config.ts`: `retries: process.env.CI ? 1 : 0`

## 2. De-flake existing tests

- [ ] 2.1 Replace all 14 `waitForTimeout` calls with web-first assertions or `expect.poll`
- [ ] 2.2 Scope Stats selectors to the active tab pane; replace `.ant-select-selector` `.first()/.last()` and `.ant-badge-count` `.first()` with role or label locators
- [ ] 2.3 Fix "column sorting on Name" to click the Name header and assert the order of the first two rows
- [ ] 2.4 Replace the two `≤ pageSize` assertions with exact expectations derived from the page-size change
- [ ] 2.5 Turn the silent single-page skip into an explicit precondition (or mock enough rows)
- [ ] 2.6 Language and genre filter tests: assert that the row count drops and that every visible row matches the filter

## 3. New coverage (mutations mocked; never touch the real CSV)

- [ ] 3.1 Add Movie: mock search and import, then assert the results list, the "Added" state and the refetch
- [ ] 3.2 Delete: mock DELETE and the follow-up GET, then confirm the Popconfirm, the drawer closes and the row is gone
- [ ] 3.3 Stats year slider: narrowing it updates the count text, and Reset restores the full span
- [ ] 3.4 Chart PNG download: clicking emits a `download` event with a `.png` filename
- [ ] 3.5 Dashboard empty state: mock `/api/movies` as `[]`, then assert the Empty view and the "Go to Movies" CTA
- [ ] 3.6 Mobile: on a phone-sized viewport, BottomNav is visible, Sidebar is hidden, and nav links work
- [ ] 3.7 Grid sort: each sort option orders the first cards as expected

## 4. Python lint in CI

- [ ] 4.1 Add `requirements-dev.txt` with a pinned `ruff`; fix or annotate the current findings in both scripts
- [ ] 4.2 `.github/workflows/ci.yml`: add `actions/setup-python` and a `ruff check` step

## 5. Verification

- [ ] 5.1 Run `npm run test:e2e` three times in a row locally against the real CSV, all green with `retries: 0`
- [ ] 5.2 Run the same suite against the seeded template CSV (CI conditions), all green
- [ ] 5.3 Confirm `src/movies.csv` is byte-identical before and after the local runs
- [ ] 5.4 Update the test count and suite list in CLAUDE.md
