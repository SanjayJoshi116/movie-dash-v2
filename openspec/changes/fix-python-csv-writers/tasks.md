## 1. Shared module `catalogue_io.py` (B3, B9, B65, B66, B67)

- [x] 1.1 Create `catalogue_io.py` (repo root): `CSV_PATH`, `make_tmdb_session()` (Retry total=3, 429/5xx, backoff 2, https adapter, User-Agent header), `sanitize_csv_value` (moved from `movie-search.py`, same prefixes as `src/utils/csvEscape.ts`)
- [x] 1.2 `read_catalogue(path)`: raw bytes → `utf-8-sig` decode, detect `bom` and `eol` (first break; empty/missing → no BOM, LF), `DictReader` rows, `(st_mtime_ns, st_size)` fingerprint; missing file → empty catalogue with `fingerprint=None`
- [x] 1.3 `append_row(path, cat, row)`: new/empty file → header from row keys, LF, no BOM; existing file → add `cat.eol` first if the last byte isn't `\n`; write with `cat.eol`, `extrasaction="ignore"`, no BOM added mid-file
- [x] 1.4 `rewrite_catalogue(path, fieldnames, rows, *, bom, eol, expected_fingerprint)`: unique temp `f"{path}.{pid}.{time_ns}.tmp"`, `extrasaction="ignore"`, BOM kept, re-stat before replace → `CatalogueChangedError` on mismatch, temp removed on any error
- [x] 1.5 `replace_with_retry(tmp, path, sleep=time.sleep)`: retry `PermissionError` ~5 times, 50→800 ms backoff
- [x] 1.6 `tests/python/test_catalogue_io.py` (stdlib `unittest`, temp dirs, bytes-level fixtures): BOM read gives `Movie ID`; BOM + CRLF kept on rewrite; LF stays LF; append to a file without trailing newline; new file is LF without BOM; stray-cell row rewrites without error and leaves no `.tmp`; changed fingerprint raises `CatalogueChangedError` and leaves the file untouched; `replace_with_retry` succeeds after one `PermissionError` (injected `os.replace` + no-op sleep) and re-raises after the limit

## 2. `backfill_posters.py` (B3, B61, B64)

- [x] 2.1 Use `catalogue_io` for the session, the read and the rewrite; delete the local `write_csv`/session code
- [x] 2.2 Keep `found: {movie_id: poster_url}`; checkpoint = re-read, apply `found` to blank-poster rows by `Movie ID`, `rewrite_catalogue` with that read's fingerprint, retry up to 3× on `CatalogueChangedError`
- [x] 2.3 Raise `InvalidApiKeyError` on `401`; `main()` saves a checkpoint if `found` is non-empty, prints one message naming `TMDB_API_KEY`, exits 1
- [x] 2.4 Skip the final write when `found` is empty (file bytes and mtime unchanged)
- [x] 2.5 Tests (patch `fetch_poster_path`, no network): a row appended to the file between start and checkpoint survives; a 401 on the first request leaves the file unchanged; a run with no posters leaves the mtime unchanged

## 3. `movie-search.py` (B3, B8, B9, B62, B63)

- [x] 3.1 Use `catalogue_io` for the session, `CSV_PATH`, `sanitize_csv_value`, the read, the header migration (`rewrite_catalogue`) and the append (`append_row`); one `read_catalogue` per save does both the duplicate check and the header
- [x] 3.2 Fetchers return `None` on failure with no dialog; save shows one error and appends nothing if details, credits or keywords is `None`
- [x] 3.3 Listing: fetch details for all results through `ThreadPoolExecutor(max_workers=5)`, store `details_cache`, insert rows on the main thread, one dialog if any failed; save reuses `details_cache`
- [x] 3.4 Paging: language scan sets `current_page` to the last page scanned; `search_mode` global, Next Page in actor mode → "End of Results"; reset `current_page`/`total_pages` on actor search
- [ ] 3.5 Manual check (needs `TMDB_API_KEY`; point `CSV_PATH` at a scratch copy, not the real `src/movies.csv`): BOM file duplicate refused; save appends one row; language Next Page shows new titles; actor Next Page says end; network off → one dialog

## 4. CI and docs

- [x] 4.1 `.github/workflows/ci.yml`: `ruff check movie-search.py backfill_posters.py catalogue_io.py tests/python`; add `python -m unittest discover -s tests/python -v` step; update the `requirements-dev.txt` comment
- [x] 4.2 CLAUDE.md "Data" + "CI" sections: `catalogue_io.py` owns Python catalogue I/O (utf-8-sig, format kept, unique temp, stale check, lock retry); backfill merges by `Movie ID`; Python tests location
- [x] 4.3 README Python section: mention the shared module and that the backfill is safe to run while the app is open
- [x] 4.4 `BUG_BACKLOG.md`: mark B3 (Python half), B8, B9, B61–B67 fixed by `fix-python-csv-writers`

## 5. Verify

- [x] 5.1 `ruff check` (CI target list) clean; `python -m unittest discover -s tests/python` green
- [x] 5.2 `npm run test:server` still green (no server change expected)
- [x] 5.3 `openspec validate fix-python-csv-writers --strict`
