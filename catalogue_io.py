"""Shared catalogue I/O for the offline Python tools (movie-search.py, backfill_posters.py).

Mirrors the server's rules for src/movies.csv (openspec catalog-persistence):
- read with utf-8-sig, so an Excel BOM never ends up inside the first column name;
- keep the file's BOM and line-ending style on every append/rewrite (new files: no BOM, LF);
- append a missing trailing newline before adding a row;
- rewrite through a unique temp file + os.replace, retried briefly on Windows locks;
- refuse to replace a file another writer changed since it was read (CatalogueChangedError);
- drop stray cells beyond the header instead of raising.
"""
import csv
import io
import os
import time
from dataclasses import dataclass

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "movies.csv")
TMDB_API_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
UTF8_BOM = b"\xef\xbb\xbf"
FORMULA_PREFIX_CHARS = ("=", "+", "-", "@")
# Backoff between attempts to replace a locked file (~1.55 s in total).
REPLACE_RETRY_DELAYS = (0.05, 0.1, 0.2, 0.4, 0.8)


class CatalogueChangedError(Exception):
    """The catalogue file changed on disk after it was read; re-read and try again."""


class CatalogueHeaderError(Exception):
    """The catalogue file has content but no readable header (e.g. it starts with a blank line).
    Nothing is written to it: the server refuses the same case, and a fresh header would replace
    the user's rows."""


@dataclass
class Catalogue:
    fieldnames: list
    rows: list
    bom: bool = False
    eol: str = "\n"
    fingerprint: tuple | None = None


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


def sanitize_csv_value(value):
    """Prevent CSV/formula injection: Excel/Sheets can execute a cell starting
    with =, +, -, or @ as a formula when the file is opened later. Same rule as
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
    """Read the whole catalogue. A missing file is an empty catalogue."""
    fingerprint = file_fingerprint(path)
    try:
        with open(path, "rb") as f:
            raw = f.read()
    except FileNotFoundError:
        return Catalogue(fieldnames=[], rows=[])
    first_break = raw.find(b"\n")
    eol = "\r\n" if first_break > 0 and raw[first_break - 1:first_break] == b"\r" else "\n"
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text, newline=""))
    rows = list(reader)
    return Catalogue(
        fieldnames=list(reader.fieldnames or []),
        rows=rows,
        bom=raw.startswith(UTF8_BOM),
        eol=eol,
        fingerprint=fingerprint,
    )


def _writer(file, fieldnames, eol):
    # extrasaction="ignore": cells beyond the header (DictReader's None key) are dropped,
    # as the server's header projection does, instead of raising ValueError.
    return csv.DictWriter(file, fieldnames=fieldnames, lineterminator=eol, extrasaction="ignore")


def append_row(path, cat, row):
    """Append one row using the file's header and line endings. A missing or empty file gets a
    header from the row's keys, LF endings and no BOM; a non-empty file without a readable header
    raises CatalogueHeaderError and is left untouched."""
    if not cat.fieldnames:
        if os.path.exists(path) and os.path.getsize(path) > 0:
            raise CatalogueHeaderError(f"{path} has content but no readable header; refusing to write")
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = _writer(f, list(row.keys()), "\n")
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
        _writer(f, cat.fieldnames, cat.eol).writerow(row)


def add_row_if_new(path, row, key="Movie ID"):
    """Append `row` unless a row with the same `key` exists. New columns in `row` are
    added to the header first (existing rows get blanks). Returns True if appended.
    Raises CatalogueChangedError if the file changed during the header migration."""
    cat = read_catalogue(path)
    if any(r.get(key) == str(row[key]) for r in cat.rows):
        return False
    if cat.fieldnames:
        missing = [k for k in row if k not in cat.fieldnames]
        if missing:
            rewrite_catalogue(
                path, cat.fieldnames + missing, cat.rows,
                bom=cat.bom, eol=cat.eol, expected_fingerprint=cat.fingerprint,
            )
            cat = read_catalogue(path)
    append_row(path, cat, row)
    return True


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
    CatalogueChangedError (leaving the file untouched) if the file's fingerprint no
    longer matches `expected_fingerprint`. The temp file is removed on any failure."""
    tmp_path = f"{path}.{os.getpid()}.{time.time_ns()}.tmp"
    try:
        with open(tmp_path, "w", newline="", encoding="utf-8-sig" if bom else "utf-8") as f:
            writer = _writer(f, fieldnames, eol)
            writer.writeheader()
            writer.writerows(rows)
        if file_fingerprint(path) != expected_fingerprint:
            raise CatalogueChangedError(f"{path} changed on disk while it was being rewritten")
        replace_with_retry(tmp_path, path)
    except BaseException:
        try:
            os.remove(tmp_path)
        except FileNotFoundError:
            pass
        raise
