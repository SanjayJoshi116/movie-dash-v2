## 0. Baseline

- [ ] 0.1 Confirm CI is green on `main` (`fix-ci-green` landed); record `npm outdated` output in the PR description
- [ ] 0.2 Take before-screenshots of the key screens in both themes (for the antd phase)

## 1. Tooling

- [ ] 1.1 `concurrently` → 10; confirm `npm run dev` starts both servers and Ctrl+C stops both
- [ ] 1.2 In-range bumps: `@types/react*`, `eslint`, `typescript-eslint`, `@playwright/test`; keep `@types/node` at `^22`
- [ ] 1.3 Run the full verification set (lint, build, server type-check, server tests if present, e2e)

## 2. Server: Express 5

- [ ] 2.1 Read the Express 5 migration guide; upgrade `express` and `@types/express` to 5, and `express-rate-limit` to 8
- [ ] 2.2 Fix route path syntax if needed (including any `prod-deploy` SPA fallback), plus `req.query` usage and type errors
- [ ] 2.3 Simplify async handlers where Express 5 now forwards rejections; keep the explicit storage-error mapping
- [ ] 2.4 Check the rate limiter options against v8 (keying, headers)
- [ ] 2.5 Run the full verification set, then smoke-test `npm run build:server && npm run server:prod`

## 3. Build: Vite 8

- [ ] 3.1 Read the Vite 7 and 8 migration guides; upgrade `vite` to 8 and `@vitejs/plugin-react` to 6
- [ ] 3.2 Migrate the chunking config (`manualChunks`, or its replacement) and confirm the dev proxy `/api` → `:5000` still works
- [ ] 3.3 Confirm Vite's Node engine requirement is compatible with `>=22.22.0` and the CI `node-version: 22`
- [ ] 3.4 Run the full verification set, plus `check:bundle` if present

## 4. UI: antd 6

- [ ] 4.1 While still on antd 5, clear every antd deprecation warning in the console across all pages, drawers and modals. Known candidates:
  - `destroyOnClose`
  - `Alert message`
  - `Drawer width`
- [ ] 4.2 Upgrade `antd` and `@ant-design/icons` to 6 following the official migration guide; fix type errors
- [ ] 4.3 Re-check `ConfigProvider` theme and token use and the dark algorithm in `App.tsx`
- [ ] 4.4 Compare after-screenshots with the baseline in both themes; adjust tokens where the look changed unintentionally
- [ ] 4.5 Run the full verification set; regenerate `docs/screenshots/` if the UI changed meaningfully
- [ ] 4.6 If `framer-motion` is still a dependency (`reduce-bundle-size` not landed), upgrade it here and recheck the hover effects

## 5. Compiler: TypeScript 7

- [ ] 5.1 Check that typescript-eslint's supported TypeScript range includes 7. If not, upgrade to the newest supported version, note the blocker here, and stop
- [ ] 5.2 Upgrade `typescript`; migrate `server/tsconfig.json` off `moduleResolution: "node"` (to `node16`/`nodenext`) and fix any other removed options
- [ ] 5.3 Run the full verification set, including `npm run build:server` output running under `server:prod`

## 6. Docs

- [ ] 6.1 Update the CLAUDE.md Stack line and version-specific notes (Vite chunking, Express 5 error handling, antd version)
- [ ] 6.2 Update the README tech-stack and version mentions
