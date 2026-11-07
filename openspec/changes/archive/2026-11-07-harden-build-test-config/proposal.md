## Why

The Batch C code review (`BUG_BACKLOG.md` §6 rows 6, 7, 8, 72: `vite.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `scripts/check-bundle.mjs`, 2026-11-07) raised 10 findings. Nine were confirmed against the code. The tenth, all dev-proxy traffic sharing one rate-limit bucket, is real in principle but has never caused a failure, so it is logged open and deferred (B75). The security review found nothing at confidence ≥ 8, but it noticed that the docs say `dev:lan` keeps the API unreachable from the LAN, which is wrong (B78).

The guards most worth having protect the user's data and keep CI honest:
- A committed `test.only` turns the e2e run into one test that passes.
- A spec importing `test` from `@playwright/test` instead of `tests/helpers.ts` skips the fixture that stops e2e from writing the real `src/movies.csv`.

## What Changes

1. **Focused tests fail CI.** `forbidOnly` is on under `CI`. (B68)
2. **Lint enforces the e2e safety rules.** Specs may not import runtime values from `@playwright/test` (types are allowed). `waitForTimeout` is banned in `tests/`. (B69, B74)
3. **e2e specs and build configs are type-checked.** A new `tsconfig.node.json` covers `tests/`, `playwright.config.ts` and `vite.config.ts`, and `npm run build` checks it. They compile cleanly today. (B70)
4. **The dev server fails fast on a busy port.** `strictPort: true`, so Vite never moves to 3001 while Playwright waits on 3000. (B71)
5. **Lint is stricter and quieter.** Warnings fail (`--max-warnings 0`; the count is 0 today). Gitignored throwaway files (`*.tmp.*`) are not linted. The deprecated `tseslint.config()` is replaced by ESLint's `defineConfig()`. (B72, B73, B77)
6. **The bundle budget measures what is served.** It gzips at zlib's default level, the same as the server's `compression()`, instead of level 9. (B76)
7. **Docs describe `dev:lan` accurately.** LAN devices can use the whole app, including adding and deleting movies, through the dev proxy. Only port 5000 itself stays loopback. (B78)

## Capabilities

### New Capabilities
- `dev-quality-gates`: CI and local tooling guards. Focused tests fail CI. e2e specs can't bypass the write guard or use fixed sleeps. Specs and build configs are type-checked. Lint warnings fail. The dev server refuses a busy port.

### Modified Capabilities
- `frontend-performance`: the landing-page budget is measured at the compression level the server actually uses.

## Impact

- **Code and config:**
  - `playwright.config.ts`, `vite.config.ts`, `eslint.config.mjs`, `scripts/check-bundle.mjs`
  - `package.json` (`lint`, `build`, `type-check` scripts)
  - new `tsconfig.node.json`
- **CI:** no new steps. The existing lint and build steps get stricter.
- **Docs:** README (Security, dev scripts), CLAUDE.md, `BUG_BACKLOG.md` (B68–B78).
- **No runtime, server or UI behaviour changes, and no new dependencies.**
