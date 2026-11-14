"""Unit tests for catalogue_io.py and backfill_posters.py (stdlib unittest, no network, no Tk).

Run: python -m unittest discover -s tests/python -v
Fixtures are built as bytes in code (not checked-in .csv files) so core.autocrlf can't
rewrite their line endings.
"""
import os
import re
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)

import backfill_posters
import catalogue_io
from catalogue_io import (
    UTF8_BOM,
    CatalogueChangedError,
    CatalogueHeaderError,
    CatalogueReadError,
    DuplicateHeaderError,
    add_row_if_new,
    read_catalogue,
    replace_with_retry,
    rewrite_catalogue,
)

BOM = UTF8_BOM


def fake_session(body, status=200):
    """A requests-like session whose every GET answers `status` with JSON `body`."""
    response = mock.Mock(ok=200 <= status < 300, status_code=status)
    response.json.return_value = body
    return mock.Mock(**{"get.return_value": response})


def poster_for(movie_id):
    return f"/{movie_id}.jpg", None


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

    def run_backfill(self, fetch=poster_for):
        """backfill_posters.main on this file, output captured; returns stdout."""
        out = StringIO()
        with redirect_stdout(out), redirect_stderr(StringIO()):
            backfill_posters.main(csv_path=self.path, fetch=fetch, delay=0)
        return out.getvalue()


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
    def test_row_added_during_run_survives(self):
        self.write(b"Movie ID,Name,Poster URL\n1,Alien,\n")

        def fetch(movie_id):
            # Another writer (the app) appends while the backfill is running.
            with open(self.path, "ab") as f:
                f.write(b"2,Heat,\n")
            return "/alien.jpg", None

        self.run_backfill(fetch)
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
            self.run_backfill(fetch)
        self.assertEqual(ctx.exception.code, 1)
        self.assertEqual(calls, ["1"])
        self.assertEqual(self.read(), original)

    def test_failed_checkpoint_postpones_save(self):
        """A busy file or a write error (disk full) at one checkpoint: the run goes on and a later
        checkpoint writes every poster."""
        real = backfill_posters.save_checkpoint
        for error in (CatalogueChangedError("busy"), OSError(28, "No space left on device")):
            with self.subTest(error=type(error).__name__):
                self.write(b"Movie ID,Name,Poster URL\n1,Alien,\n2,Heat,\n")
                calls = []

                def flaky(csv_path, found, error=error, calls=calls):
                    calls.append(1)
                    if len(calls) == 1:
                        raise error
                    return real(csv_path, found)

                with mock.patch.object(backfill_posters, "save_checkpoint", flaky), \
                        mock.patch.object(backfill_posters, "CHECKPOINT_EVERY", 1):
                    out = self.run_backfill()
                self.assertIn(b"/1.jpg", self.read())
                self.assertIn(b"/2.jpg", self.read())
                self.assertIn("Done. 2 posters added", out)

    def test_nothing_found_leaves_file_untouched(self):
        self.write(b"Movie ID,Name\n1,Alien\n")
        before = os.stat(self.path).st_mtime_ns
        self.run_backfill(lambda movie_id: (None, "no_poster_on_tmdb (200, poster_path null)"))
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n")
        self.assertEqual(os.stat(self.path).st_mtime_ns, before)

    def test_interrupt_saves_found_posters(self):
        self.write(b"Movie ID,Name,Poster URL\n1,Alien,\n2,Heat,\n3,Up,\n")

        def fetch(movie_id):
            if movie_id == "3":
                raise KeyboardInterrupt
            return poster_for(movie_id)

        with self.assertRaises(SystemExit) as ctx:
            self.run_backfill(fetch)
        self.assertEqual(ctx.exception.code, 130)
        self.assertEqual(self.read(), b"Movie ID,Name,Poster URL\n"
                         b"1,Alien,https://image.tmdb.org/t/p/w500/1.jpg\n"
                         b"2,Heat,https://image.tmdb.org/t/p/w500/2.jpg\n3,Up,\n")

    def test_failed_final_save_says_posters_are_lost(self):
        self.write(b"Movie ID,Name,Poster URL\n1,Alien,\n2,Heat,\n")

        def fetch(movie_id):
            if movie_id == "2":
                raise KeyboardInterrupt
            return poster_for(movie_id)

        def locked(csv_path, found):
            raise PermissionError(13, "locked")

        err = StringIO()
        with mock.patch.object(backfill_posters, "save_checkpoint", locked), \
                self.assertRaises(SystemExit) as ctx, redirect_stdout(StringIO()), redirect_stderr(err):
            backfill_posters.main(csv_path=self.path, fetch=fetch, delay=0)
        self.assertEqual(ctx.exception.code, 130)
        self.assertIn("lost; re-run to retry", err.getvalue())
        self.assertNotIn("will retry at the next one", err.getvalue())

    def test_unexpected_error_saves_then_propagates(self):
        self.write(b"Movie ID,Name,Poster URL\n1,Alien,\n2,Heat,\n")

        def fetch(movie_id):
            if movie_id == "2":
                raise AttributeError("boom")
            return poster_for(movie_id)

        with self.assertRaises(AttributeError):
            self.run_backfill(fetch)
        self.assertIn(b"/1.jpg", self.read())

    def test_non_object_body_is_skipped(self):
        with mock.patch.object(backfill_posters, "session", fake_session([])):
            self.assertEqual(backfill_posters.fetch_poster_path("1"), (None, "bad_response (200)"))


