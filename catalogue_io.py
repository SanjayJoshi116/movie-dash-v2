"""Shared catalogue I/O for the offline Python tools (movie-search.py, backfill_posters.py).

Mirrors the server's rules for src/movies.csv (openspec catalog-persistence):
- read with utf-8-sig, so an Excel BOM never ends up inside the first column name;
- read header names like the server (server/app.ts mapHeaders): trimmed, blank cells are not
  columns, and a repeated name raises DuplicateHeaderError so nothing is ever written to that file;
- keep the file's BOM and line-ending style on every append/rewrite (new files: no BOM, LF);
- append a missing trailing newline before adding a row;
- escape formula prefixes in every appended row; a new file gets the server's column order;
- rewrite through a unique temp file + os.replace, retried briefly on Windows locks;
- refuse to replace or append to a file another writer changed since it was read;
- drop stray cells beyond the header instead of raising.

Every problem with the file itself raises a CatalogueError whose message reads as a sentence
after the file name ("movies.csv " + str(e)), so callers catch CatalogueError and OSError only.
"""
import csv
import io
import os
import time
from dataclasses import dataclass, field

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "movies.csv")
TMDB_API_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
UTF8_BOM = b"\xef\xbb\xbf"
# Same characters as FORMULA_PREFIXES in src/utils/csvEscape.ts, tab and CR included (a test compares them).
FORMULA_PREFIX_CHARS = ("=", "+", "-", "@", "\t", "\r")
# Same order as CATALOGUE_COLUMNS in src/types/movie.ts (a test keeps the two in sync).
CATALOGUE_COLUMNS = (
    "Movie ID", "Name", "Language", "Runtime", "Release Year", "Genres", "Director",
    "Actors/Actresses", "Production Company", "Production Country", "Box Office Revenue",
    "Budget", "Popularity Score", "Vote Average", "Vote Count", "Poster URL", "Release Date",
)
# Backoff between attempts to replace a locked file (~1.55 s in total).
REPLACE_RETRY_DELAYS = (0.05, 0.1, 0.2, 0.4, 0.8)
# How often add_row_if_new re-reads when the file changes between its duplicate check and append.
APPEND_ATTEMPTS = 3


class CatalogueError(Exception):
    """Base for catalogue file problems. str(e) is user-facing and follows the file name."""


class CatalogueChangedError(CatalogueError):
    """The catalogue file changed on disk after it was read; re-read and try again."""


class CatalogueReadError(CatalogueError):
    """The catalogue file is not valid UTF-8 CSV. Nothing is written to it."""


class CatalogueHeaderError(CatalogueError):
    """The catalogue file has content but no readable header (e.g. it starts with a blank line).
    Nothing is written to it: the server refuses the same case, and a fresh header would replace
    the user's rows."""


class DuplicateHeaderError(CatalogueHeaderError):
    """The header names a column more than once (after trimming). The server refuses every
    write to such a file, and a rewrite here would lose one column's data, so nothing is written."""

    def __init__(self, column):
        super().__init__(f"repeats the column {column!r} in its header; remove one copy by hand")
        self.column = column


@dataclass
class Catalogue:
    fieldnames: list
    rows: list
    bom: bool = False
    eol: str = "\n"
    fingerprint: tuple | None = None
    # The header as laid out on disk: fieldnames plus None for each blank cell, in file order.
    # Appends write by position, so a blank column in the middle doesn't shift later values.
    layout: list = field(default_factory=list)


def make_tmdb_session():
    """requests session with the same retry policy for both tools (429/5xx, 3 retries)."""
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        backoff_factor=2,
    )
    session.mount("https://", HTTPAdapter(max_retries=retry_strategy))
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    return session


