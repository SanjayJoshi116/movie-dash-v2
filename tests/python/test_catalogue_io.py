"""Unit tests for catalogue_io.py and backfill_posters.py (stdlib unittest, no network, no Tk).

Run: python -m unittest discover -s tests/python -v
Fixtures are built as bytes in code (not checked-in .csv files) so core.autocrlf can't
rewrite their line endings.
"""
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)

import backfill_posters
import catalogue_io
from catalogue_io import (
    UTF8_BOM,
    CatalogueChangedError,
    CatalogueHeaderError,
    add_row_if_new,
    read_catalogue,
    replace_with_retry,
    rewrite_catalogue,
)

BOM = UTF8_BOM


class TempCsv(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.dir.name, "movies.csv")

    def tearDown(self):
        self.dir.cleanup()

    def write(self, data: bytes):
        with open(self.path, "wb") as f:
            f.write(data)

    def read(self) -> bytes:
        with open(self.path, "rb") as f:
            return f.read()

    def leftover_tmp(self):
        return [n for n in os.listdir(self.dir.name) if n.endswith(".tmp")]


class ReadTests(TempCsv):
    def test_bom_file_reads_movie_id(self):
        self.write(BOM + b"Movie ID,Name\r\n1,Alien\r\n")
        cat = read_catalogue(self.path)
        self.assertEqual(cat.fieldnames, ["Movie ID", "Name"])
        self.assertEqual(cat.rows[0]["Movie ID"], "1")
        self.assertTrue(cat.bom)
        self.assertEqual(cat.eol, "\r\n")

    def test_missing_file_is_empty(self):
        cat = read_catalogue(self.path)
        self.assertEqual((cat.fieldnames, cat.rows, cat.fingerprint), ([], [], None))


class RewriteTests(TempCsv):
    def rewrite_same(self):
        cat = read_catalogue(self.path)
        rewrite_catalogue(self.path, cat.fieldnames, cat.rows, bom=cat.bom, eol=cat.eol,
                          expected_fingerprint=cat.fingerprint)

    def test_bom_and_crlf_kept(self):
        self.write(BOM + b"Movie ID,Name\r\n1,Alien\r\n2,Heat\r\n")
        self.rewrite_same()
        self.assertEqual(self.read(), BOM + b"Movie ID,Name\r\n1,Alien\r\n2,Heat\r\n")

    def test_lf_stays_lf(self):
        self.write(b"Movie ID,Name\n1,Alien\n")
        self.rewrite_same()
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n")

    def test_stray_cells_dropped_without_error(self):
        self.write(b"Movie ID,Name\n1,Alien,oops,more\n2,Heat\n")
        self.rewrite_same()
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n2,Heat\n")
        self.assertEqual(self.leftover_tmp(), [])

    def test_changed_file_is_not_replaced(self):
        self.write(b"Movie ID,Name\n1,Alien\n")
        cat = read_catalogue(self.path)
        with open(self.path, "ab") as f:
            f.write(b"2,Heat\n")
        with self.assertRaises(CatalogueChangedError):
            rewrite_catalogue(self.path, cat.fieldnames, cat.rows, bom=cat.bom, eol=cat.eol,
                              expected_fingerprint=cat.fingerprint)
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n2,Heat\n")
        self.assertEqual(self.leftover_tmp(), [])