class HeaderTests(TempCsv):
    """Header names are read like the server reads them (server/app.ts mapHeaders)."""

    def test_trailing_space_column_is_not_duplicated(self):
        self.write(b"Movie ID,Name,Poster URL \n1,Alien,\n")
        self.run_backfill(lambda movie_id: ("/a.jpg", None))
        self.assertEqual(self.read(), b"Movie ID,Name,Poster URL\n1,Alien,https://image.tmdb.org/t/p/w500/a.jpg\n")

    def test_trailing_space_movie_id_still_detects_duplicate(self):
        original = b"Movie ID ,Name\n1,Alien\n"
        self.write(original)
        self.assertFalse(add_row_if_new(self.path, {"Movie ID": 1, "Name": "Alien"}))
        self.assertEqual(self.read(), original)

    def test_repeated_column_refuses_every_write(self):
        original = b"Movie ID,Name,Name\n1,Alien,Other\n"
        self.write(original)
        with self.assertRaises(DuplicateHeaderError) as ctx:
            add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat"})
        self.assertEqual(ctx.exception.column, "Name")
        with self.assertRaises(SystemExit) as stop:
            self.run_backfill()
        self.assertEqual(stop.exception.code, 1)
        self.assertEqual(self.read(), original)
        self.assertEqual(self.leftover_tmp(), [])

    def test_repeated_column_after_trimming(self):
        self.write(b"Movie ID,Name, Name\n1,Alien,x\n")
        with self.assertRaises(DuplicateHeaderError):
            read_catalogue(self.path)

    def test_trailing_blank_header_cells(self):
        self.write(b"Movie ID,Name,,\n1,Alien,,\n")
        cat = read_catalogue(self.path)
        self.assertEqual(cat.fieldnames, ["Movie ID", "Name"])
        self.assertTrue(add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat"}))
        self.assertEqual(self.read(), b"Movie ID,Name,,\n1,Alien,,\n2,Heat,,\n")
        cat = read_catalogue(self.path)
        rewrite_catalogue(self.path, cat.fieldnames, cat.rows, bom=cat.bom, eol=cat.eol,
                          expected_fingerprint=cat.fingerprint)
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n2,Heat\n")

    def test_blank_header_cell_in_the_middle_keeps_columns(self):
        self.write(b"Movie ID,,Name,Poster URL\n1,,Alien,a\n")
        self.assertTrue(add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat", "Poster URL": "h"}))
        self.assertEqual(self.read(), b"Movie ID,,Name,Poster URL\n1,,Alien,a\n2,,Heat,h\n")
        self.assertEqual(read_catalogue(self.path).rows[1], {"Movie ID": "2", "Name": "Heat", "Poster URL": "h"})

    def test_bom_and_trimmed_header(self):
        self.write(BOM + b" Movie ID ,Name\r\n1,Alien\r\n")
        cat = read_catalogue(self.path)
        self.assertEqual(cat.fieldnames, ["Movie ID", "Name"])
        self.assertEqual(cat.rows[0]["Movie ID"], "1")

    def test_non_utf8_file_is_a_read_error(self):
        original = b"Movie ID,Name\n1,Am\xe9lie\n"
        self.write(original)
        with self.assertRaises(CatalogueReadError):
            add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat"})
        self.assertEqual(self.read(), original)


class SharedRulesTests(TempCsv):
    def test_columns_match_typescript(self):
        with open(os.path.join(ROOT, "src", "types", "movie.ts"), encoding="utf-8") as f:
            ts = f.read()
        body = re.search(r"CATALOGUE_COLUMNS[^=]*=\s*\[(.*?)\]", ts, re.DOTALL).group(1)
        self.assertEqual(tuple(re.findall(r"'([^']+)'", body)), catalogue_io.CATALOGUE_COLUMNS)

    def test_append_escapes_formulas_once(self):
        self.write(b"Movie ID,Name\n1,'=Old\n")
        add_row_if_new(self.path, {"Movie ID": "2", "Name": "=Title"})
        self.assertEqual(self.read(), b"Movie ID,Name\n1,'=Old\n2,'=Title\n")

    def test_new_file_uses_server_column_order(self):
        add_row_if_new(self.path, {"Keywords/Tags": "k", "Release Date": "2000-01-01", "Name": "Up", "Movie ID": "1"})
        self.assertEqual(self.read().split(b"\n")[0], b"Movie ID,Name,Release Date,Keywords/Tags")

    def test_duplicate_added_between_check_and_append(self):
        self.write(b"Movie ID,Name\n1,Alien\n")
        calls = []

        def app_adds_same_movie_first(path):
            if not calls:
                with open(path, "ab") as f:
                    f.write(b"2,Heat\n")
            calls.append(1)
            return catalogue_io.file_fingerprint(path)

        self.assertFalse(add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat"},
                                        fingerprint=app_adds_same_movie_first))
        self.assertEqual(self.read(), b"Movie ID,Name\n1,Alien\n2,Heat\n")

    def test_duplicate_added_right_after_header_migration(self):
        self.write(b"Movie ID,Name\n1,Alien\n")
        real = catalogue_io.rewrite_catalogue

        def rewrite_then_app_adds_same_movie(*args, **kwargs):
            real(*args, **kwargs)
            with open(self.path, "ab") as f:
                f.write(b"2,Heat,\n")

        with mock.patch.object(catalogue_io, "rewrite_catalogue", rewrite_then_app_adds_same_movie):
            self.assertFalse(add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat", "Poster URL": "p"}))
        self.assertEqual(self.read(), b"Movie ID,Name,Poster URL\n1,Alien,\n2,Heat,\n")

    def test_file_that_keeps_changing_raises(self):
        self.write(b"Movie ID,Name\n1,Alien\n")
        n = iter(range(100, 200))

        def always_changes(path):
            with open(path, "ab") as f:
                f.write(f"{next(n)},X\n".encode())
            return catalogue_io.file_fingerprint(path)

        with self.assertRaises(CatalogueChangedError):
            add_row_if_new(self.path, {"Movie ID": "2", "Name": "Heat"}, fingerprint=always_changes)
        self.assertNotIn(b"Heat", self.read())

    def test_get_tmdb_object_non_object_body(self):
        session = fake_session(["not", "an", "object"])
        self.assertEqual(catalogue_io.get_tmdb_object(session, "k", "/movie/1"), (200, None))


if __name__ == "__main__":
    unittest.main()
