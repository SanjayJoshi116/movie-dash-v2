## Why

A second `/code-review` (high) of Batch B (`git diff 6e45db5 d79ac6a`: `catalogue_io.py`, `movie-search.py`, `backfill_posters.py`, 2026-11-14) raised 8 findings. All 8 were confirmed by reading the code (B79–B86).

The most serious one is B79:
- `catalogue_io.py` claims to mirror the server's rules, but reads header names raw.
- The server trims each name, drops blank ones and rejects repeats.
- So a hand-edited `Poster URL ` (trailing space) header makes either Python tool add a second `Poster URL` column.
- The server then fails every add and delete with `DuplicateHeaderError` until the file is fixed by hand.

The same review found that B63 (no partial rows) is only half fixed (B81), and that a backfill can lose posters it already found (B82). The security review of the same diff kept 0 findings at confidence ≥ 8.

This change builds on `fix-python-csv-writers`, which is implemented but not archived. That change must be archived first.

## What Changes

1. **Headers read like the server reads them** (B79, B80).
   - Python reads trim each header name and ignore cells that are blank after trimming.
   - A header that repeats a non-blank name makes every Python write refuse, with a message, and leave the file byte-for-byte unchanged.
   - Rewrites store the trimmed names, as the server does.
   - The `Movie ID` duplicate check uses the normalized name.
2. **Saved rows use fetched details, not the list cells** (B81). Language, runtime and release year come from the TMDB details used for the save. A save after a failed listing fetch stores a complete row.
3. **Backfill keeps found posters on any stop** (B82).
   - Ctrl+C, an unexpected exception or a malformed TMDB body ends the run with a final best-effort checkpoint.
   - A failed checkpoint (disk full, unreadable file, CSV error) is reported and retried later; it no longer crashes the run.
4. **Smaller race windows** (B83). The search tool re-checks the file's fingerprint right before appending, and re-reads and re-checks for duplicates if the file changed. The fingerprint check in a rewrite moves as close to the replace as possible. The remaining sub-millisecond window is documented, not locked.
5. **Responsive search window** (B84, B85).
   - The listing and the save run their TMDB fetches on a worker thread. The Tk thread only updates the UI, through `root.after`.
   - Search and Save are disabled while a fetch is running.
   - A save fetches credits and keywords through the same pool.
   - A language-filtered scan reads at most 10 TMDB pages per view, and Next Page continues from there.
6. **One copy of the shared rules** (B86).
   - `get_tmdb_object` moves into `catalogue_io` and is used by both scripts.
   - Formula-injection escaping moves into the shared append path.
   - A new file gets the server's column order (`CATALOGUE_COLUMNS`), followed by any extra columns.

## Capabilities

### New Capabilities

### Modified Capabilities
- `catalog-persistence`: add requirements for:
  - offline tools reading headers the way the server does, and refusing to write when a column name repeats;
  - search-tool rows built only from fetched values;
  - the backfill keeping found posters when it stops early;
  - a duplicate re-check right before appending;
  - formula escaping and column order on every offline write.

## Impact

- **Code:** `catalogue_io.py`, `movie-search.py`, `backfill_posters.py`.
- **Tests:** `tests/python/test_catalogue_io.py`, plus a new `tests/python/test_backfill.py` if the backfill tests outgrow the shared file.
- **Docs:** `CLAUDE.md` (Data section) and `BUG_BACKLOG.md` (new §3f, B79–B86, row 4/5 Fix stays ◐ until this change is archived).
- **Unchanged:** no server or frontend change, and no new dependencies (stdlib `threading`/`queue` only).
