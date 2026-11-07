import csv
import os
import tkinter as tk
from concurrent.futures import ThreadPoolExecutor
from tkinter import messagebox, ttk

import requests
from dotenv import load_dotenv

from catalogue_io import (
    CSV_PATH,
    TMDB_API_BASE,
    TMDB_IMAGE_BASE,
    CatalogueChangedError,
    CatalogueHeaderError,
    add_row_if_new,
    make_tmdb_session,
    sanitize_csv_value,
)

# TMDB API key — set TMDB_API_KEY in a local .env file (gitignored), never hardcode it here
load_dotenv()
api_key = os.environ.get("TMDB_API_KEY")
if not api_key:
    raise SystemExit("TMDB_API_KEY not set. Create a .env file with TMDB_API_KEY=<your key>.")

# Shared session: retries 429/5xx, sets the User-Agent (catalogue_io.make_tmdb_session)
session = make_tmdb_session()

DETAIL_FETCH_WORKERS = 5

# Global variables for pagination
current_page = 1
total_pages = 1
fetched_movies = []
last_query = ""
details_cache = {}  # str(movie id) -> TMDB details, filled while listing, reused on save

LANGUAGES = [
    ("All", "All"),
    ("en", "English"),
    ("hi", "Hindi"),
    ("ta", "Tamil"),
    ("te", "Telugu"),
    ("ml", "Malayalam"),
    ("kn", "Kannada"),
    ("fr", "French"),
    ("es", "Spanish"),
    ("de", "German"),
    ("ja", "Japanese"),
    ("ko", "Korean"),
    ("zh", "Chinese"),
    ("pt", "Portuguese"),
    ("it", "Italian"),
]
LANG_CODE_MAP = {display: code for code, display in LANGUAGES}
LANG_DISPLAY = [display for _, display in LANGUAGES]

# Function to fetch movie details from TMDB API
def search_movie(api_key, movie_name, page=1):
    data = get_tmdb_object(api_key, "/search/movie", {"query": movie_name, "page": page})
    if data is None:
        messagebox.showerror("Connection Error", "Failed to fetch data from TMDB. Check your connection and try again.")
        return {"results": [], "total_pages": 1}
    return data

def field(data, key):
    """Missing or null TMDB fields are stored as empty strings, never a placeholder like
    "N/A" — matches the in-app import, so analytics don't see a fake "N/A" director/year."""
    value = data.get(key)
    return "" if value is None else value


# get_tmdb_object and the per-movie fetchers return None on any failure and show no dialog: they
# may run on worker threads (Tk isn't thread-safe), and the caller reports failures once.
def get_tmdb_object(api_key, path, params=None):
    """GET a TMDB endpoint; the JSON object on success, None on any failure or non-object body."""
    try:
        response = session.get(f"{TMDB_API_BASE}{path}", params={**(params or {}), "api_key": api_key}, timeout=10)
        response.raise_for_status()
        data = response.json()
    except (requests.exceptions.RequestException, ValueError):
        return None
    return data if isinstance(data, dict) and data else None


def fetch_movie_details(api_key, movie_id):
    return get_tmdb_object(api_key, f"/movie/{movie_id}")


def fetch_movie_credits(api_key, movie_id):
    return get_tmdb_object(api_key, f"/movie/{movie_id}/credits")


def fetch_movie_keywords(api_key, movie_id):
    data = get_tmdb_object(api_key, f"/movie/{movie_id}/keywords")
    return None if data is None else data.get("keywords") or []

def append_to_csv(movie_details):
    """Returns "added", "duplicate" or "error" (an error dialog has been shown)."""
    movie_details = {k: sanitize_csv_value(v) for k, v in movie_details.items()}
    try:
        added = add_row_if_new(CSV_PATH, movie_details)
    except CatalogueChangedError:
        messagebox.showerror("Not saved", "movies.csv changed while saving. Try again.")
        return "error"
    except (CatalogueHeaderError, UnicodeDecodeError, csv.Error):
        messagebox.showerror(
            "Not saved",
            "movies.csv could not be read (no header on the first line, or not saved as UTF-8). "
            "Fix the file, then try again.",
        )
        return "error"
    except OSError:
        messagebox.showerror("Not saved", "Could not write movies.csv (is it open in another program?). Try again.")
        return "error"
    return "added" if added else "duplicate"


def fetch_details_for(movies):
    """Details for every listed movie: cached ones reused, the rest fetched in parallel (network
    only, no Tk calls in the workers). Successes go into details_cache; returns {id: details or None}."""
    ids = [str(field(m, "id")) for m in movies]
    missing = [movie_id for movie_id in ids if movie_id not in details_cache]
    with ThreadPoolExecutor(max_workers=DETAIL_FETCH_WORKERS) as pool:
        fetched = dict(zip(missing, pool.map(lambda movie_id: fetch_movie_details(api_key, movie_id), missing)))
    details_cache.update({k: v for k, v in fetched.items() if v is not None})
    return {movie_id: details_cache.get(movie_id) for movie_id in ids}