def get_tmdb_object(session, api_key, path, params=None):
    """GET a TMDB endpoint. Returns (status, data): status is None on a network error (retries
    exhausted, timeout); data is the JSON object, or None for a failure, a non-2xx status, a
    non-JSON body or a body that is not a non-empty object. The key goes only in params, and no
    exception text (which can hold the URL and key) leaves this function. Safe on worker threads."""
    try:
        response = session.get(f"{TMDB_API_BASE}{path}", params={**(params or {}), "api_key": api_key}, timeout=10)
    except requests.exceptions.RequestException:
        return None, None
    if not response.ok:
        return response.status_code, None
    try:
        data = response.json()
    except ValueError:
        return response.status_code, None
    return response.status_code, (data if isinstance(data, dict) and data else None)


def sanitize_csv_value(value):
    """Prevent CSV/formula injection: Excel/Sheets can execute a cell starting
    with =, +, -, @ (or a tab/CR) as a formula when the file is opened later. Same rule as
    src/utils/csvEscape.ts: leading apostrophes before the formula character count too
    ('-ism is stored as ''-ism), so the server's un-escape never drops a real apostrophe."""
    if isinstance(value, str) and value.lstrip("'").startswith(FORMULA_PREFIX_CHARS):
        return "'" + value
    return value


def file_fingerprint(path):
    """(mtime_ns, size) of the file, or None if it does not exist."""
    try:
        st = os.stat(path)
    except FileNotFoundError:
        return None
    return (st.st_mtime_ns, st.st_size)


def read_catalogue(path=CSV_PATH):
    """Read the whole catalogue. A missing file is an empty catalogue. Raises
    DuplicateHeaderError if the header repeats a column name, CatalogueReadError if the file is
    not valid UTF-8 CSV."""
    try:
        return _read_catalogue(path)
    except (UnicodeDecodeError, csv.Error) as e:
        raise CatalogueReadError(f"could not be read as UTF-8 CSV ({type(e).__name__}); fix the file by hand") from None


def _read_catalogue(path):
    fingerprint = file_fingerprint(path)
    try:
        with open(path, "rb") as f:
            raw = f.read()
    except FileNotFoundError:
        return Catalogue(fieldnames=[], rows=[])
    first_break = raw.find(b"\n")
    eol = "\r\n" if first_break > 0 and raw[first_break - 1:first_break] == b"\r" else "\n"
    text = raw.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(text, newline=""))
    # Header names as the server reads them: trimmed, and a cell blank after trimming is not a
    # column (its cells are skipped, and a rewrite drops it, as a server rewrite does).
    names = [cell.strip() or None for cell in next(reader, [])]
    seen = set()
    for name in names:
        if name is not None:
            if name in seen:
                raise DuplicateHeaderError(name)
            seen.add(name)
    columns = [(i, name) for i, name in enumerate(names) if name is not None]
    # Blank lines are skipped (as DictReader did); missing cells read as "", and cells past the
    # header are dropped (the server projects rows onto its header the same way).
    rows = [
        {name: (record[i] if i < len(record) else "") for i, name in columns}
        for record in reader if record
    ]
    return Catalogue(
        fieldnames=[name for _, name in columns],
        layout=names,
        rows=rows,
        bom=raw.startswith(UTF8_BOM),
        eol=eol,
        fingerprint=fingerprint,
    )


def _writer(file, fieldnames, eol):
    # extrasaction="ignore": a row key outside the header is dropped, as the server's header
    # projection does, instead of raising ValueError.
    return csv.DictWriter(file, fieldnames=fieldnames, lineterminator=eol, extrasaction="ignore")


def new_file_columns(row):
    """Header for a new file: the server's columns the row has, in the server's order, then the
    row's other keys in their own order."""
    known = [c for c in CATALOGUE_COLUMNS if c in row]
    return known + [k for k in row if k not in CATALOGUE_COLUMNS]


