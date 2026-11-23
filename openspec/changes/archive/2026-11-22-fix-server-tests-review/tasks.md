## 1. Bookkeeping

- [x] 1.1 `BUG_BACKLOG.md`: add §3p "Found 2026-11-20 (Batch L review: server tests, §6 rows 62–66, 68, 70, 71), owned by `fix-server-tests-review`" with B152–B161 and SR's result
- [x] 1.2 `BUG_BACKLOG.md` §6: tick CR + SR for rows 62–66, 68, 70, 71 and Batch L; update the Progress line

## 2. Helpers and hooks

- [x] 2.1 `helpers.ts`: `reached()` → `{ promise, hit }`; `armedStat` returns `fired`
- [x] 2.2 `server/app.ts`: `fsHooks.appendFile` (default `fs.promises.appendFile`), used by `appendMovieToCsv`

## 3. Vacuous tests

- [x] 3.1 `persistence.test.ts` apostrophe test: reload through `start({ dir: s.dir })` (B152)
- [x] 3.2 `persistence.test.ts` external-duplicate test: `reached` in the `/movie/777` stub; assert `tmdb.calls.length > 0` (B153)
- [x] 3.3 `hardening.test.ts` delete and import `armedStat` tests: assert `fired`, plus the retry or the logged stat failure (B154)
- [x] 3.4 `tmdb-client.test.ts` deadline test: `attempts() >= 2` (B155)
- [x] 3.5 `bootstrap.test.ts`: add "drain first, then close" (B156)

## 4. Flaky tests

- [x] 4.1 `hardening.test.ts` drain test: `reached` in the rename hook; pending check via a `setImmediate` race (B157)
- [x] 4.2 `persistence.test.ts` failed-write test: `fsHooks` `rename`/`appendFile` throw `EACCES` instead of `chmod` (B158)

## 5. Names and comments

- [x] 5.1 `tmdb-client.test.ts`: per-attempt signal test with a retry, or rename it (B159)
- [x] 5.2 `data-format.test.ts`: remove the stale comment (B160)
- [x] 5.3 `routes.test.ts`: `tmdbError(500)` plus a network-error `TmdbRequestError` case (B161)

## 6. Checks

- [x] 6.1 Break each target on purpose once and confirm the test now fails: skip the in-queue duplicate check, drop `closed` from `Promise.all`, make timeouts non-retryable, and remove the `markWritten` stat. Revert each one afterwards
- [x] 6.2 Confirm no `sleep(` is left in those tests other than fake-clock or backoff uses (`grep -n "sleep(" server/__tests__`)
- [x] 6.3 After any `helpers.ts` edit, check that the BOM escape is intact (`grep -n uFEFF server/__tests__/helpers.ts`)
- [x] 6.4 `npm run lint`, `npm run type-check`, `npx tsc -p server/tsconfig.json --noEmit`, `npm run test:server` (run it 3 times)
- [x] 6.5 CLAUDE.md: the server test count, `fsHooks` including `appendFile`, and `reached()` in the helpers list
- [x] 6.6 `BUG_BACKLOG.md` §6: Fix ◐ for rows 62–66, 68, 70 and Batch L; row 71 (`hosting.test.ts`, no findings) Fix ☑
