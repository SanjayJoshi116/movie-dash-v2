## Context

See proposal.md, Why. Current state, after `upgrade-major-deps`:
- `typescript` is pinned `~6.0.3`, so a 6.1 can't land outside typescript-eslint's `<6.1.0` range.
- Root `tsconfig.json`: `moduleResolution: "bundler"`, `"types": ["vite/client"]`.
- `server/tsconfig.json`: `module`/`moduleResolution: "node16"`, `"types": ["node"]`. It emits CommonJS because package.json has no `"type"`.
- `tsc` is used only for type-checking (`build`, `type-check*`) and for the server's emit (`build:server`). Vite and tsx do their own transpiling and don't run `tsc`.

## Goals / Non-Goals

**Goals:**
- Run TypeScript 7 with lint, type-checks and the server emit behaving the same as on 6.

**Non-Goals:**
- Adopting new TypeScript 7 language or config features.
- Switching the package to `"type": "module"` (the Vite 8 "ESM config loaded as CommonJS" warning recorded in `upgrade-major-deps` 3.1). That changes the server's emit format, so it is a separate decision.

## Decisions

### 1. Gate on typescript-eslint, not on TypeScript's release
typescript-eslint parses through TypeScript's compiler API. Running it outside its declared range gives a warning at best, and wrong or crashing lint at worst. So nothing starts until a typescript-eslint release lists 7 in its peer range. *Alternative:* `--legacy-peer-deps` / `overrides` to force it. Rejected: CI lint is a required gate, and an unsupported parser makes it untrustworthy.

### 2. Follow TypeScript 7's official migration notes
Read the TS 7 release and breaking-change notes at implementation time and treat them as authoritative. TS 6 already surfaced the main known item, the deprecated node10 resolution, and it's fixed. Re-check the remaining options in both tsconfigs against the notes, especially `esModuleInterop`, `target`, and `rootDir: ".."` on the server.

### 3. Verify the server emit, not just the type-check
`build:server` is the only place `tsc` output runs in production. Confirm that `server/dist/server/server.js` is still CommonJS and passes the same `server:prod` smoke test as `upgrade-major-deps` 5.3.

## Risks / Trade-offs

- [typescript-eslint support takes months] → The change stays parked; TS 6.0.x is supported, so nothing is urgent.
- [TS 7's compiler emits slightly different CommonJS] → The `server:prod` smoke test and `test:server` catch runtime differences.
- [Stricter checks surface new type errors] → Fix them in this change; there should be no behaviour change.

## Migration Plan

One commit. To roll back, revert it (the lockfile comes back with it).
