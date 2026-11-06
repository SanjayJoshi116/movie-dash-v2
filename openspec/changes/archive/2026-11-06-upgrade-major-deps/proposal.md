## Why

`npm outdated` (2026-10-08) shows several dependencies a full major version or more behind:

| Package | Installed | Latest |
|---|---|---|
| `antd` / `@ant-design/icons` | 5 | 6 |
| `vite` | 6 | 8 |
| `@vitejs/plugin-react` | 4 | 6 |
| `express` / `@types/express` | 4 | 5 |
| `express-rate-limit` | 7 | 8 |
| `typescript` | 5.9 | 7 |
| `concurrently` | 9 | 10 |

The audit fixes in `fix-ci-green` stay within the current majors. But security fixes and ecosystem support (plugins, typings, the CLAUDE.md-documented React Router v8 line) increasingly assume the newer majors, and the gap only gets more expensive. This change plans the upgrades so that each one lands separately, with CI green in between.

## What Changes

- **Phase 1 — tooling:** `concurrently` 10, plus in-range bumps of `@types/react*`, `eslint`, `typescript-eslint`, `@playwright/test`. `@types/node` stays on the **22.x** line to match `engines` (`>=22.22.0`); it doesn't jump to 26.
- **Phase 2 — server:**
  - `express` 5 and `@types/express` 5
  - `express-rate-limit` 8
  - adapt routing, error-handling and type changes
  - remove the hand-rolled async error handling that Express 5 makes unnecessary
- **Phase 3 — build:**
  - `vite` 8 and `@vitejs/plugin-react` 6
  - migrate `vite.config.ts`, the chunking config and dev proxy, to the new bundler's options
- **Phase 4 — UI library:**
  - `antd` 6 and `@ant-design/icons` 6
  - first clear every antd v5 deprecation warning while still on v5, then upgrade and fix whatever was removed
- **Phase 5 — compiler:**
  - `typescript` 7, *only once* `typescript-eslint` supports it
  - migrate tsconfig options that TS 7 removes (notably the server's `moduleResolution: "node"`)
  - if support isn't available, stop at the latest supported TypeScript and record why
- **Already handled elsewhere:** `framer-motion` 11 → 14 is moot if `reduce-bundle-size` removes the dependency. If that change doesn't land, upgrade it in Phase 4.
- **Docs:** update the CLAUDE.md Stack line and any version-specific notes.

No user-visible behaviour change is intended. Each phase is verified with lint, build, server type-check, server tests (if `server-api-tests` has landed), e2e, and a manual visual pass for Phase 4.

## Capabilities

### New Capabilities
<!-- None — dependency maintenance; `skip_specs: true` -->

### Modified Capabilities
<!-- None -->

## Impact

- `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `server/tsconfig.json`, `eslint.config.mjs` (if typescript-eslint config changes).
- `server/server.ts` (Express 5).
- Many `src/components/*` and `src/pages/*` files (antd 6 API removals). Observed candidates:
  - `Modal destroyOnClose` in `AddMovieModal`
  - `Alert message` in `AddMovieModal`, `LoadingError`, `MovieDrawer`
  - `Drawer width` in `FiltersDrawer`, `MovieDrawer`

  Confirm each against the v5 deprecation warnings and the official v6 migration guide.
- `CLAUDE.md`, `README.md`.
- **Sequencing:** do this after `fix-ci-green` (needs a green baseline). Ideally do it after `server-api-tests` and `e2e-hardening` too, since stronger tests make the riskier phases safer. It interacts with `reduce-bundle-size` (chunking config) and `prod-deploy` (Express static/fallback routes).
