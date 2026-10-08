## Why

The in-app Add Movie and Delete features write to `src/movies.csv`, the user's only copy of their dataset. Today the write path can silently lose or duplicate rows (audit findings S1–S4, S6–S8, S12–S15, C2, C3 and C8 in `docs/audit-findings-2026-10-08.md`):
- Concurrent writes are not serialized.
- While the server runs, it overwrites rows added by `movie-search.py` or `backfill_posters.py`.
- Duplicate imports get past the check during the gap while TMDB is being fetched.
- After a write, the list the UI refetches can come from a 60-second browser cache.

Data loss in a personal dataset is the most costly kind of bug this app can have.

## What Changes

- **Serialized writes.** Every CSV mutation (import append, delete rewrite) goes through a single in-process write queue. Each rewrite uses its own temp file.
- **Preserve external edits.** Before each mutation, reload the catalogue from disk if the file has changed since the server last read it. Rows and columns written by the Python tools are kept instead of overwritten.
- **Reliable duplicate detection.** The duplicate check runs at write time inside the queue. Concurrent or double-clicked imports of one TMDB id produce one row, and the extra requests get a `409`.
- **Readiness and header guards.** Mutations return `503` until the initial CSV load completes. Appending is refused when the file exists but its header couldn't be read.
- **No stale list.** `/api/movies` is served with revalidation (`no-cache` plus a validator) instead of `public, max-age=60`. A refetch after add or delete always shows the change.
- **Hand-edited CSV shapes.** A UTF-8 BOM is stripped from the header. When the file has no trailing newline, an append starts on a new line.
- **Faithful values.** Formula-injection escaping still applies on write but is reversed on read. Titles like `+1` or `-Ism` no longer show a stray `'`, and they aren't re-escaped on every rewrite.
- **Accurate errors.**
  - A TMDB "not found" returns `404`.
  - A CSV write failure reports a storage error, not "TMDB failed".
  - Malformed or oversized request bodies return their `4xx` instead of `500`.
- **Client fixes.**
  - Add Movie ignores out-of-order search responses and blocks overlapping searches.
  - Each import row tracks its own in-progress state.
  - Delete URL-encodes the id, and refetches when the movie is already gone (`404`).
- **Python tools.** `backfill_posters.py` and the header migration in `movie-search.py` write to a temp file and then replace the CSV atomically, so an interrupt can't truncate it.

Out of scope:
- Unifying the `Production Country` and `Production Company` value format across writers (S11). This needs a data-format decision.
- Auth for mutating routes. That belongs to the deploy/hardening change.

## Capabilities

### New Capabilities
- `catalog-persistence`: durability, consistency and freshness guarantees for reading and changing the movie catalogue in `src/movies.csv`. This includes working alongside external tools that edit the same file.

### Modified Capabilities
<!-- None — no existing main specs cover the catalogue store -->

## Impact

- `server/server.ts`: write queue, reload-if-changed, import and delete handlers, CSV helpers, cache headers, error middleware.
- `src/components/AddMovieModal.tsx`, `src/components/MovieDrawer.tsx`: request sequencing, per-row import state, delete edge cases.
- `backfill_posters.py`, `movie-search.py`: atomic file replacement.
- `CLAUDE.md` and `README.md`: correct the "migrates the header" and "safe to interrupt" claims to match the new behavior.
- No new runtime dependencies expected. BOM stripping uses `csv-parser`'s `mapHeaders`.
