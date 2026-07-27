"""One-off script: backfill the 'Poster URL' column for rows in src/movies.csv
that predate that column (or have it blank). Reads TMDB_API_KEY from .env,
looks up each row's 'Movie ID' against TMDB, fills in the poster path.

Usage: python backfill_posters.py
"""
import os
import csv
import time
import requests
from collections import Counter
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv()
api_key = os.environ.get("TMDB_API_KEY")
if not api_key:
    raise SystemExit("TMDB_API_KEY not set. Create a .env file with TMDB_API_KEY=<your key>.")

session = requests.Session()
retry_strategy = Retry(
    total=3,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET"],
    backoff_factor=2
)
session.mount("https://", HTTPAdapter(max_retries=retry_strategy))
headers = {"User-Agent": "Mozilla/5.0"}

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "movies.csv")
CHECKPOINT_EVERY = 100
REQUEST_DELAY_SECONDS = 0.05


def fetch_poster_path(movie_id):
    """Returns (poster_path, skip_reason). skip_reason is None on success."""
    try:
        response = session.get(
            f"https://api.themoviedb.org/3/movie/{movie_id}",
            params={"api_key": api_key},
            headers=headers, timeout=10
        )
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


def write_csv(fieldnames, rows):
    with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    with open(CSV_PATH, mode="r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    if "Poster URL" not in fieldnames:
        fieldnames.append("Poster URL")
        for row in rows:
            row["Poster URL"] = ""

    todo = [row for row in rows if not row.get("Poster URL")]
    print(f"{len(rows)} rows total, {len(todo)} missing a poster URL.")

    updated = 0
    skipped = 0
    skip_reasons = Counter()
    for i, row in enumerate(todo, start=1):
        movie_id = row.get("Movie ID")
        if not movie_id:
            poster_path, reason = None, "missing_movie_id"
        else:
            poster_path, reason = fetch_poster_path(movie_id)

        if poster_path:
            row["Poster URL"] = f"{TMDB_IMAGE_BASE}{poster_path}"
            updated += 1
        else:
            skipped += 1
            skip_reasons[reason] += 1
            print(f"  skip: {row.get('Name', '?')} (ID {movie_id}) — {reason}")
        time.sleep(REQUEST_DELAY_SECONDS)

        if i % CHECKPOINT_EVERY == 0:
            write_csv(fieldnames, rows)
            print(f"...{i}/{len(todo)} processed ({updated} updated, {skipped} skipped) — checkpoint saved")

    write_csv(fieldnames, rows)
    print(f"Done. {updated} posters added, {skipped} skipped.")
    if skip_reasons:
        print("Skip breakdown:")
        for reason, count in skip_reasons.most_common():
            print(f"  {count} — {reason}")


if __name__ == "__main__":
    main()