def apply_filter_and_display(event=None):
    selected_lang = LANG_CODE_MAP.get(lang_var.get(), "All")
    # Combobox changed to specific language → re-search to get multi-page results
    if event is not None and selected_lang != "All" and entry.get():
        on_search_click()
        return
    if selected_lang != "All":
        movies = [m for m in fetched_movies if m.get("original_language") == selected_lang]
    else:
        movies = list(fetched_movies)

    for widget in table_frame.winfo_children():
        widget.destroy()

    if not movies:
        tk.Label(table_frame, text="No results for selected language.").pack(pady=10)
        save_button.config(command=lambda: None)
        return

    columns = ("Movie ID", "Title", "Language", "Runtime", "Release Year")
    tree = ttk.Treeview(table_frame, columns=columns, show="headings")

    for col in columns:
        tree.heading(col, text=col)
        tree.column(col, width=150, anchor="center")

    all_details = fetch_details_for(movies)
    failed = sum(1 for d in all_details.values() if d is None)
    for movie in movies:
        movie_id = field(movie, "id")
        details = all_details.get(str(movie_id)) or {}
        tree.insert("", "end", values=(
            movie_id,
            field(movie, "title"),
            field(details, "original_language"),
            field(details, "runtime"),
            details["release_date"].split("-")[0] if details.get("release_date") else ""
        ))
    if failed:
        messagebox.showerror(
            "Error",
            f"Failed to fetch details for {failed} of {len(movies)} results. Check your connection and try again.",
        )

    def save_selected_to_csv():
        selected_item = tree.selection()
        if len(tree.get_children()) == 1:
            selected_item = tree.get_children()

        if not selected_item:
            messagebox.showwarning("Selection Required", "Please select a movie from the list")
            return

        outcomes = {"added": [], "duplicate": [], "failed": []}
        for item in selected_item:
            values = tree.item(item, "values")
            movie_id = values[0]
            details = details_cache.get(str(movie_id)) or fetch_movie_details(api_key, movie_id)
            credits = fetch_movie_credits(api_key, movie_id)
            keywords = fetch_movie_keywords(api_key, movie_id)
            if details is None or credits is None or keywords is None:
                # Never store a partial row: it would block a later, complete save as a duplicate.
                outcomes["failed"].append(values[1])
                continue

            genres = ", ".join([genre["name"] for genre in details.get("genres", [])])
            director = next((m["name"] for m in credits.get("crew", []) if m["job"] == "Director"), "")
            cast = ", ".join([m["name"] for m in credits.get("cast", [])[:5]])
            prod_companies = ", ".join([c["name"] for c in details.get("production_companies", [])])
            prod_countries = ", ".join([c["name"] for c in details.get("production_countries", [])])
            keywords_list = ", ".join([k["name"] for k in keywords])

            movie_details = {
                "Movie ID": movie_id,
                "Name": values[1],
                "Language": values[2],
                "Runtime": values[3],
                "Release Year": values[4],
                "Genres": genres,
                "Director": director,
                "Actors/Actresses": cast,
                "Production Company": prod_companies,
                "Production Country": prod_countries,
                "Box Office Revenue": field(details, "revenue"),
                "Budget": field(details, "budget"),
                "Popularity Score": field(details, "popularity"),
                "Vote Average": field(details, "vote_average"),
                "Vote Count": field(details, "vote_count"),
                "Poster URL": f"{TMDB_IMAGE_BASE}{details['poster_path']}" if details.get("poster_path") else "",
                "Keywords/Tags": keywords_list,
                "Release Date": field(details, "release_date")
            }

            result = append_to_csv(movie_details)
            if result == "error":
                break  # its dialog is shown; still report what was saved before it
            outcomes[result].append(values[1])

        if any(outcomes.values()):
            report_save(outcomes)

    tree.pack(fill=tk.BOTH, expand=True)
    save_button.config(command=save_selected_to_csv)

def report_save(outcomes):
    """One summary dialog per save, instead of one per movie."""
    lines = []
    if outcomes["added"]:
        lines.append("Saved: " + ", ".join(outcomes["added"]))
    if outcomes["duplicate"]:
        lines.append("Already in the CSV: " + ", ".join(outcomes["duplicate"]))
    if outcomes["failed"]:
        lines.append("Not saved (TMDB request failed, try again): " + ", ".join(outcomes["failed"]))
        messagebox.showerror("Save", "\n".join(lines))
    elif outcomes["added"]:
        messagebox.showinfo("Success", "\n".join(lines))
    else:
        messagebox.showinfo("Duplicate Entry", "\n".join(lines))


