## Why

CI on `main` is red for two independent reasons: `npm audit --audit-level=high` fails (11 vulnerabilities — 3 critical, 5 high, 3 moderate), and the e2e suite targets a search placeholder string that no longer exists, so 9+ tests time out. Every other follow-up from the 2026-10-08 audit (`docs/audit-findings-2026-10-08.md`) needs a green pipeline to land safely, so this goes first.

## What Changes

- Resolve all `npm audit` findings via non-breaking (in-range) upgrades — every advisory currently reports a fix available without a major bump (`concurrently`/`shell-quote`, `axios`, `compression`, `express`/`body-parser`/`qs`/`proxy-addr`, `nanoid`, `brace-expansion`, `source-map-js`).
- Decouple e2e tests from the search box's placeholder copy: give the search `Input` an accessible name and select it by role in `tests/app.spec.ts` (11 call sites), so future copy edits can't break the suite.
- Type-check the server in CI (`tsc -p server/tsconfig.json --noEmit`) — today `npm run build` only checks `src/`, and `tsx` never type-checks.
- Make Playwright's `webServer` wait for the Express API as well as Vite, so tests can't start before `/api/movies` is reachable.
- Correct `openspec/changes/refine-app-ui/tasks.md` task 4.5, which is ticked although the suite it claims to verify is broken.

Out of scope (tracked in later changes): flaky `waitForTimeout` patterns, new coverage for Add/Delete/Stats deep-links, major-version dependency upgrades.

## Capabilities

### New Capabilities
<!-- None — tooling/test-only change; `skip_specs: true` -->

### Modified Capabilities
<!-- None — no user-visible behavior changes -->

## Impact

- `package.json`, `package-lock.json` — dependency patch/minor bumps; possibly a `type-check:server` script.
- `.github/workflows/ci.yml` — extra server type-check step.
- `src/pages/Movies.tsx` — `aria-label` on the search input (a11y improvement; no visual change).
- `tests/app.spec.ts`, `playwright.config.ts` — selector and webServer updates.
- `openspec/changes/refine-app-ui/tasks.md` — task 4.5 status correction.
