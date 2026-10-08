## 1. Dependency audit

- [x] 1.1 Run `npm audit fix` (no `--force`) and confirm `npm audit --audit-level=high` exits 0
- [x] 1.2 Review `package-lock.json` diff — no unexpected major-version jumps; use `overrides` for any transitive advisory that doesn't resolve in-range
  - Note: `npm audit fix` downgraded `concurrently` 9.2.4 → 9.2.1 (which pins vulnerable `shell-quote@1.8.3`); restored `concurrently@^9.2.4` and added `"overrides": { "shell-quote": "^1.12.0" }` instead.
- [x] 1.3 Verify `npm run dev` still starts Vite + Express, and `npm run lint` / `npm run build` pass

## 2. Stable e2e search selector

- [x] 2.1 Add `aria-label="Search movies"` to the search `Input` in `src/pages/Movies.tsx`
- [x] 2.2 Add a single helper/const in `tests/app.spec.ts` that resolves the search box via `getByRole('textbox', { name: 'Search movies' })`
- [x] 2.3 Replace all 11 `getByPlaceholder('Search by name, director, actor…')` call sites with the helper

## 3. CI and Playwright config

- [x] 3.1 Add `"type-check:server": "tsc -p server/tsconfig.json --noEmit"` to `package.json`
- [x] 3.2 Add a `npm run type-check:server` step to `.github/workflows/ci.yml` after lint
- [x] 3.3 Point `playwright.config.ts` `webServer.url` at `http://localhost:3000/api/health` so readiness requires both Vite and Express

## 4. Verification & bookkeeping

- [x] 4.1 Run `npm run test:e2e` locally with the template CSV seeded — all 56 tests pass
  - 56/56 passed with `--retries=0` (3.0m); real `src/movies.csv` backed up and restored (sha256 verified).
- [x] 4.2 Untick (or annotate) `refine-app-ui` task 4.5 to reflect that the suite was broken until this change
- [ ] 4.3 Push and confirm the GitHub Actions run is green
