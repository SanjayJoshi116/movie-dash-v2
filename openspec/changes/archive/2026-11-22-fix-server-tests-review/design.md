## Context

Batch L reviewed the server test suite. What was checked against the code on 2026-11-20:

- **B152:** `persistence.test.ts:244` appends `''`. A zero-byte append changes neither the size nor (usually) the mtime, so `reloadIfChanged` sees no change. After that, the DELETE swaps memory without reloading, so the served value is the one kept from the import. The other load-time un-escaping (`'+1`, `'-Ism`) is covered at `:221`.
- **B153:** `app.ts:603-605`: the import route calls `reloadForRead()` and returns 409 before any TMDB call if the id is already there. The test's `sleep(30)` doesn't guarantee the request has got past that point.
- **B157:** `hardening.test.ts:216` and `:220` use `sleep(50)` twice.
- **B154:** `armedStat` (`hardening.test.ts:244`) counts `stat` calls but returns nothing the test can assert on.
  - The delete test fails if the fault never fires (row 9001 is missing). It passes without testing the retry if the fault lands before the read.
  - The import test passes without testing the failure if call #4 never happens.
- **B155:** `tmdb-client.test.ts:112`.
- **B156:** `bootstrap.ts:131-133` waits on `Promise.all([closed, drain])`, but the test only covers drain resolving last.
- **B158:** `persistence.test.ts:74-90` relies on `chmod 0o444`/`0o555`.
- **B159:** `tmdb-client.test.ts:89`.
- **B160:** `data-format.test.ts:18`.
- **B161:** `routes.test.ts:117`.

## Goals / Non-Goals

**Goals:** every test fails when the behaviour it names is broken, and passes regardless of machine speed or user.

**Non-Goals:** new production behaviour, refactoring the test layout, the e2e suite (Batch M).

## Decisions

**D1: Wait for "reached" promises, not sleeps (B153, B157).** Add `reached()` to `helpers.ts`, returning `{ promise, hit }`. A stub or hook calls `hit()` when the server reaches it, and the test awaits `promise`. To check that something is still pending, race it against `setImmediate` instead of sleeping. Remove these `sleep()`s from the test files. `sleep` stays in `helpers.ts` for tests that need real time, such as the retry backoff with a fake clock.

**D2: Faults report that they fired (B154).** `armedStat` returns `fired: number[]`, the call numbers whose callback acted.
- Delete test: assert `fired` includes `2`. Also assert that a reload happened, by seeing two temp-file writes via a `rename` counter, or the logged `CatalogueChangedError` retry.
- Import test: assert `fired` includes `4`, and `captureLogger()` contains "Could not stat CSV after write".

If the server's stat order changes, these tests fail loudly instead of passing with nothing tested.

**D3: Real reload for the apostrophe (B152).** After the import, `const again = await start({ dir: s.dir })`. Assert `GET /api/movies/42` on `again` serves `'-ism`. Then do the delete-rewrite checks on `again`. This tests the load-time un-escape of a stored double apostrophe.

**D4: Fault injection instead of `chmod` (B158).** `createApp({ fsHooks: { appendFile } })` defaults to `fs.promises.appendFile`. `appendMovieToCsv` calls it through the hook (one-line change in `app.ts`). The test passes `rename` and `appendFile` hooks that throw `errnoError('EACCES')`. It keeps all its current assertions, and the `chmod` and `try/finally` go away. The CLAUDE.md `fsHooks` list gets `appendFile`.

**D5: Assertions that can fail (B155, B156, B159).**
- B155: add `assert.ok(c.attempts() >= 2)`.
- B156: a new test runs `work.resolve()`, then `tick`, and checks `exits` is `[]`; then `finishClose()`, `tick`, and checks `[0]`.
- B159: `clockedClient` with attempt 1 = timeout and attempt 2 = success. Assert that two distinct signals were captured, and that after advancing the fake clock past the remaining time the second signal is aborted. If the fake clock can't drive `AbortSignal.timeout`, assert the timeout value passed per attempt (the `timeouts` array already does this) and rename the test to "each attempt gets its own abort signal".

**D6: Names and comments (B160, B161).** Remove the stale comment. `routes.test.ts`: `tmdbError(500)` → 502. Add a case with `new TmdbRequestError('/search/movie', undefined, 'ECONNRESET')` → 502.

## Risks / Trade-offs

- [`fsHooks.appendFile` adds a test seam to production code] → It follows the existing `rename`/`stat`/`sleep` pattern and is never set from `server.ts`. The security review confirmed hooks can't be reached over HTTP.
- [Tests now pin the internal `stat` call numbers more strictly] → Intended: a change in stat order now fails these tests with a clear message instead of passing without testing anything.
