## Why

The Batch B code review (`BUG_BACKLOG.md` §6 rows 4–5: `movie-search.py`, `backfill_posters.py`, 2026-11-07) raised 10 findings, and all 10 were confirmed against the code (the BOM, `extrasaction` and CRLF ones reproduced in Python 3.13). Three were already open (B3, B8, B9); seven are new (B61–B67). The server has had matching guards since `harden-catalogue-server` and `fix-server-batch-a-review`, but the two Python writers still:
- break on an Excel BOM file (B3),
- glue a new row onto a last line with no trailing newline (B9),
- store a near-empty row when TMDB fails and then block re-adding it (B8),
- overwrite rows the app added while a backfill was running (B61).

The security review of the same files found nothing at confidence ≥ 8.

## What Changes

1. **Shared catalogue I/O module for both scripts** (B3, B9, B65, B66, B67). A new `catalogue_io.py` holds the TMDB session factory and every CSV read, append and rewrite:
   - Reads use `utf-8-sig` and record the file's BOM and line-ending style.
   - Appends add a missing trailing newline first and use the file's own line ending.
   - Rewrites go to a unique temp file, keep the BOM and line endings, drop stray cells beyond the header instead of raising, and retry the final replace on a transient Windows lock.
2. **The backfill keeps concurrent changes** (B61). Before each checkpoint the script re-reads the file and applies the posters it has found to the current rows by `Movie ID`. It replaces the file only if nothing changed meanwhile, and otherwise re-reads and retries. Rows added during the run survive.
3. **The backfill stops on a bad API key and skips no-op writes** (B64). A `401` ends the run with one message after saving progress so far. A run that found no posters leaves the file untouched.
4. **`movie-search.py` never stores a partial movie** (B8). If any of the details, credits or keywords fetches fails, nothing is appended, one error is shown, and the movie can be saved later.
5. **`movie-search.py` result list behaves predictably** (B62, B63).
   - Language-filtered paging continues after the last page it scanned, instead of repeating results.
   - Next Page after an actor search reports there are no more pages, instead of running an empty title search.
   - Result details are fetched in parallel and reused on save, not fetched again.
   - Fetch failures while listing produce one dialog, not one per result.
   - The CSV is read once per save, not twice.
6. **Python tests in CI.** Stdlib `unittest` tests for `catalogue_io.py` run in CI next to `ruff`, which also lints the new module.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `catalog-persistence`:
  - The offline-tools requirement is widened beyond "never truncate" to cover unique temp files, lock retry and malformed rows.
  - New requirements make the offline tools:
    - handle files the way the server does (BOM, line endings, trailing newline);
    - keep concurrent changes;
    - never store a partial movie;
    - leave the file alone when there is nothing to change.

## Impact

- **Code:**
  - `movie-search.py` and `backfill_posters.py` are refactored onto the new `catalogue_io.py` at the repo root (an importable name; `movie-search.py` is not importable).
  - New `tests/python/test_catalogue_io.py`.
- **CI:**
  - The `ruff check` target list gains `catalogue_io.py` and the tests.
  - A new `python -m unittest discover -s tests/python` step.
- **Docs:** CLAUDE.md "Data" section, README Python section, `BUG_BACKLOG.md` (B3/B8/B9 closed, B61–B67).
- **No server, frontend or npm dependency changes.** No new Python runtime dependencies: `requests` and `python-dotenv` only, the tests use the stdlib.
