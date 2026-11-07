"""One-off script: backfill the 'Poster URL' column for rows in src/movies.csv
that predate that column (or have it blank). Reads TMDB_API_KEY from .env,
looks up each row's 'Movie ID' against TMDB, fills in the poster path.

Safe to run while the app (or movie-search.py) is writing the file: each checkpoint
re-reads the CSV and applies the posters found so far by 'Movie ID', so rows added
meanwhile are kept.

Usage: python backfill_posters.py
"""
import os
import sys
import time
from collections import Counter

import requests
from dotenv import load_dotenv

from catalogue_io import (
    CSV_PATH,
    TMDB_API_BASE,
    TMDB_IMAGE_BASE,
    CatalogueChangedError,
    make_tmdb_session,
    read_catalogue,
    rewrite_catalogue,
)

load_dotenv()
api_key = os.environ.get("TMDB_API_KEY")
session = make_tmdb_session()

CHECKPOINT_EVERY = 100
CHECKPOINT_ATTEMPTS = 3
REQUEST_DELAY_SECONDS = 0.05


class InvalidApiKeyError(Exception):
    """TMDB answered 401: every further request would fail the same way."""


def fetch_poster_path(movie_id):
    """Returns (poster_path, skip_reason). skip_reason is None on success."""
    try:
        response = session.get(
            f"{TMDB_API_BASE}/movie/{movie_id}",
            params={"api_key": api_key},
            timeout=10,
        )
        if response.status_code == 401:
            raise InvalidApiKeyError()
        if response.status_code == 404:
            return None, "not_found_on_tmdb (404)"
        response.raise_for_status()
        poster_path = response.json().get("poster_path")
        if not poster_path:
            return None, "no_poster_on_tmdb (200, poster_path null)"
        return poster_path, None
    except requests.exceptions.Timeout:
        return None, "request_timeout"
    except requests.exceptions.RequestException as e:
        return None, f"request_error ({type(e).__name__})"


def save_checkpoint(csv_path, found):
    """Apply `found` ({movie_id: poster_url}) to the file's *current* rows and rewrite it.
    Re-reads on every attempt, so rows another writer added since are kept. Returns the
    number of rows changed; writes nothing when that is 0."""
    for _ in range(CHECKPOINT_ATTEMPTS):
        cat = read_catalogue(csv_path)
        changed = 0
        for row in cat.rows:
            url = found.get(row.get("Movie ID"))
            if url and not row.get("Poster URL"):
                row["Poster URL"] = url
                changed += 1
        if not changed:
            return 0
        fieldnames = cat.fieldnames if "Poster URL" in cat.fieldnames else cat.fieldnames + ["Poster URL"]
        try:
            rewrite_catalogue(
                csv_path, fieldnames, cat.rows,
                bom=cat.bom, eol=cat.eol, expected_fingerprint=cat.fingerprint,
            )
            return changed
        except CatalogueChangedError:
            continue
    raise CatalogueChangedError(
        f"{csv_path} kept changing during {CHECKPOINT_ATTEMPTS} checkpoint attempts; nothing saved this time"
    )


def try_checkpoint(csv_path, found):
    """save_checkpoint, but a busy or locked file only postpones the save: `found` keeps every
    poster, so the next checkpoint (or the final one) writes it. Returns rows written, or None."""
    try:
        return save_checkpoint(csv_path, found)
    except (CatalogueChangedError, PermissionError) as e:
        print(f"  checkpoint not saved ({type(e).__name__}); will retry at the next one", file=sys.stderr)
        return None


def main(csv_path=CSV_PATH, fetch=fetch_poster_path, delay=REQUEST_DELAY_SECONDS):
    rows = read_catalogue(csv_path).rows
    todo = [row for row in rows if not row.get("Poster URL")]
    print(f"{len(rows)} rows total, {len(todo)} missing a poster URL.")

    found = {}
    written = 0
    skipped = 0
    skip_reasons = Counter()
    try:
        for i, row in enumerate(todo, start=1):
            movie_id = row.get("Movie ID")
            if not movie_id:
                poster_path, reason = None, "missing_movie_id"
            else:
                poster_path, reason = fetch(movie_id)

            if poster_path:
                found[movie_id] = f"{TMDB_IMAGE_BASE}{poster_path}"
            else:
                skipped += 1
                skip_reasons[reason] += 1
                print(f"  skip: {row.get('Name', '?')} (ID {movie_id}) — {reason}")
            time.sleep(delay)

            if i % CHECKPOINT_EVERY == 0 and found:
                saved = try_checkpoint(csv_path, found)
                if saved is not None:
                    written += saved
                    print(f"...{i}/{len(todo)} processed ({written} posters saved, {skipped} skipped) — checkpoint saved")
    except InvalidApiKeyError:
        if found:
            written += try_checkpoint(csv_path, found) or 0
        print(f"TMDB rejected the API key (401). Check TMDB_API_KEY in .env; stopping ({written} posters saved).",
              file=sys.stderr)
        raise SystemExit(1)

    if found:
        saved = try_checkpoint(csv_path, found)
        if saved is None:
            print(f"Could not save the last {len(found)} found posters' checkpoint; re-run to retry.", file=sys.stderr)
            raise SystemExit(1)
        written += saved
    print(f"Done. {written} posters added, {skipped} skipped.")
    if skip_reasons:
        print("Skip breakdown:")
        for reason, count in skip_reasons.most_common():
            print(f"  {count} — {reason}")


if __name__ == "__main__":
    if not api_key:
        raise SystemExit("TMDB_API_KEY not set. Create a .env file with TMDB_API_KEY=<your key>.")
    main()