class AppendTests(TempCsv):
    def test_append_without_trailing_newline(self):
        self.write(b"Movie ID,Name\n1,Alien")
        self.assertTrue(add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat"}))
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n2,Heat\n")

    def test_append_keeps_crlf(self):
        self.write(b"Movie ID,Name\r\n1,Alien")
        add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat"})
        self.assertEqual(self.read(), b"Movie ID,Name\r\n1,Alien\r\n2,Heat\r\n")

    def test_new_file_is_lf_without_bom(self):
        add_row_if_new(self.path, {"Movie ID": 1, "Name": "Alien"})
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n")

    def test_bom_duplicate_refused_and_header_unchanged(self):
        original = BOM + b"Movie ID,Name\r\n1,Alien\r\n"
        self.write(original)
        self.assertFalse(add_row_if_new(self.path, {"Movie ID": 1, "Name": "Alien", "Poster URL": "x"}))
        self.assertEqual(self.read(), original)

    def test_headerless_file_is_never_overwritten(self):
        original = b"\n1,Alien\n2,Heat\n"
        self.write(original)
        with self.assertRaises(CatalogueHeaderError):
            add_row_if_new(self.path, {"Movie ID": "3", "Name": "Up"})
        self.assertEqual(self.read(), original)

    def test_sanitize_round_trips_leading_apostrophes(self):
        self.assertEqual(catalogue_io.sanitize_csv_value("+1"), "'+1")
        self.assertEqual(catalogue_io.sanitize_csv_value("'-ism"), "''-ism")
        self.assertEqual(catalogue_io.sanitize_csv_value("it's"), "it's")
        self.assertEqual(catalogue_io.sanitize_csv_value("'plain"), "'plain")

    def test_new_column_migrates_header(self):
        self.write(BOM + b"Movie ID,Name\r\n1,Alien\r\n")
        add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat", "Poster URL": "p"})
        self.assertEqual(self.read(), BOM + b"Movie ID,Name,Poster URL\r\n1,Alien,\r\n2,Heat,p\r\n")


class ReplaceRetryTests(unittest.TestCase):
    def test_retries_once_then_succeeds(self):
        calls = []

        def flaky(src, dst):
            calls.append((src, dst))
            if len(calls) == 1:
                raise PermissionError("locked")

        replace_with_retry("a", "b", replace=flaky, sleep=lambda s: None)
        self.assertEqual(len(calls), 2)

    def test_gives_up_after_limit(self):
        calls = []

        def locked(src, dst):
            calls.append(1)
            raise PermissionError("locked")

        with self.assertRaises(PermissionError):
            replace_with_retry("a", "b", replace=locked, sleep=lambda s: None)
        self.assertEqual(len(calls), len(catalogue_io.REPLACE_RETRY_DELAYS) + 1)


class BackfillTests(TempCsv):
    def run_main(self, fetch):
        with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
            backfill_posters.main(csv_path=self.path, fetch=fetch, delay=0)

    def test_row_added_during_run_survives(self):
        self.write(b"Movie ID,Name,Poster URL\n1,Alien,\n")

        def fetch(movie_id):
            # Another writer (the app) appends while the backfill is running.
            with open(self.path, "ab") as f:
                f.write(b"2,Heat,\n")
            return "/alien.jpg", None

        self.run_main(fetch)
        self.assertEqual(
            self.read(),
            b"Movie ID,Name,Poster URL\n1,Alien,https://image.tmdb.org/t/p/w500/alien.jpg\n2,Heat,\n",
        )

    def test_invalid_key_stops_and_leaves_file(self):
        original = b"Movie ID,Name\n1,Alien\n2,Heat\n"
        self.write(original)
        calls = []

        def fetch(movie_id):
            calls.append(movie_id)
            raise backfill_posters.InvalidApiKeyError()

        with self.assertRaises(SystemExit) as ctx:
            self.run_main(fetch)
        self.assertEqual(ctx.exception.code, 1)
        self.assertEqual(calls, ["1"])
        self.assertEqual(self.read(), original)

    def test_failed_checkpoint_keeps_going_and_final_save_writes(self):
        self.write(b"Movie ID,Name,Poster URL\n1,Alien,\n2,Heat,\n")
        real = backfill_posters.save_checkpoint
        calls = []

        def flaky(csv_path, found):
            calls.append(dict(found))
            if len(calls) == 1:
                raise CatalogueChangedError("busy")
            return real(csv_path, found)

        backfill_posters.save_checkpoint = flaky
        old_every = backfill_posters.CHECKPOINT_EVERY
        backfill_posters.CHECKPOINT_EVERY = 1
        try:
            out = StringIO()
            with redirect_stdout(out), redirect_stderr(StringIO()):
                backfill_posters.main(csv_path=self.path, fetch=lambda movie_id: (f"/{movie_id}.jpg", None), delay=0)
        finally:
            backfill_posters.save_checkpoint = real
            backfill_posters.CHECKPOINT_EVERY = old_every
        self.assertIn(b"/1.jpg", self.read())
        self.assertIn(b"/2.jpg", self.read())
        self.assertIn("Done. 2 posters added", out.getvalue())

    def test_nothing_found_leaves_file_untouched(self):
        self.write(b"Movie ID,Name\n1,Alien\n")
        before = os.stat(self.path).st_mtime_ns
        self.run_main(lambda movie_id: (None, "no_poster_on_tmdb (200, poster_path null)"))
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n")
        self.assertEqual(os.stat(self.path).st_mtime_ns, before)


if __name__ == "__main__":
    unittest.main()
