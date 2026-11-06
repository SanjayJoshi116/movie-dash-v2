## 0. Baseline

- [x] 0.1 Confirm CI is green on `main` (`fix-ci-green` landed); record `npm outdated` output in the PR description
  - *Substituted (2026-11-04):* the tree is uncommitted, so a LOCAL green baseline was used instead of GitHub CI: lint, `type-check:server`, build, `check:bundle` (378.84 kB gzip landing), `test:server` 95/95, `CI=1 test:e2e` 65/65 all passed. `npm outdated` was recorded in the implementation report (no PR). `npm audit --audit-level=high` was **not** clean at baseline (new advisories: body-parser, follow-redirects, vite ≤6.4.3, zod), so it was fixed in-range in Phase 1.
- [x] 0.2 Take before-screenshots of the key screens in both themes (for the antd phase)

## 1. Tooling

- [x] 1.1 `concurrently` → 10; confirm `npm run dev` starts both servers and Ctrl+C stops both
  - Verified start (both servers up, `/api/health` via the proxy, `/movies` SPA 200). Stop was verified with a whole-tree `taskkill /T /F` (no interactive Ctrl+C available to the agent); both ports were freed.
- [x] 1.2 In-range bumps: `@types/react*`, `eslint`, `typescript-eslint`, `@playwright/test`; keep `@types/node` at `^22`
  - Also `npm audit fix` (in-range only, lockfile) to clear the high advisories that appeared after `fix-ci-green` (body-parser, follow-redirects, vite 6.4.5, zod). `@types/node` stays `^22`.
- [x] 1.3 Run the full verification set (lint, build, server type-check, server tests if present, e2e)
  - lint 0, type-check OK, build OK, `check:bundle` 378.84 kB gzip, `test:server` 95/95, e2e 65/65, `npm audit --audit-level=high` clean.

## 2. Server: Express 5

- [x] 2.1 Read the Express 5 migration guide; upgrade `express` and `@types/express` to 5, and `express-rate-limit` to 8
  - Found already applied in the working tree (express 5.3.0, @types/express 5.0.6, express-rate-limit 8.7.3); verified against the migration notes rather than redone.
- [x] 2.2 Fix route path syntax if needed (including any `prod-deploy` SPA fallback), plus `req.query` usage and type errors
  - All routes are plain string paths. The `prod-deploy` SPA fallback is a `RegExp` object, which Express 5 still accepts (only string patterns changed). `req.query` is only read. No type errors.
- [x] 2.3 Simplify async handlers where Express 5 now forwards rejections; keep the explicit storage-error mapping
  - The `route()` wrapper is gone; Express 5 forwards rejections to the error middleware. The route-level catches that map storage/TMDB failures (500 "Failed to delete/save movie", 502, 404) are kept. Covered by `hardening.test.ts` "an unexpected throw in a handler is a generic 500".
- [x] 2.4 Check the rate limiter options against v8 (keying, headers)
  - `limit`, `standardHeaders: true` (draft-6 `RateLimit-*` headers) and `legacyHeaders: false` are valid in v8; the v8 default keying (IPv6 /56 subnet) is fine; `trust proxy` is still only set via `TRUST_PROXY`.
- [x] 2.5 Run the full verification set, then smoke-test `npm run build:server && npm run server:prod`
  - lint 0, type-check:server OK, test:server 95/95, `CI=1` e2e 65/65. `build:server` + `server.js --production` on PORT=5123: health ok (1961 movies), `/api/movies` 200, `/movies` SPA 200 `no-cache`, `/api/nope` JSON 404, `/assets/old.js` 404, malformed JSON 400, `RateLimit-*` headers present.

## 3. Build: Vite 8

- [x] 3.1 Read the Vite 7 and 8 migration guides; upgrade `vite` to 8 and `@vitejs/plugin-react` to 6
  - vite 8.3.5 (Rolldown 1.2.16, Oxc, Lightning CSS minify), @vitejs/plugin-react 6.2.1. Its optional peers (`@rolldown/plugin-babel`, React Compiler) aren't needed. No `esbuild`/`optimizeDeps`/`build.minify` options to migrate. `npm audit --audit-level=high` still clean (10 moderate are pre-existing: `minimatch` under typescript-eslint).
  - Vite 8 prints a warning that `vite.config.ts` is ESM loaded as CommonJS (no `"type": "module"`), which matters only once a future major makes `configLoader: 'native'` the default. Not acted on: switching the package type affects the server's CommonJS build; revisit with Phase 5's tsconfig migration or that Vite major.
