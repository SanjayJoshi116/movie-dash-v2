## Why

`server/server.ts` owns the only code that writes the user's dataset, and it has no automated tests. The e2e suite mocks every mutating route on purpose so it can't damage a real CSV (see `e2e-hardening`). As a result, none of the guarantees `csv-write-safety` introduces would be checked automatically:
- serialized writes
- duplicate rejection
- reload when the file changes on disk
- tolerance of a BOM or a missing trailing newline
- formula-escaping round-trips
- accurate error codes

Without tests, any later refactor could quietly bring back data loss.

## What Changes

- **Testable server.** Refactor `server/server.ts` into a `createApp(options)` factory plus a thin entry point that calls it and listens. Options:
  - CSV path
  - an injectable TMDB client
  - an optional start-up hook

  Production behaviour is unchanged.
- **Tests.** Add a server test suite using Node's built-in test runner through `tsx`, so there's no new test framework. Each test runs against a temporary CSV in a temp directory, never `src/movies.csv`.
- **Coverage.** Every requirement in `csv-write-safety`'s `catalog-persistence` spec, plus:
  - existing routes: health, list, get by id, delete validation, TMDB search parameter validation, `year` handling
  - rate limiting and helmet headers being present
- **Scripts and CI.** Add `npm run test:server`, and run it in CI before the e2e step.

## Capabilities

### New Capabilities
<!-- None — test infrastructure plus a behaviour-preserving refactor; `skip_specs: true` -->

### Modified Capabilities
<!-- None -->

## Impact

- `server/server.ts`, split into `server/app.ts` (factory) and `server/server.ts` (entry). `server/tsconfig.json` includes the new file.
- New `server/__tests__/*.test.ts` and fixtures.
- `package.json` (`test:server` script) and `.github/workflows/ci.yml`.
- `CLAUDE.md`: server layout and test command.
- **Sequencing:** land after `csv-write-safety`. The factory wraps the loader and write queue that change introduces, and the tests verify its spec. If written first, the tests for its behaviour start as `todo`.
