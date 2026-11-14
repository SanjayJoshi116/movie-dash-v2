## 0. Prerequisite

- [x] 0.1 Archive `fix-python-csv-writers` (done 2026-11-14, manual check 3.5 passed)

## 1. Header parsing in `catalogue_io.py` (B79, B80)

- [x] 1.1 `read_catalogue`: parse the first record with `csv.reader`, names = `cell.strip() or None`; raise `DuplicateHeaderError(CatalogueHeaderError)` naming the column on a repeated non-`None` name; build rows by zipping, skipping `None` columns and cells past the header; `fieldnames` = trimmed non-blank names
- [x] 1.2 Tests: `Poster URL ` header → one trimmed column after rewrite; `Movie ID ` header → duplicate detected; `Name` twice → `DuplicateHeaderError`, file bytes unchanged for both `add_row_if_new` and `rewrite_catalogue` callers; trailing `,,` header → loads, rewrite drops blank columns; BOM + trimmed header still gives `Movie ID`

## 2. Shared helpers in `catalogue_io.py` (B83, B86)

- [x] 2.1 Move `get_tmdb_object` in (takes `session`, returns `(status, data)`; `data` is `None` on network error, non-JSON or non-object body)
- [x] 2.2 Add `CATALOGUE_COLUMNS` (same order as `src/types/movie.ts`) + test that parses the TS array literal and compares
- [x] 2.3 `append_row` escapes the new row's text values with `sanitize_csv_value`; a new file's header = `CATALOGUE_COLUMNS` present in the row, then the row's other keys
- [x] 2.4 `add_row_if_new`: re-check `file_fingerprint` right before appending; on change re-read and repeat the duplicate check (3 attempts, then `CatalogueChangedError`)
- [x] 2.5 Tests: `=Title` stored as `'=Title`; new file column order; fingerprint changed between check and append (inject via a hook) with the same ID now present → returns duplicate, one row

## 3. `backfill_posters.py` (B82, B86)

- [x] 3.1 `fetch_poster_path` uses `get_tmdb_object`; 401 → `InvalidApiKeyError`, 404 → not found, non-object body → skip reason
- [x] 3.2 `try_checkpoint` also catches `OSError`, `UnicodeDecodeError`, `csv.Error`; header errors postpone too; `DuplicateHeaderError` is checked at start-up (exit 1 with the column name)
- [x] 3.3 `main()`: `finally` makes a best-effort checkpoint of unsaved `found`; `KeyboardInterrupt` → exit 130 after it
- [x] 3.4 Tests: interrupt (fetch stub raises `KeyboardInterrupt`) after N posters → posters stored; non-object body → skipped, run continues; first checkpoint `OSError` (fsHooks-style injection), next succeeds → all posters stored

## 4. `movie-search.py` (B81, B84, B85, B86)

- [x] 4.1 Save row: `Name`/`Language`/`Runtime`/`Release Year` from `details`; Treeview supplies only the ID
- [x] 4.2 Use `catalogue_io.get_tmdb_object`; drop the local copy and the local `sanitize_csv_value` call in `append_to_csv`
- [x] 4.3 `run_in_background(work, on_done)`: daemon thread + `queue.Queue` + `root.after(50)` poll; disable Search/Save/Next while running
- [x] 4.4 Listing: search pages + `fetch_details_for` run in the worker; tree built in `on_done`; one dialog for failures
- [x] 4.5 Save: details/credits/keywords for all selected IDs fetched in the worker through the pool; append + `report_save` in `on_done`
- [x] 4.6 Language scan capped at `MAX_PAGES_PER_SCAN = 10`; `current_page` = last page read; `search_movie` returns `None` instead of showing a dialog
- [x] 4.7 Show `DuplicateHeaderError` as its own "Not saved" message naming the column

## 5. Docs

- [x] 5.1 `CLAUDE.md` Data: `catalogue_io` header rules (trim, blank skipped, repeat → refuse), escaping in `append_row`, `CATALOGUE_COLUMNS` copy + its test, GUI fetches on a worker thread
- [x] 5.2 `BUG_BACKLOG.md`: mark §3f B79–B86 fixed (✅), Batch B and rows 4, 5 Fix → ☑ once archived

## 6. Verify

- [x] 6.1 `ruff check movie-search.py backfill_posters.py catalogue_io.py tests/python` clean
- [x] 6.2 `python -m unittest discover -s tests/python` green
- [x] 6.3 `npm run test:server` green (no server change expected); `openspec validate harden-python-catalogue-io --strict`
- [x] 6.4 Manual GUI check (needs `TMDB_API_KEY`; `CSV_PATH` on a scratch copy): window repaints during a slow listing; Search/Save disabled while fetching; save after a failed listing fetch stores language/runtime/year; `Name`-twice header → one "Not saved" message, file unchanged; rare language on a broad query stops at 10 pages. Done 2026-11-14 by driving the real Tk handlers (event loop pumped) against TMDB on a scratch BOM copy, 12/12 pass incl. the 3.5 regressions; `src/movies.csv` hash unchanged
