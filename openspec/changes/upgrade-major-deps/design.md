## Context

See proposal.md, Why. Current state:
- **Server routes** are all plain string paths (`/api/movies/:id`, etc.): no wildcards, no string regex.
- **SPA fallback:** `prod-deploy` plans to add one using a `RegExp` object.
- **TypeScript config:** the root `tsconfig.json` already uses `moduleResolution: "bundler"`. `server/tsconfig.json` uses `module: "CommonJS"` with `moduleResolution: "node"`, the legacy node10 mode, which newer TypeScript versions deprecate.
- **Vite config:** `vite.config.ts` uses the object form of `build.rollupOptions.output.manualChunks`. `reduce-bundle-size` changes it to a function.

## Goals / Non-Goals

**Goals:**
- Reach current majors with no behaviour change.
- Each phase is independently revertible.

**Non-Goals:**
- Adopting new features of these libraries: antd 6 components, Vite 8 features, Express 5 router features.
- Upgrading React or React Router beyond in-range bumps. Both are already on current majors.

## Decisions

### 1. One phase per commit or PR, lowest risk first
Order: tooling → Express → Vite → antd → TypeScript.
- The server phases are isolated from the UI.
- Vite comes before antd, so the antd visual pass runs on the final build tool.
- TypeScript goes last because it depends on external tooling support.

Each phase must pass the full verification set before the next one starts.

*Alternative:* a single big-bang upgrade. Rejected because when something breaks, a combined diff can't be bisected.

### 2. Always follow the official migration guides
For each major, read that project's migration guide at implementation time and treat it as authoritative. The notes below are starting points, not a complete list.

**Express 5:**
- path-matching syntax changes (named wildcards; string regex patterns no longer supported)
- rejected promises in async handlers reach error middleware automatically
- `req.query` is a getter
- stricter `res.status` validation

All our current routes are simple. Check the `prod-deploy` fallback if it has landed.

**Vite 8:**
- the bundler engine changes, so the `rollupOptions.output.manualChunks` API may be deprecated or replaced
- check the chunking config and the dev `proxy`
- confirm the Node engine requirement is compatible with `>=22.22.0`

**antd 6:**
- removes APIs deprecated during v5
- **Strategy:** while still on v5, run the app with the console open and clear every `Warning: [antd: X] ... is deprecated` across all pages, drawers and modals
- after that, the v6 bump should mostly be type errors and visual tweaks
- re-check `theme.darkAlgorithm` and `ConfigProvider` token usage in `App.tsx`

**TypeScript 7:**
- gate on typescript-eslint's supported-version range
- migrate `server/tsconfig.json` to `module`/`moduleResolution: "node16"` (or `"nodenext"`), keeping CommonJS output via `package.json` type or `.cts` as needed
- the `process.cwd()`-based CSV path rule in CLAUDE.md is unaffected

### 3. `@types/node` tracks the runtime major
Pin `@types/node` to `^22` to match `engines`. Moving to Node 24 or 26 is a separate decision (CI's `node-version`, `engines`, the README).

### 4. Visual verification for antd 6
Before Phase 4, take screenshots of the key screens with the same throwaway Playwright approach used for `docs/screenshots/`:
- Dashboard
- Movies table and grid
- Filters drawer
- Movie drawer
- Add Movie modal
- each Stats tab

Take them in both themes, then compare after the upgrade. Regenerate the README screenshots afterwards if anything changed meaningfully.

## Risks / Trade-offs

- **antd 6 changes default styling** (tokens, spacing), so the app looks different. The screenshot comparison catches it. Adjust `ConfigProvider` tokens to keep the current look where intended.
- **typescript-eslint lags TS 7.** Stop at the newest supported TypeScript, and leave Phase 5 explicitly open in tasks with the reason.
- **Vite 8 output differs, which breaks the bundle budget.** If `reduce-bundle-size` has landed, `check:bundle` catches it. Re-tune the chunking.
- **Express 5 changes body-parser or error shapes.** If `server-api-tests` has landed, the 400/413 error-mapping tests cover it.

## Migration Plan

Each phase is one commit or PR. To roll back, revert that phase's commit; the lockfile is restored with it. No data or config migration for users.