def fetch_and_display_movies(movie_name):
    global total_pages, fetched_movies, current_page

    selected_lang = LANG_CODE_MAP.get(lang_var.get(), "All")

    if selected_lang == "All":
        response = search_movie(api_key, movie_name, current_page)
        fetched_movies = response.get("results", [])
        total_pages = response.get("total_pages", 1)
    else:
        # Scan all pages, stop early once 20 filtered results found
        all_results = []
        filtered_count = 0
        # Don't reset total_pages here: on Next Page it is the previous scan's count, and a reset
        # to 1 would stop this loop before page 2. A fresh search starts at page 1, which always runs.
        page = current_page
        while page <= total_pages:
            response = search_movie(api_key, movie_name, page)
            total_pages = response.get("total_pages", 1)
            results = response.get("results", [])
            # Next Page continues after the last page actually scanned, not current_page + 1
            current_page = page
            if not results:
                break
            all_results.extend(results)
            filtered_count += sum(1 for m in results if m.get("original_language") == selected_lang)
            if filtered_count >= 20:
                break
            page += 1
        fetched_movies = all_results

    if not fetched_movies:
        messagebox.showinfo("No Results", "No movies found for the given name")
        return

    apply_filter_and_display()

def search_by_actor(actor_name, movie_name_filter=""):
    global fetched_movies
    data = get_tmdb_object(api_key, "/search/person", {"query": actor_name})
    if data is None:
        messagebox.showerror("Error", "Actor search failed. Check your connection and try again.")
        return False
    persons = data.get("results", [])

    if not persons:
        messagebox.showinfo("No Results", f"Actor '{actor_name}' not found on TMDB")
        return False

    person_id = persons[0]["id"]

    data = get_tmdb_object(api_key, f"/person/{person_id}/movie_credits")
    if data is None:
        messagebox.showerror("Error", "Failed to fetch credits. Check your connection and try again.")
        return False
    movies = data.get("cast", [])

    if movie_name_filter:
        movies = [m for m in movies if movie_name_filter.lower() in m.get("title", "").lower()]

    fetched_movies = movies
    return True

def on_search_click():
    global current_page, total_pages, last_query
    movie_name = entry.get().strip()
    actor_name = actor_entry.get().strip()

    if not movie_name and not actor_name:
        messagebox.showwarning("Input Required", "Please enter a movie name or actor name")
        return

    current_page = 1
    if actor_name:
        # Actor credits are one list: total_pages = 1 makes Next Page report the end.
        total_pages = 1
        if search_by_actor(actor_name, movie_name):
            apply_filter_and_display()
    else:
        last_query = movie_name
        fetch_and_display_movies(movie_name)

def on_next_page_click():
    global current_page  # total_pages is only read here
    if current_page < total_pages:
        current_page += 1
        fetch_and_display_movies(last_query)
    else:
        messagebox.showinfo("End of Results", "No more pages available.")

# GUI setup
root = tk.Tk()
root.title("TMDB Movie Search")

search_frame = tk.Frame(root)
search_frame.pack(pady=4)

entry_label = tk.Label(search_frame, text="Movie Name:")
entry_label.pack(side=tk.LEFT)
entry = tk.Entry(search_frame, width=30)
entry.pack(side=tk.LEFT, padx=(2, 8))
entry.bind("<Return>", lambda e: on_search_click())

lang_label = tk.Label(search_frame, text="Language:")
lang_label.pack(side=tk.LEFT)
lang_var = tk.StringVar(value="All")
lang_combo = ttk.Combobox(search_frame, textvariable=lang_var, values=LANG_DISPLAY, state="readonly", width=12)
lang_combo.pack(side=tk.LEFT, padx=(2, 0))
lang_combo.bind("<<ComboboxSelected>>", apply_filter_and_display)

actor_frame = tk.Frame(root)
actor_frame.pack(pady=2)
actor_label = tk.Label(actor_frame, text="Actor Name:")
actor_label.pack(side=tk.LEFT)
actor_entry = tk.Entry(actor_frame, width=30)
actor_entry.pack(side=tk.LEFT, padx=(2, 0))
actor_entry.bind("<Return>", lambda e: on_search_click())

search_button = tk.Button(root, text="Search", command=on_search_click)
search_button.pack()

table_frame = tk.Frame(root)
table_frame.pack(fill=tk.BOTH, expand=True)

save_button = tk.Button(root, text="Save to CSV", state="normal")
save_button.pack()

next_page_button = tk.Button(root, text="Next Page", command=on_next_page_click)
next_page_button.pack()

root.mainloop()
