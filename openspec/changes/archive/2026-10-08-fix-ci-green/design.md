## Context

See proposal.md — Why. Current state: `npm audit` reports 11 advisories, all with in-range fixes; `tsc -p server/tsconfig.json --noEmit` already passes today (so adding it to CI is a guard, not a cleanup); `playwright.config.ts` has a single `webServer` entry pointing at Vite (`:3000`) while `npm run dev` also starts Express (`:5000`).

## Goals / Non-Goals

**Goals:**
- CI passes end-to-end on `main` with no relaxed gates.
- Test selectors survive copy changes to the search box.

**Non-Goals:**
- Lowering `--audit-level` or adding audit allow-lists.
- Major upgrades (antd 6, vite 8, express 5, TS 7) — separate effort.
- Rewriting flaky test patterns beyond the selector fix.

## Decisions

1. **`npm audit fix` (no `--force`) over pinning/overrides.** All advisories resolve in-range, so a plain fix keeps semver intent and lockfile churn minimal. If any advisory stops resolving in-range by the time this is applied, prefer an `overrides` entry for the transitive package over `--force` (which would pull majors like `concurrently@10`).
   *Alternative:* raise `--audit-level` to `critical` — rejected, hides real issues.

2. **Select search by accessible name, not placeholder.** Add `aria-label="Search movies"` to the toolbar `Input` and use `page.getByRole('textbox', { name: 'Search movies' })` in tests, via one shared helper/const in the spec file.
   *Alternative:* update the placeholder string in tests — rejected, same breakage recurs on next copy edit. A `data-testid` would also work, but the aria-label also fixes an a11y gap (placeholder isn't a label).

3. **Server type-check as its own CI step**, run via `npx tsc -p server/tsconfig.json --noEmit` (optionally exposed as `npm run type-check:server`). Kept separate from `npm run build` so a local `build` stays front-end only and fast.

4. **Playwright `webServer` as an array**: keep the single `npm run dev` command on the first entry (it starts both processes), and add a second readiness `url: http://localhost:5000/api/health` entry — or switch the single entry's `url` to a proxied `http://localhost:3000/api/health`, which proves both Vite *and* Express are up with one check. Prefer the proxied health URL: one process, one check, no duplicate command.

## Risks / Trade-offs

- [In-range bumps change runtime behavior subtly (axios, express)] → full lint + build + e2e run after `npm audit fix`; review the lockfile diff for unexpected majors.
- [`concurrently` fix requires a version that drops a flag we use] → `dev` script only uses positional commands; verify `npm run dev` still starts both servers.
