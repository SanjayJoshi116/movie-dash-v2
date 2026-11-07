## 1. Playwright and Vite (B68, B71)

- [x] 1.1 `playwright.config.ts`: add `forbidOnly: !!process.env.CI`; verify with a throwaway `tests/x.tmp.spec.ts` containing `test.only` under `CI=1 npx playwright test --list` (expect an error), then delete it
- [x] 1.2 `vite.config.ts`: add `strictPort: true`; fix the line 21–22 comment (the proxy makes `/api` reachable from the LAN under `dev:lan`; only port 5000 stays loopback); verify with a dummy listener on 3000 that `npx vite` exits with a port-in-use error

## 2. ESLint (B69, B72, B73, B74, B77)

- [x] 2.1 Replace `tseslint.config(...)` with `defineConfig(...)` from `eslint/config`
- [x] 2.2 Add `'**/*.tmp.*'` and `'**/__pycache__/**'` to `ignores`
- [x] 2.3 Add a `tests/**/*.spec.ts` block: `@typescript-eslint/no-restricted-imports` restricting `@playwright/test` with `allowTypeImports: true` and a message pointing to `tests/helpers.ts`
- [x] 2.4 Add `no-restricted-properties` banning `waitForTimeout` on `tests/**/*.ts`
- [x] 2.5 `package.json` `lint`: `eslint . --max-warnings 0`
- [x] 2.6 Verify: `npm run lint` is clean; temporary probes (a spec with a runtime `@playwright/test` import, a `page.waitForTimeout(1)`, an unused variable in `src/`) each fail lint; a `probe.tmp.mjs` using `process` is ignored; remove the probes

## 3. Type-check tests and configs (B70)

- [x] 3.1 Add `tsconfig.node.json` (include `tests`, `playwright.config.ts`, `vite.config.ts`; `types: ["node"]`, bundler resolution, `allowImportingTsExtensions`, `noEmit`, `strict`)
- [x] 3.2 `package.json`: `build` → `tsc --noEmit && tsc -p tsconfig.node.json && vite build`; `type-check` → both projects
- [x] 3.3 Verify: `tsc -p tsconfig.node.json` is clean; a deliberate wrong-type helper call in a probe spec fails it; remove the probe

## 4. Bundle budget (B76)

- [x] 4.1 `scripts/check-bundle.mjs`: `zlib.gzipSync(buf)` (default level, matching `compression()`); update the header comment
- [x] 4.2 `npm run build && npm run check:bundle`; record the new landing gzip figure

## 5. Docs and backlog (B78)

- [x] 5.1 README: Security bullet and dev-scripts table say `dev:lan` exposes the whole app, including add/delete through the dev proxy, to the LAN (use only on a trusted network), with only port 5000 loopback; mention `strictPort` in the e2e/port troubleshooting text; update the landing gzip figure if it changed
- [x] 5.2 CLAUDE.md: `dev:lan` wording; Commands (`lint --max-warnings 0`, `tsconfig.node.json` in `build`); e2e notes (`forbidOnly`, lint-enforced helpers import and `waitForTimeout` ban); `strictPort` in the port-hygiene gotcha; landing gzip figure
- [x] 5.3 `BUG_BACKLOG.md`: mark B68–B74, B76–B78 fixed by `harden-build-test-config`; B75 stays open (deferred)

## 6. Verify

- [x] 6.1 `npm run lint`, `npm run build`, `npm run check:bundle`, `npm run test:server` all pass
- [x] 6.2 `CI=1 npm run test:e2e` 65/65 (fresh server; check ports 3000/5000 are free first)
- [x] 6.3 `openspec validate harden-build-test-config --strict`
