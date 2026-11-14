## Context

`catalogue_io.py` (from `fix-python-csv-writers`) owns all Python catalogue I/O, but it still parses the header with `csv.DictReader`, which keeps raw names and lets a repeated name overwrite the earlier key. The server (`server/app.ts` `loadCatalogue`) trims names (`mapHeaders` → `trim() || null`), skips blank ones and raises `DuplicateHeaderError` on a repeat. In `movie-search.py`, the Tk main thread blocks on `ThreadPoolExecutor` inside `with`, and save builds rows partly from Treeview cells. See proposal.md (Why) for the findings.

## Goals / Non-Goals

**Goals:** Python and server agree on which columns exist; no write can make the file unloadable for the server; no found poster is lost to an early stop; the GUI never blocks on network.

**Non-Goals:** cross-process file locking (the server doesn't take one, so a Python-only lock buys nothing); rewriting the Tk UI; changing server behaviour; moving `movie-search.py`'s per-field TMDB mapping into the shared module.

## Decisions

1. **Parse the header with `csv.reader`, build dicts ourselves** (B79, B80). `read_catalogue` reads the first record with `csv.reader`, maps each cell to `cell.strip() or None`, and raises `CatalogueHeaderError` (subclass `DuplicateHeaderError`, carrying the name) on a repeated non-`None` name. Rows are built by zipping the record with the header, skipping `None` columns and cells beyond the header. `Catalogue.fieldnames` holds the trimmed, non-blank names, so rewrites store them trimmed and drop blank columns, matching the server's rewrite. *Alternative:* keep `DictReader` and post-process `fieldnames` — rejected, because by then a repeated key has already lost its first column's data.
   - The duplicate error is raised at read time, so every write path (`add_row_if_new`, `save_checkpoint`) refuses before touching the file, and `backfill_posters.main` refuses at start-up rather than after hundreds of requests.

2. **Build the save row from `details` only** (B81). `Language` ← `details["original_language"]`, `Runtime` ← `details["runtime"]`, `Release Year` ← `release_date[:4]`, `Name` ← `details["title"]`. The Treeview only supplies the movie ID. This also removes a dependency on Treeview keeping strings as strings.

3. **Backfill: `try/finally` final checkpoint** (B82). `main()` wraps the loop in `try: … except KeyboardInterrupt: exit 130 … finally: if found-not-yet-written: try_checkpoint`. `try_checkpoint` catches `CatalogueChangedError`, `OSError`, `UnicodeDecodeError`, `csv.Error` and `CatalogueHeaderError`. A broken header is checked at start-up (exit 1, nothing fetched); if the file is broken by hand mid-run, the save is postponed like any other failed checkpoint, so the run never ends in a traceback. `fetch_poster_path` uses the shared `get_tmdb_object`-style helper that returns `None` for a non-object body; 401 still raises `InvalidApiKeyError` (the shared helper takes an `on_status` hook or returns the status, so 401/404 stay distinguishable).

4. **Fingerprint re-check before append** (B83). `add_row_if_new` loops up to 3 times: read → duplicate check → (header migration) → `file_fingerprint(path) == cat.fingerprint` → append; on mismatch re-read. `rewrite_catalogue` already checks just before `replace_with_retry`; it stays there, and the docstring names the residual window. *Alternative:* `msvcrt.locking`/`fcntl` — rejected: the server and Excel don't honour it.

5. **Worker thread + `root.after` polling** (B84). One helper `run_in_background(work, on_done)` starts a daemon `threading.Thread` running `work()` (network only, no Tk), puts the result on a `queue.Queue`, and the Tk side polls with `root.after(50, …)`, then calls `on_done(result)` on the main thread. Listing passes `fetch_details_for`; save passes a function fetching details/credits/keywords for all selected IDs through the pool. Search/Save/Next buttons are `state="disabled"` until `on_done`. Dialogs stay on the main thread. *Alternative:* `asyncio` + `aiohttp` — rejected: new dependency for a small tool.
   - The language scan (B85) runs inside that worker too, capped at `MAX_PAGES_PER_SCAN = 10`; `search_movie` returns `None` on failure instead of showing a dialog, and `on_done` shows one.

6. **Shared helpers in `catalogue_io`** (B86). Move `get_tmdb_object(session, api_key, path, params)` (returns `(status, data)`), `CATALOGUE_COLUMNS` (copied from `src/types/movie.ts`, with a comment pointing to it — there is no shared source across Python/TS), and escaping into `append_row` (applies `sanitize_csv_value` to the new row's values; rewrites never re-escape rows read from disk, which are already escaped). New-file header = `CATALOGUE_COLUMNS` present in the row + the row's other keys in their order.

## Risks / Trade-offs

- [Duplicate-header refusal blocks the tools until the file is fixed by hand] → same as the server; the message names the column and the line to fix.
- [Python `CATALOGUE_COLUMNS` copy can drift from TS] → a unit test reads `src/types/movie.ts` and asserts the Python list matches the array literal.
- [Background thread + Tk misuse] → workers never touch Tk; all UI in `on_done` via `after`; a test of `run_in_background` with a fake `after`.
- [Residual race between fingerprint check and append/replace] → documented; sub-millisecond, no cross-process lock exists to close it.
- [Trimming header names on rewrite changes bytes of a hand-edited file] → intended, matches the server's next delete rewrite.

## Migration Plan

Archive `fix-python-csv-writers` first (its manual check 3.5 can be done together with this change's manual check), then apply this change. No data migration: the first Python rewrite trims the header, as a server delete already would. Rollback = revert the commit.
