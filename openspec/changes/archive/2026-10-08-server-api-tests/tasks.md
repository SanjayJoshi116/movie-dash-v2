## 1. Refactor for testability

- [x] 1.1 Create `server/app.ts` exporting `createApp({ csvPath, tmdb, tmdbApiKey, onBeforeLoad? })`, which returns `{ app, ready }`. Move all module-level state into it
- [x] 1.2 Reduce `server/server.ts` to env loading, `createApp`, `listen` and signal handlers
- [x] 1.3 Extract the axios `tmdbGet` (with retries and an injectable `sleep`) as the default `tmdb` client
- [x] 1.4 Add `app.ts` to `server/tsconfig.json`; check that `npm run build:server` and `npm run server:prod` still work
- [x] 1.5 Smoke-test `npm run dev`, and confirm `npm run test:e2e` passes unchanged
  - `CI=1` Playwright run (fresh `npm run dev`, readiness via proxied `/api/health` = dev smoke), template CSV: 56/56, `--retries=0`. Real CSV restored (sha256 verified); no leftover processes.

## 2. Test harness

- [x] 2.1 Add the `"test:server": "tsx --test server/__tests__/*.test.ts"` script
- [x] 2.2 Add a helper that creates a temp dir and fixture copy, starts `createApp` on port 0, and returns `baseUrl`, `csvPath` and a cleanup function
- [x] 2.3 Add the fixtures `basic.csv`, `bom.csv`, `no-trailing-newline.csv`, `formula-values.csv` and `empty.csv`, plus a TMDB stub with canned details and credits

## 3. Existing behaviour

- [x] 3.1 Health: `loading` before ready, `ok` after
- [x] 3.2 List and get by id: 200; 404 for an unknown id; 400 for an over-long id
- [x] 3.3 Delete: removes the row from both memory and file; 404 for an unknown id
- [x] 3.4 TMDB search: 400 without query and actor; 503 without an API key; `year` passed only when it's 4 digits; actor path filters by year
- [x] 3.5 Security: helmet headers present, rate limiter returns 429 after the limit (with a low limit injected)
- [x] 3.6 `tmdbGet` retries on 429/5xx/network errors and not on 404 (with instant sleep)

## 4. `catalog-persistence` spec coverage (needs `csv-write-safety`)

- [x] 4.1 Read after write: the list includes the import and excludes the delete; `Cache-Control` requires revalidation
- [x] 4.2 Concurrent deletes and import during delete: end-state file correct after re-parse
- [x] 4.3 Failed write leaves state unchanged (simulate with a read-only file or directory)
- [x] 4.4 Double import of one id: exactly one row stored, one `409`
- [x] 4.5 External append, then delete: the external row survives; external column added, then import: values aligned
- [x] 4.6 Import before ready: `503`, file untouched
- [x] 4.7 BOM file: ids resolve; no-trailing-newline append: the last row is intact
- [x] 4.8 Formula round-trip: `+1` served as `+1` and stored escaped; no double escaping after a rewrite
- [x] 4.9 Error mapping: TMDB 404 → 404; oversized body → 413; malformed JSON → 400

## 5. CI and docs

- [x] 5.1 `.github/workflows/ci.yml`: run `npm run test:server` after build, before e2e
- [x] 5.2 CLAUDE.md: describe the `app.ts`/`server.ts` split, `test:server`, and "tests never touch `src/movies.csv`"
