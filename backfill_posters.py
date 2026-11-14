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

from dotenv import load_dotenv

from catalogue_io import (
    CSV_PATH,
    TMDB_IMAGE_BASE,
    CatalogueChangedError,
    CatalogueError,
    get_tmdb_object,
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
    status, data = get_tmdb_object(session, api_key, f"/movie/{movie_id}")
    if status == 401:
        raise InvalidApiKeyError()
    if status == 404:
        return None, "not_found_on_tmdb (404)"
    if status is None:
        return None, "request_error (network or timeout)"
    if data is None:
        return None, f"bad_response ({status})"
    poster_path = data.get("poster_path")
    if not poster_path or not isinstance(poster_path, str):
        return None, "no_poster_on_tmdb (200, poster_path null)"
    return poster_path, None


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
    raise CatalogueChangedError(f"kept changing during {CHECKPOINT_ATTEMPTS} checkpoint attempts")


def try_checkpoint(csv_path, found, *, last=False):
    """save_checkpoint, but a file that is busy, locked, unwritable (disk full) or unreadable
    (catalogue_io.CatalogueError) only postpones the save: `found` keeps every poster, so the
    next checkpoint (or the final one) writes it. Returns rows written, or None. Errors are
    reported in one line (OSError by type only), never as a traceback. `last` marks the final
    save, after which there is no later checkpoint to retry at."""
    try:
        return save_checkpoint(csv_path, found)
    except CatalogueError as e:
        reason = f"movies.csv {e}"
    except OSError as e:
        reason = type(e).__name__
    then = "posters found since the last saved checkpoint are lost; re-run to retry" if last else "will retry at the next one"
    print(f"  checkpoint not saved ({reason}); {then}", file=sys.stderr)
    return None


def main(csv_path=CSV_PATH, fetch=fetch_poster_path, delay=REQUEST_DELAY_SECONDS):
    try:
        rows = read_catalogue(csv_path).rows
    except CatalogueError as e:
        print(f"Cannot backfill: movies.csv {e}.", file=sys.stderr)
        raise SystemExit(1)
    todo = [row for row in rows if not row.get("Poster URL")]
    print(f"{len(rows)} rows total, {len(todo)} missing a poster URL.")

    found = {}
    written = 0
    skipped = 0
    skip_reasons = Counter()
    stop = None  # (exit code, message) when the run ends early
    final = 0
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
        stop = (1, "TMDB rejected the API key (401). Check TMDB_API_KEY in .env; stopping")
    except KeyboardInterrupt:
        stop = (130, "Interrupted")
    finally:
        # Runs on every exit, an unexpected exception included (it propagates after this), so
        # posters found since the last checkpoint are saved. Re-applying `found` is idempotent:
        # rows that already have a poster are skipped, and nothing changed means no write.
        if found:
            final = try_checkpoint(csv_path, found, last=True)
            if final is not None:
                written += final

    if stop:
        print(f"{stop[1]} ({written} posters saved).", file=sys.stderr)
        raise SystemExit(stop[0])
    if found and final is None:
        raise SystemExit(1)  # try_checkpoint has said the posters are lost and to re-run
    print(f"Done. {written} posters added, {skipped} skipped.")
    if skip_reasons:
        print("Skip breakdown:")
        for reason, count in skip_reasons.most_common():
            print(f"  {count} — {reason}")


if __name__ == "__main__":
    if not api_key:
        raise SystemExit("TMDB_API_KEY not set. Create a .env file with TMDB_API_KEY=<your key>.")
    main()
