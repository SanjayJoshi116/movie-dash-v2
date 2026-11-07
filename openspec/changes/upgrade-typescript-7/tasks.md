## 1. Gate

- [ ] 1.1 Confirm a `typescript-eslint` release's `peerDependencies.typescript` includes 7 (`npm view typescript-eslint peerDependencies`). If none does, stop: the change stays parked
  - *Checked 2026-11-06: still blocked.* `typescript-eslint` `latest` 8.72.1 and `canary` 8.72.2-alpha.11 both declare `typescript: ">=4.8.4 <6.1.0"`; TypeScript `latest` is 7.0.2.

## 2. Upgrade

- [ ] 2.1 Read the TypeScript 7 release and breaking-change notes; bump `typescript` to 7 and `typescript-eslint` to the supporting release
- [ ] 2.2 Fix removed or changed options in `tsconfig.json` and `server/tsconfig.json` (server is already `node16`), plus any new type errors
- [ ] 2.3 Check `eslint.config.mjs` still loads with the new typescript-eslint, with no TS-version warning in the `npm run lint` output

## 3. Verify

- [ ] 3.1 Run lint, `type-check`, `type-check:server`, build, `check:bundle`, `test:server`, and `CI=1` e2e
- [ ] 3.2 `npm run build:server`: confirm `server/dist/server/server.js` is still CommonJS, then smoke-test `server.js --production` (health, `/api/movies`, SPA fallback, `/api/nope` JSON 404, malformed JSON 400, CSP + `RateLimit-*` headers)

## 4. Docs

- [ ] 4.1 Update the CLAUDE.md Stack line and TypeScript pin note, plus the README Tech Stack table
