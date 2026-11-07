## Why

`upgrade-major-deps` Phase 5 was blocked: TypeScript 7.0.2 is `latest`, but `typescript-eslint` (8.72.1 `latest` and the `canary` build) declares `typescript: ">=4.8.4 <6.1.0"`. That phase stopped at TypeScript 6.0.3, and the TypeScript 7 bump moves here so `upgrade-major-deps` can be archived. This change stays parked until typescript-eslint supports 7.

## What Changes

- Bump `typescript` from `~6.0.3` to 7, and `typescript-eslint` to the first release whose peer range includes 7.
- Fix anything TypeScript 7 removes or changes in `tsconfig.json`, `server/tsconfig.json`, or the code. The server's move off `moduleResolution: "node"` is already done (it is now `node16`, done on TS 6 in `upgrade-major-deps`), so it isn't part of this change.
- Update the CLAUDE.md TypeScript pin note and the README Tech Stack table.

No user-visible behaviour change.

## Capabilities

### New Capabilities
<!-- None — dependency maintenance; `skip_specs: true` -->

### Modified Capabilities
<!-- None -->

## Impact

- `package.json`, `package-lock.json`, `tsconfig.json`, `server/tsconfig.json`, maybe `eslint.config.mjs` (if typescript-eslint's config API changes).
- `CLAUDE.md` (Stack line, TS pin note), `README.md` (Tech Stack).
- **Gate:** don't start until typescript-eslint's `peerDependencies.typescript` includes 7 (`npm view typescript-eslint peerDependencies`).
