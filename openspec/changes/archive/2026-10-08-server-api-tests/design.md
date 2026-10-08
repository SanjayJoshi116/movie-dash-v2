## Context

See proposal.md, Why. Today `server/server.ts` has module-level side effects:
- it loads `.env`
- it starts a CSV read stream
- it calls `app.listen`
- it registers SIGTERM/SIGINT handlers

State (`movies`, `csvHeaders`, `ready`) is module-global, and `csvPath` is hardcoded from `process.cwd()`. The compiled output must keep working from `server/dist/server/server.js` (`rootDir: ".."`).

## Goals / Non-Goals

**Goals:**
- Run each test against an isolated server instance and temp CSV.
- No network access in tests.
- No new runtime dependencies.

**Non-Goals:**
- Frontend unit tests.
- Coverage thresholds.
- Testing the Python scripts.

## Decisions

### 1. `createApp(options)` factory
`server/app.ts` exports `createApp({ csvPath, tmdb, tmdbApiKey })`, which returns:
- `app`: the Express instance
- `ready`: a `Promise<void>` that resolves when the initial load finishes
- `close()`: optional cleanup

All formerly global state moves into the factory closure.

`server/server.ts` keeps only these steps:
1. `loadEnvFile`
2. `createApp({ csvPath: path.join(process.cwd(), 'src', 'movies.csv'), … })`
3. `listen`
4. the signal handlers

`csvPath` stays `process.cwd()`-based in the entry point, so the CLAUDE.md gotcha still holds.

### 2. Injectable TMDB client
`tmdb` is an object with a `get<T>(path, params)` method. By default it's the existing axios-based `tmdbGet` with retries. Tests pass a stub that maps paths to canned fixtures, or that throws axios-shaped errors (`{ isAxiosError: true, response: { status: 404 } }`) to exercise error mapping. The retry and backoff logic gets its own unit test, with the sleep injected so the test is instant.

### 3. Node's test runner via tsx
Use `tsx --test server/__tests__/*.test.ts`, with `node:test` plus `node:assert/strict`. HTTP calls go to `app.listen(0)` on an ephemeral port using the built-in `fetch` against `127.0.0.1`. The undici TLS problem described in CLAUDE.md affects only outbound HTTPS through AV inspection, not loopback HTTP.

*Alternatives:*
- Vitest plus supertest: richer output, but adds two dev dependencies for a single-file server.
- Jest: needs ESM/TS configuration.

Revisit if frontend unit tests are added later. Vitest would then cover both.

### 4. Temp CSV fixtures
Each test (or `describe`) gets `fs.mkdtemp(os.tmpdir())` plus a copy of a fixture. Fixtures:
- `basic.csv` (from the template)
- `bom.csv`
- `no-trailing-newline.csv`
- `formula-values.csv`
- `empty.csv`

"External edit" tests write to the temp file directly between requests. Concurrency tests fire `Promise.all` of several requests and then assert on the file contents re-parsed from disk.

### 5. Readiness gating in tests
Start the request inside the factory before awaiting `ready`, so the `503` path can be tested. For example, a stub loader delay, or a fixture large enough to be in progress. Prefer an injectable `onBeforeLoad` hook in `createApp`: a test-only seam, but explicit.

## Risks / Trade-offs

- **The refactor could change production behaviour.** Keep route registration order and middleware identical. Run the full e2e suite and a manual `npm run dev` smoke test after the split.
- **Concurrency tests on a single event loop may not interleave the way real traffic does.** Interleaving is forced by the write queue's async boundaries. The assertions check end state, which is what the spec guarantees, not timing.