- [x] 3.2 Migrate the chunking config (`manualChunks`, or its replacement) and confirm the dev proxy `/api` → `:5000` still works
  - `build.rollupOptions` → `build.rolldownOptions`; the (deprecated) `manualChunks` function → `output.codeSplitting.groups` with `priority` 4/3/2/1 (react, charts, antd-core, antd-shell). Groups capture their dependency closure like `manualChunks` did; path separators are `[\\/]` per Rolldown's Windows advice. Chunk graph stays acyclic: react ← core ← shell ← index ← routes (Movies/Stats/MovieDrawer dynamic only).
  - Dev: `npm run dev` → `localhost:3000/api/health` proxied OK (1961 movies), `/movies` SPA 200.
- [x] 3.3 Confirm Vite's Node engine requirement is compatible with `>=22.22.0` and the CI `node-version: 22`
  - vite 8 and plugin-react 6 both require `^20.19.0 || >=22.12.0`: compatible.
- [x] 3.4 Run the full verification set, plus `check:bundle` if present
  - lint 0, type-check + build OK (no chunk-size warning, 28s → 1.9s), `check:bundle` 363.72 kB gzip landing (was 378.84), test:server 95/95, `CI=1` e2e 65/65 (64 + 1 flaky: "director filter applies and shows a chip" failed once, passed on retry; 8/8 in isolation with `--repeat-each=8 --retries=0`. Suspected pre-existing race in `selectInDrawer`'s trailing `Escape`, not Vite-related).

## 4. UI: antd 6

- [x] 4.1 While still on antd 5, clear every antd deprecation warning in the console across all pages, drawers and modals. Known candidates:
  - `destroyOnClose`
  - `Alert message`
  - `Drawer width`
  - Swept with a throwaway Playwright spec: Dashboard (+ drawer), Movies table/sort/drawer/Popconfirm, Filters drawer (selects + slider), grid view, Add Movie modal (search results + import error Alert), every Stats tab + year slider, unknown route, error/empty/2-row states; both themes; mutations/TMDB mocked. antd 5.29 warned only for `Modal destroyOnClose` (AddMovieModal → `destroyOnHidden`) and `Descriptions labelStyle`/`contentStyle` (MovieDrawer → `styles.label`/`styles.content`). `Alert message` and `Drawer width` aren't deprecated until v6, so they're handled in 4.2 by re-running the sweep on v6. Remaining warning: `[antd: compatible] antd v5 support React is 16 ~ 18` (React 19), which v6 resolves.
- [x] 4.2 Upgrade `antd` and `@ant-design/icons` to 6 following the official migration guide; fix type errors
  - antd 6.7.0, @ant-design/icons 6.3.4: no type errors. Re-ran the 4.1 sweep on v6 and fixed its deprecations: `Alert message` → `title` and `onClose` → `closable.onClose` (AddMovieModal, LoadingError, MovieDrawer); `Drawer width` → `size` (FiltersDrawer, MovieDrawer); `Statistic valueStyle` → `styles.content` (StatCard). Grepped `src/` for the guide's other renames (Space `direction`, Spin `tip`, Tooltip `overlay*`, Tabs `tabPosition`, `size="middle"`, Select `dropdown*`, `maskClosable`, …): none used. The React 19 compat warning is gone.
  - **Deferred:** `[antd: List] The List component is deprecated … use Listy` (Dashboard Recent Releases, AddMovieModal results). `List` still works in v6 and is removed in v7. `Listy` is a new virtualized component with no `List.Item`/`List.Item.Meta`, so moving to it is a rewrite of both lists plus the e2e `.ant-list-item` selectors (design non-goal: no adopting new components). Follow-up before antd 7.
- [x] 4.3 Re-check `ConfigProvider` theme and token use and the dark algorithm in `App.tsx`
  - `darkAlgorithm`/`defaultAlgorithm`, seed tokens, `Tabs` (`inkBarColor`, `itemActiveColor`, `itemSelectedColor`) and `Menu` (`darkItemSelectedBg/Color`) component tokens all still exist in v6. Added `tag={{ variant: 'outlined', styles: { root: { marginInlineEnd: 8 } } }}`: v6 made Tag `filled` by default (borders gone) and dropped its trailing margin (see 4.4).
- [x] 4.4 Compare after-screenshots with the baseline in both themes; adjust tokens where the look changed unintentionally
  - Same 12 screens × 2 themes as 0.2, pixel-diffed. Unintended: Tags lost their outline and spacing → restored via `ConfigProvider tag` (grid diff 0.46% → 0.00%). Accepted: Pagination items a few px further apart. Dashboard/Stats chart diffs are baseline capture noise (charts and sidebar still animating in the before-shots; Explore, with no animated charts, is 0.00%).
- [x] 4.5 Run the full verification set; regenerate `docs/screenshots/` if the UI changed meaningfully
  - Done: lint 0, type-check + build OK (no chunk-size warning), `check:bundle` 361.68 kB gzip landing, test:server 95/95. No `docs/screenshots/` regeneration needed (look matches baseline after 4.4).
  - e2e (`CI=1`, `--workers=1` because of low memory): first run 48 passed, 1 flaky (the pre-existing director-chip race from 3.4), 16 failed — all stale antd 5 class selectors in the tests, not app regressions. antd 6 renamed `.ant-tabs-content-holder` → `.ant-tabs-body-holder` and `.ant-tabs-tabpane[-active]` → `.ant-tabs-content[-active]` (broke `waitForStats`, so every Stats/drill-down test), and single Select's `.ant-select-selector`/`.ant-select-selection-item` → `.ant-select-content` (both page-size tests). `activeTabPane()`/`waitForStats()` now use `getByRole('tabpanel')` (inactive panes are `aria-hidden`); the Top-15 count uses `getByRole('tabpanel', { includeHidden: true })`. Re-ran the 16 with `--retries=0`: 16/16 pass.
- [x] 4.6 If `framer-motion` is still a dependency (`reduce-bundle-size` not landed), upgrade it here and recheck the hover effects
  - N/A: `reduce-bundle-size` landed and removed it (no `framer-motion` in package.json or src).

## 5. Compiler: TypeScript 7

- [x] 5.1 Check that typescript-eslint's supported TypeScript range includes 7. If not, upgrade to the newest supported version, note the blocker here, and stop
  - **Blocked (2026-11-06):** TypeScript 7.0.2 is `latest`, but `typescript-eslint` 8.72.1 (`latest`) and 8.72.2-alpha.11 (`canary`) both declare `typescript: ">=4.8.4 <6.1.0"` (`SUPPORTED_TYPESCRIPT_VERSIONS` in typescript-estree agrees). Upgraded to the newest supported: **TypeScript 6.0.3**, pinned `~6.0.3` so a 6.1 can't slip outside the range.
  - TS 6 needed two tsconfig fixes, done now: root `"types": ["vite/client"]` (TS 6 defaults `types` to `[]` and turns on `noUncheckedSideEffectImports`, so `import './index.css'` had no declaration), and the 5.2 server migration below (TS 6 already errors on `moduleResolution: "node"`/node10 — TS5107).
- [x] 5.2 Upgrade `typescript`; migrate `server/tsconfig.json` off `moduleResolution: "node"` (to `node16`/`nodenext`) and fix any other removed options
  - **TypeScript 7 bump moved to `upgrade-typescript-7`** (parked until typescript-eslint supports 7, see 5.1). The tsconfig half is done on TS 6: `server/tsconfig.json` is `module`/`moduleResolution: "node16"` plus `"types": ["node"]`. With no `"type"` in package.json, `.ts` files are CommonJS, so the emit is still CommonJS (`"use strict"; … require(...)`) and the extensionless relative imports stay valid.
- [x] 5.3 Run the full verification set, including `npm run build:server` output running under `server:prod`
  - Done on TS 6.0.3 (the TS 7 re-run is `upgrade-typescript-7` task 3): lint 0, `type-check` + `type-check:server` clean, build OK, `check:bundle` 361.68 kB gzip landing, test:server 95/95. `build:server` → `server.js --production` on PORT=5123: health ok (1961 movies), `/api/movies` 200, `/movies` SPA 200, `/api/nope` JSON 404, `/assets/old.js` 404, malformed JSON 400, CSP + `RateLimit-*` headers present. Full `CI=1` e2e (`--workers=1`): 65/65, no flakes.

## 6. Docs

- [x] 6.1 Update the CLAUDE.md Stack line and version-specific notes (Vite chunking, Express 5 error handling, antd version)
  - Stack line (TypeScript 6, Vite 8/Rolldown, antd v6, Express 5, express-rate-limit 8) plus a TS 6 pin/tsconfig `types` note; chunking section → `rolldownOptions.output.codeSplitting.groups`/`priority` (the "must port this config" note removed); `route()`/"Express 4 drops async rejections" → Express 5 forwarding + kept explicit status mapping + RegExp SPA fallback; new antd 6 notes bullet (global Tag look via `ConfigProvider`, v6 prop names, deprecated `List` follow-up); Tabs gotcha → `activeTabPane()` role query + antd 6 class renames.
- [x] 6.2 Update the README tech-stack and version mentions
  - Tech Stack table: TypeScript 6, Vite 8, Ant Design v6, Express 5. No other version mentions in README.
