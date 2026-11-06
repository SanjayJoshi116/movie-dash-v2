## 1. Bootstrap helpers

- [x] 1.1 Create `server/bootstrap.ts` with `ConfigError`, `parsePort`, `loadEnvFile`, `listen` and `installShutdown`, all with injected dependencies (D1, D4). Add it to `server/tsconfig.json` `include`.
- [x] 1.2 Rewrite `server/server.ts` as `main()`:
  - `loadEnvFile`, then `parsePort(process.env.PORT)`, then `createApp`, then `listen(app, port, process.env.HOST ?? '127.0.0.1')`, then `installShutdown(server, { drain })`.
  - A `ConfigError` or `EADDRINUSE` prints one line and `process.exit(1)`.
- [x] 1.3 Tests in `server/__tests__/bootstrap.test.ts`:
  - `parsePort`: `undefined` → 5000; `'8080'` → 8080; `'abc'`, `'5000abc'`, `'0'`, `'70000'` all throw `ConfigError`.
  - `loadEnvFile`: `ENOENT` is silent; `EACCES` is logged and doesn't throw.
  - `listen`: a second listen on a held port rejects with `EADDRINUSE`; it resolves bound to the requested host.
  - `installShutdown` with a fake server, a `drain` deferred and a fake `exit`:
    - waits for `drain` before calling `exit(0)`;
    - the timeout calls `exit(1)`;
    - a second signal calls `exit(1)` immediately.

## 2. Load-failure state

- [x] 2.1 In `server/app.ts`, add `loadError` (D3). Set it in the boot `.catch` and clear it on any successful `reloadCatalogue()`. `/api/health` reports `status: 'error'`.
- [x] 2.2 Readiness middleware, made async via `route()`: if `loadError` is set, call `reloadForRead()`; if it is still set, return `500 { error: 'Catalogue file could not be loaded; see server log' }`.
- [x] 2.3 Return `drain()` from `createApp()` (D4).
- [x] 2.4 Tests:
  - A duplicate header at boot gives health `error` and `/api/movies` → 500. After the file is repaired, `/api/movies` → 200 with rows and health → `ok`.
  - A missing file gives health `ok` and `[]`.
  - `drain()` resolves only after an in-flight delete has finished writing.
  - Update the existing "duplicate header at boot" test in `hardening.test.ts` to expect the new state.

## 3. Network exposure

- [x] 3.1 `vite.config.ts`: `server.host: 'localhost'`, proxy `target: 'http://127.0.0.1:5000'` (D2).
- [x] 3.2 `package.json`: add the `dev:lan` script (`vite --host` plus the API).
- [x] 3.3 `.env.example`: add a commented-out `# HOST=127.0.0.1` with a one-line note.
- [x] 3.4 Manual check:
  - With `npm run dev`, `curl http://<lan-ip>:5000/api/health` and `:3000` from another device or the LAN IP both fail, while `http://localhost:3000` works.
  - With `npm run dev:lan`, `:3000` is reachable from the LAN and `:5000` is not.

## 4. prod-deploy hand-off

- [x] 4.1 Edit `openspec/changes/prod-deploy`:
  - Remove tasks 3.1 and 3.2 and the local-only requirement from `specs/app-hosting/spec.md`.
  - Reword 5.2 and the `HOST`/`dev:lan` mentions in 4.2/4.5 and proposal.md.
  - Add a note to design §3 (D5).
- [x] 4.2 `openspec validate prod-deploy --strict` passes.

## 5. Wrap-up

- [x] 5.1 `npm run lint`, `npm run type-check:server`, `npm run build`, `npm run test:server` all pass. `CI=1 npm run test:e2e` passes (it checks that the dev proxy still reaches the API).
- [x] 5.2 `grep -n uFEFF server/app.ts server/__tests__/helpers.ts` still shows the escape text.
- [x] 5.3 Docs:
  - README: Getting Started gets `dev:lan`; Deployment env vars get `HOST`; Security gets the localhost-by-default bullet; `/api/health` gets the `error` status.
  - CLAUDE.md: the `server.ts` entry-point paragraph (bootstrap helpers, bind host, load-failure state, `drain`) and the Vite paragraph.
  - `features.txt`.
- [x] 5.4 `BUG_BACKLOG.md`:
  - Log the code-review findings for `server/server.ts` as B42–B46, marked fixed by this change.
  - Record that the security review's LAN finding is fixed and DNS rebinding is a false positive.
  - Tick tracker row 2 for both CR and SR. Update the `prod-deploy` line in §5.
