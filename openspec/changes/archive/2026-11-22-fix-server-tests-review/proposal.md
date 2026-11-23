## Why

The Batch L `/code-review` (high) of the server tests (`BUG_BACKLOG.md` §6 rows 62–66, 68, 70, 71: `server/__tests__/*`) reported 10 issues. None is a production bug; `npm run test:server` passes 112/112. All 10 were confirmed by reading the tests and the server code on 2026-11-20. Each is a test that can pass without checking what it claims (5), can fail by chance (2), or has a misleading name or comment (3). The `/security-review` found nothing: no test code is in the production build, the test hooks can't be reached over HTTP, there are no real keys or network calls, and every write stays inside a `mkdtemp` folder.

## What Changes

**Tests that can pass without checking what they claim:**
- **B152: the apostrophe test never reloads** (`persistence.test.ts:244`). `appendFileSync(path, '')` writes zero bytes, so the fingerprint doesn't change and no reload runs. Loading a stored `''-ism` is never tested; the `formulaValues` fixture covers only single-prefix values. Fix: start a second server on the same folder (`start({ dir })`) and check the served name.
- **B153: "duplicate caught inside the queue" may never reach the queue** (`persistence.test.ts:114`). It relies on `sleep(30)`. If the external append lands first, the route's pre-check (`reloadForRead` + 409, `app.ts:603-605`) answers before any TMDB call. Fix: the `/movie/777` stub resolves a `reached` promise that the test awaits before appending, and the test asserts `tmdb.calls.length > 0`.
- **B154: `armedStat` never checks that its fault fired** (`hardening.test.ts:259, 310`). Both tests depend on the server's exact `stat` call order. Fix: record which call numbers ran the fault and assert it. For the delete test, also assert that a rewrite retry happened (two temp writes, one rename). For the import test, assert that the logger got "Could not stat CSV after write".
- **B155: the deadline test's "shrinking timeouts" check passes when nothing retries** (`tmdb-client.test.ts:112`). `.every()` on an empty `slice(1)` is true. Fix: assert `c.attempts() >= 2`.
- **B156: the shutdown test only covers drain finishing last** (`bootstrap.test.ts:103`). Fix: add the opposite case. Drain resolves first, there's no exit yet, then `finishClose()`, then the exit code is `[0]`.

**Tests that can fail by chance:**
- **B157: the `drain()` test sleeps instead of waiting for the gated rename** (`hardening.test.ts:216`). Fix: the rename hook resolves a `reached` promise; await it before `s.drain()`. Replace the second `sleep(50)` with a check that `drainDone` is still pending after a `setImmediate` tick.
- **B158: "a failed write leaves the file unchanged" uses `chmod`, which root ignores** (`persistence.test.ts:74`). Fix: fail the write through `fsHooks` instead (rename throws; add an `appendFile` hook so the import append can fail too), so the test works on every platform and as any user.

**Misleading names and comments:**
- **B159:** `tmdb-client.test.ts:89` claims "every attempt … bounded by the deadline" but checks one attempt's `instanceof`. Fix: retry once with the fake clock and assert each attempt gets its own signal.
- **B160:** `data-format.test.ts:18` says get-by-id doesn't reload. It does (`reloadForRead`). Fix: remove the comment.
- **B161:** `routes.test.ts:117` stubs `new Error('boom')`, which the real client never throws (CLAUDE.md: only `TmdbRequestError`). Fix: use `tmdbError(500)`, and add a network-error case (`TmdbRequestError` with no status).

Bookkeeping: log B152–B161 in `BUG_BACKLOG.md` §3p, tick CR/SR for rows 62–66, 68, 70, 71 and Batch L, and set Fix ◐ once implemented.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `dev-quality-gates`: server tests wait for events, not fixed delays, and a test that injects a fault checks that the fault happened.

## Impact

- Tests only: `server/__tests__/persistence.test.ts`, `hardening.test.ts`, `tmdb-client.test.ts`, `bootstrap.test.ts`, `data-format.test.ts`, `routes.test.ts`, and maybe `helpers.ts` (a shared `reached()` helper).
- Server code: `createApp`'s `fsHooks` gains an optional `appendFile` hook for B158. It defaults to `fs.promises.appendFile`, the same pattern as `rename`/`stat`, and is never set from `server.ts`.
- `routes.test.ts` (B161) gains one test, so the 112-test count in CLAUDE.md changes. Update it after the run.
- No overlap with other open changes. `fix-utils-types-review` also adds a requirement to `dev-quality-gates`, but a different one.
