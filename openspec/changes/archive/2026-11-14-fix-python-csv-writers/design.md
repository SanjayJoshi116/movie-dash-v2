## Context

The two Python scripts write `src/movies.csv` outside the server, next to it. The server's rules for the file (`catalog-persistence` spec, `server/app.ts`) already cover:
- BOM and line-ending preservation,
- appending a trailing newline,
- a stale-file check before rename,
- lock retry,
- unique temp names.

The scripts copy none of these, and each duplicates the same session, `Retry` and temp-file code. See proposal.md (Why) for the findings. Neither script has tests, and CI only runs `ruff` on them.

## Goals / Non-Goals

**Goals:**
- One Python module owns all catalogue file I/O and the TMDB session. Both scripts use it.
- That module is unit-testable without network access or Tk.

**Non-Goals:**
- Moving the Tk app off the main thread. Tk isn't thread-safe; only network work moves to worker threads, and the UI still blocks for the duration of the fetches.
- Changing the CSV value format or the formula guard. The guard keeps parity with `src/utils/csvEscape.ts`; the tab/CR prefix idea from the security review is out of scope.
- Retrying 401s or adding rate limiting beyond the existing `Retry`.

## Decisions

### D1: `catalogue_io.py` at the repo root
Both scripts can `import catalogue_io`: Python puts the script's own directory on `sys.path`. `movie-search.py` can't be imported (hyphen), so shared code can't live there.
- Alternative: a `tools/` package. Rejected: moving the scripts breaks the documented `python movie-search.py` usage, and their `CSV_PATH` anchoring.

API sketch:
- `CSV_PATH`
- `make_tmdb_session()`
- `sanitize_csv_value(v)`
- `read_catalogue(path) -> Catalogue(fieldnames, rows, bom, eol, fingerprint)`
- `append_row(path, cat, row)`
- `rewrite_catalogue(path, fieldnames, rows, *, bom, eol, expected_fingerprint)`, which raises `CatalogueChangedError`
- `replace_with_retry(tmp, path, sleep=time.sleep)`

### D2: How the module reads and writes the file
- **Format detection.** Read the raw bytes once and decode with `utf-8-sig`. `bom = raw.startswith(b"\xef\xbb\xbf")`. `eol = "\r\n"` if the first line break is CRLF, else `"\n"`. An empty or missing file gives `(False, "\n")`, the same as the server's probe.
- **Writing.** Writers use `csv.writer(..., lineterminator=eol)` and `extrasaction="ignore"`. A BOM file is written with `encoding="utf-8-sig"`, otherwise `utf-8`.
- **Stray cells.** `DictReader` puts cells beyond the header under the `None` key. `extrasaction="ignore"` drops them, as the server's header projection does.

### D3: Fingerprint and stale check
- The fingerprint is `(st_mtime_ns, st_size)`, the same idea as the server's `mtimeMs + size`.
- `rewrite_catalogue` writes the temp file, re-stats the target, and raises `CatalogueChangedError` if the fingerprint differs. It removes its temp file on any error.
- The temp file is `f"{path}.{os.getpid()}.{time.time_ns()}.tmp"`. It matches the existing `.gitignore` pattern `src/movies.csv*.tmp`.

### D4: Backfill merges by `Movie ID`
- The script keeps `found: dict[movie_id, poster_url]`.
- At each checkpoint it re-reads the file and sets `Poster URL` on rows whose id is in `found` and whose poster is still blank. It then rewrites with the fingerprint from that read, retrying up to 3 times on `CatalogueChangedError`.
- The loop's own `todo` list stays the snapshot from the start. Movies added during the run are not backfilled in that run; the next run picks them up.
- Alternative: hold the file open or locked. Rejected: Windows locks would block the server's writes.

### D5: Lock retry
`replace_with_retry` retries `PermissionError` (Windows `EACCES`/sharing violations) about 5 times with a 50→800 ms backoff, roughly 1.5 s in total. `sleep` is injectable for tests. This mirrors the server's retry of `EPERM`/`EBUSY`/`EACCES`.

### D6: `movie-search.py` fetches
- Fetchers return `None` on failure and show no dialog. The caller decides how to report.
- Listing runs `fetch_movie_details` through a `ThreadPoolExecutor(max_workers=5)`, collects the results into `details_cache[movie_id]`, inserts rows on the main thread, and shows one dialog if any fetch failed.
- Save reuses the cached details, fetches credits and keywords, and appends only when none of them is `None`.
- The `requests.Session` is shared across worker threads. That is fine for plain GETs through one adapter, but its thread safety isn't guaranteed; the risk is accepted below.
- Alternative: sequential fetches with the dialogs suppressed. Simpler, but 20 × RTT on the main thread.

### D7: Paging state
- After a language scan, the global `current_page` is set to the last page actually scanned, so Next Page (`current_page + 1`) continues from there.
- A new `search_mode` global (`"title"` or `"actor"`) makes Next Page in actor mode show "End of Results".

### D8: Backfill 401 handling
- `fetch_poster_path` raises `InvalidApiKeyError` on 401.
- `main()` catches it, writes a checkpoint only if `found` has new posters, prints one message and exits with code 1.
- If nothing was found, the final write is skipped (`if found:`).

## Risks / Trade-offs

- [Session shared across threads] → GET-only use with a 5-worker cap; requests' own docs describe this pattern as common practice. If problems show up, fall back to one session per worker.
- [Checkpoint retry exhausted under constant external writes] → Raise with a clear message. Progress since the last checkpoint is lost, but the file is never clobbered.
- [Tests can't cover the Tk paths] → Paging and save logic stay thin over `catalogue_io`. The GUI scenarios get a manual check in tasks.
- [Mixed line endings in an already-mixed file] → The first break decides the style, as on the server.

## Migration Plan

No data migration. Both scripts keep their CLI usage. Roll back by reverting the commit; `catalogue_io.py` is new and nothing else imports it.
