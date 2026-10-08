## Context

See proposal.md, Why. Current state of `server/server.ts`:
- After a one-shot stream load, it keeps `movies: Movie[]` and `csvHeaders` in memory.
- Imports are appended with `fs.promises.appendFile`.
- Deletes rewrite the whole file through a fixed `${csvPath}.tmp` followed by `rename`.
- Nothing serializes these writes.

`movie-search.py` and `backfill_posters.py` write to the same file independently. There is one Node process, one file and a small dataset (thousands of rows), so whole-file operations are cheap.

## Goals / Non-Goals

**Goals:**
- No lost, duplicated or truncated rows under concurrent in-app use or while the Python tools run.
- Stay dependency-free and single-process, and keep CSV as the storage format.

**Non-Goals:**
- Safety across multiple processes or servers (no OS-level file locking).
- Protecting against an external tool and the server writing at *exactly* the same moment. The docs will say to avoid running both writers at once. We only guarantee the server won't overwrite changes it can observe.
- Moving to SQLite or another store.

## Decisions

### 1. One promise-chain write queue
- Add a module-level `let writeChain = Promise.resolve()` and a `function enqueueWrite<T>(fn: () => Promise<T>): Promise<T>`.
- Each call chains `fn` after the previous operation. It catches errors so one failure doesn't break the chain.
- Import and delete each run their *whole* critical section inside the queue, in this order: reload if the file changed, check for a duplicate or existence, change the file, change memory.

*Alternatives:*
- The `proper-lockfile` or `async-mutex` packages: unnecessary for one process.
- OS file locks: not portable on Windows, and the Python tools wouldn't respect them anyway.

### 2. Reload-if-changed via a `stat` fingerprint
- Extract the boot loader into `loadCatalogue(): Promise<{movies, headers}>`.
- Record `{ mtimeMs, size }` after every load and after every server write.
- At the start of each queued mutation, `stat` the file. Do the same cheaply on `GET /api/movies`.
- If the fingerprint differs, reload and replace the in-memory state before continuing.

*Alternative:* `fs.watch`. Rejected because it is unreliable on Windows and network drives and fires several events per write. Checking on demand is simpler and exactly as fresh as needed.

### 3. Duplicate check inside the queue, TMDB fetch outside
- The TMDB detail and credit fetches are slow and retried. They run *before* entering the queue so the queue is never held during network I/O.
- Inside the queue, re-check whether the `Movie ID` exists against the freshly reloaded state. Return `409` if it does.
- Also keep an `inFlightImports: Set<number>`, checked at the start of the request. A double-click then gets an immediate `409` without spending TMDB calls.

### 4. Appends and rewrites
**Append** (inside the queue):
- Read the last byte of the file. If the file is non-empty and that byte isn't `\n`, prefix the payload with `\n`.
- Map row values onto the *current on-disk header* (after the reload), leaving unknown header columns empty.
- If the file is non-empty but the header is empty, throw a storage error rather than guessing.

**Rewrite:**
- Use the temp path `${csvPath}.${process.pid}.${Date.now()}.tmp`, then `rename`.
- Writes are already serialized, so the unique name is extra safety. It also avoids colliding with a stale tmp file left by an earlier crash.
- Update `.gitignore` to `src/movies.csv*.tmp`.

### 5. Formula escaping: escape on write, unescape on read
- Keep `sanitizeCsvValue` (adds a leading `'`) on write.
- On load, turn any value matching `/^'[=+\-@]/` back by dropping the leading `'`.
- Rewrites then escape each original value exactly once.
- A value that genuinely begins with `'=` becomes ambiguous. That is extremely rare and accepted.

*Alternative:* store values raw and escape only in exported CSVs. Rejected because this user regularly opens the stored file itself in Excel.

### 6. BOM
- Use `csv({ mapHeaders: ({ header }) => header.replace(/^﻿/, '').trim() })`.
- Rewrites never write a BOM.

### 7. Caching
- `GET /api/movies` sends `Cache-Control: no-cache` and a weak `ETag` built from an in-memory version counter.
- The counter goes up on each load or mutation, and a matching request gets `304`.
- Express's built-in ETag handling would hash the body on every request. A version counter is cheaper and exact.

### 8. Readiness and errors
- Extend the existing `/api/movies` readiness middleware to cover `/api/tmdb/import`.
- The error middleware uses `err.status` or `err.statusCode` for `4xx` errors (body-parser sets these). Anything else returns a generic `500`.
- Import turns an axios `404` from TMDB into `404 { error: 'Movie not found on TMDB' }`, and a storage error into `500 { error: 'Failed to save movie' }`.

### 9. Client sequencing
**`AddMovieModal`:**
- Keep a `requestIdRef` that goes up with each search. A response is applied only if its id is still the current one.
- `onPressEnter` does nothing while `searching`.
- Replace `importingId: number | null` with `importingIds: Set<number>`, updated immutably.

**`MovieDrawer`:**
- Wrap the id in `encodeURIComponent`.
- On `404`, call `refetch()` and `onClose()` instead of showing an error.

### 10. Python atomic writes
Both scripts write to `CSV_PATH + '.tmp'` and then call `os.replace()`, which is atomic on Windows and POSIX.

## Risks / Trade-offs

- **Reloading on every mutation reads the whole file.** The dataset is small, so it costs milliseconds. Revisit only if the CSV grows past 100k rows.
- **An external tool could write between the server's reload and its rename.** The window is narrow. The README will say not to run the Python tools while importing or deleting in-app. This can't be solved without cross-process locking.
- **A reload replaces the in-memory array partway through a request.** All handlers read `movies` from module state at call time, and none keeps a reference across an `await`.
- **Unescaping on read changes the values clients see for rows that were already escaped.** This is intended, because those `'`-prefixed values were display bugs.

## Migration Plan

No data migration is needed. The new loader reads existing files with `'`-escaped values correctly. To roll back, revert the commit; the file format doesn't change.