def append_row(path, cat, row):
    """Append one row using the file's header and line endings. Text values are escaped against
    formula injection here, so pass raw values (rows read from disk are already escaped and are
    never re-escaped). A missing or empty file gets new_file_columns(row), LF endings and no BOM;
    a non-empty file without a readable header raises CatalogueHeaderError and is left untouched."""
    row = {k: sanitize_csv_value(v) for k, v in row.items()}
    if not cat.fieldnames:
        if os.path.exists(path) and os.path.getsize(path) > 0:
            raise CatalogueHeaderError("has content but no readable header on its first line; fix the file by hand")
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = _writer(f, new_file_columns(row), "\n")
            writer.writeheader()
            writer.writerow(row)
        return
    needs_newline = False
    with open(path, "rb") as f:
        f.seek(0, os.SEEK_END)
        if f.tell() > 0:
            f.seek(-1, os.SEEK_END)
            needs_newline = f.read(1) != b"\n"
    with open(path, "a", newline="", encoding="utf-8") as f:
        if needs_newline:
            f.write(cat.eol)
        # By position, with an empty cell under each blank header cell (as the server does).
        cells = ["" if name is None else row.get(name, "") for name in (cat.layout or cat.fieldnames)]
        csv.writer(f, lineterminator=cat.eol).writerow(cells)


def add_row_if_new(path, row, key="Movie ID", *, fingerprint=file_fingerprint):
    """Append `row` (raw values) unless a row with the same `key` exists. New columns in `row`
    are added to the header first (existing rows get blanks). Returns True if appended.

    Right before appending it re-checks the file's fingerprint; if another writer changed the
    file since the duplicate check, it re-reads and checks again (APPEND_ATTEMPTS times, then
    CatalogueChangedError). A sub-millisecond gap between that check and the append remains: the
    server takes no file lock, so there is nothing to lock against. `fingerprint` is injectable
    for tests, like replace_with_retry's `replace`/`sleep`.
    Raises CatalogueHeaderError (incl. DuplicateHeaderError) without writing for an unusable header."""
    for _ in range(APPEND_ATTEMPTS):
        cat = read_catalogue(path)
        if any(r.get(key) == str(row[key]) for r in cat.rows):
            return False
        if cat.fieldnames:
            missing = [k for k in row if k not in cat.fieldnames]
            if missing:
                try:
                    rewrite_catalogue(
                        path, cat.fieldnames + missing, cat.rows,
                        bom=cat.bom, eol=cat.eol, expected_fingerprint=cat.fingerprint,
                    )
                except CatalogueChangedError:
                    pass
                # Either way, re-read and re-check for a duplicate: another writer may have added
                # this movie since the read above.
                continue
        if fingerprint(path) != cat.fingerprint:
            continue
        append_row(path, cat, row)
        return True
    raise CatalogueChangedError("kept changing while saving; nothing was added, try again")


def replace_with_retry(tmp_path, path, *, replace=os.replace, sleep=time.sleep):
    """os.replace, retried on PermissionError (Excel/antivirus briefly holding the file)."""
    for delay in REPLACE_RETRY_DELAYS:
        try:
            replace(tmp_path, path)
            return
        except PermissionError:
            sleep(delay)
    replace(tmp_path, path)


def rewrite_catalogue(path, fieldnames, rows, *, bom, eol, expected_fingerprint):
    """Atomically replace the catalogue: unique temp file, then os.replace. Raises
    CatalogueChangedError (leaving the file untouched) if the file's fingerprint no longer
    matches `expected_fingerprint`. That check runs after the temp file is written, right before
    the replace, so only a sub-millisecond gap remains (no cross-process lock exists to close it:
    the server doesn't take one). The temp file is removed on any failure."""
    tmp_path = f"{path}.{os.getpid()}.{time.time_ns()}.tmp"
    try:
        with open(tmp_path, "w", newline="", encoding="utf-8-sig" if bom else "utf-8") as f:
            writer = _writer(f, fieldnames, eol)
            writer.writeheader()
            writer.writerows(rows)
        if file_fingerprint(path) != expected_fingerprint:
            raise CatalogueChangedError("changed on disk while it was being rewritten; try again")
        replace_with_retry(tmp_path, path)
    except BaseException:
        try:
            os.remove(tmp_path)
        except FileNotFoundError:
            pass
        raise
