import os
import queue
import threading
import tkinter as tk
from concurrent.futures import ThreadPoolExecutor
from tkinter import messagebox, ttk

from dotenv import load_dotenv

from catalogue_io import (
    CSV_PATH,
    TMDB_IMAGE_BASE,
    CatalogueError,
    add_row_if_new,
    get_tmdb_object,
    make_tmdb_session,
)

# TMDB API key — set TMDB_API_KEY in a local .env file (gitignored), never hardcode it here
load_dotenv()
api_key = os.environ.get("TMDB_API_KEY")
if not api_key:
    raise SystemExit("TMDB_API_KEY not set. Create a .env file with TMDB_API_KEY=<your key>.")

# Shared session: retries 429/5xx, sets the User-Agent (catalogue_io.make_tmdb_session)
session = make_tmdb_session()

DETAIL_FETCH_WORKERS = 5
# A language-filtered scan reads at most this many TMDB pages per view; Next Page continues.
MAX_PAGES_PER_SCAN = 10
# How often the Tk thread checks whether a background fetch has finished.
POLL_MS = 50

# Global state. Threading rule: TMDB fetches run on a worker thread (run_in_background) and
# never touch Tk; everything else, including every dialog and widget update, runs on the Tk
# thread. Only one fetch runs at a time (`busy`), so details_cache is written by the worker only
# while the Tk thread isn't reading it.
current_page = 1
total_pages = 1
fetched_movies = []
last_query = ""
last_actor = ""  # the actor of the current search ("" for a title search)
details_cache = {}  # str(movie id) -> TMDB details, filled while listing, reused on save
busy = False

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
CONNECTION_ERROR = "Failed to fetch data from TMDB. Check your connection and try again."
KEY_ERROR = "TMDB rejected the API key (401). Check TMDB_API_KEY in .env."


def field(data, key):
    """Missing or null TMDB fields are stored as empty strings, never a placeholder like
    "N/A" — matches the in-app import, so analytics don't see a fake "N/A" director/year."""
    value = data.get(key)
    return "" if value is None else value


# --- TMDB (worker-thread safe: no Tk calls, None on any failure) ---------------------------------

def tmdb(path, params=None):
    """(status, JSON object) from a TMDB endpoint; the object is None on any failure and status is
    None on a network error (catalogue_io.get_tmdb_object). 401 means the API key was rejected."""
    return get_tmdb_object(session, api_key, path, params)


def failure_message(status):
    return KEY_ERROR if status == 401 else CONNECTION_ERROR


def fetch_movie_details(movie_id):
    return tmdb(f"/movie/{movie_id}")[1]


def fetch_details_for(movies):
    """Details for every listed movie: cached ones reused, the rest fetched in parallel. Successes
    go into details_cache; returns {id: details or None}."""
    ids = [str(field(m, "id")) for m in movies]
    missing = [movie_id for movie_id in ids if movie_id not in details_cache]
    with ThreadPoolExecutor(max_workers=DETAIL_FETCH_WORKERS) as pool:
        fetched = dict(zip(missing, pool.map(fetch_movie_details, missing)))
    details_cache.update({k: v for k, v in fetched.items() if v is not None})
    return {movie_id: details_cache.get(movie_id) for movie_id in ids}


def filter_by_language(movies, lang):
    return movies if lang == "All" else [m for m in movies if m.get("original_language") == lang]


def scan_title_pages(query, lang, start_page, known_total):
    """One view of a title search. Without a language filter that is one TMDB page. With one, pages
    are read from `start_page` until 20 matches, the last page, or MAX_PAGES_PER_SCAN pages.
    Returns movies (all read), total_pages, last_page (the last page read) and error_status (the
    failed page's status, or False; the pages before a failure are still returned)."""
    movies, matches, page, total = [], 0, start_page, max(known_total, start_page)
    last_page, error_status = start_page, False
    limit = 1 if lang == "All" else MAX_PAGES_PER_SCAN
    while page <= total and page - start_page < limit:
        status, data = tmdb("/search/movie", {"query": query, "page": page})
        if data is None:
            error_status = status
            break
        total = data.get("total_pages") or 1
        results = data.get("results") or []
        last_page = page
        if not results:
            break
        movies.extend(results)
        matches += len(filter_by_language(results, lang))
        if matches >= 20:
            break
        page += 1
    return {"movies": movies, "total_pages": total, "last_page": last_page, "error_status": error_status}


def list_job(query, actor, lang, start_page, known_total):
    """Everything a listing needs from TMDB, for run_in_background. Returns a dict for finish_listing;
    a successful one carries the query and actor it was for."""
    if actor:
        status, data = tmdb("/search/person", {"query": actor})
        if data is None:
            return {"error_only": failure_message(status)}
        persons = data.get("results") or []
        if not persons:
            return {"info": f"Actor '{actor}' not found on TMDB"}
        status, data = tmdb(f"/person/{persons[0]['id']}/movie_credits")
        if data is None:
            return {"error_only": failure_message(status)}
        movies = data.get("cast") or []
        if query:
            movies = [m for m in movies if query.lower() in (m.get("title") or "").lower()]
        # Actor credits are one list: total_pages = 1 makes Next Page report the end.
        result = {"movies": movies, "total_pages": 1, "last_page": 1, "error_status": False}
    else:
        result = scan_title_pages(query, lang, start_page, known_total)
        if result["error_status"] is not False and not result["movies"]:
            return {"error_only": failure_message(result["error_status"])}
        if not result["movies"]:
            return {"info": "No movies found for the given name"}
    result.update(query=query, actor=actor, details=fetch_details_for(filter_by_language(result["movies"], lang)))
    return result


def fetch_for_save(movie_id):
    """(movie_id, status, details, credits, keywords) in one request (append_to_response). A part
    TMDB didn't return is None."""
    status, details = tmdb(f"/movie/{movie_id}", {"append_to_response": "credits,keywords"})
    if details is None:
        return movie_id, status, None, None, None
    credits, keywords = details.get("credits"), details.get("keywords")
    return (
        movie_id,
        status,
        details,
        credits if isinstance(credits, dict) else None,
        (keywords.get("keywords") or []) if isinstance(keywords, dict) else None,
    )


def append_movie(row):
    """("added" | "duplicate", None), or (None, user-facing message) when the file can't be written.
    Values are raw: catalogue_io's append escapes formula prefixes."""
    try:
        return ("added" if add_row_if_new(CSV_PATH, row) else "duplicate"), None
    except CatalogueError as e:
        return None, f"movies.csv {e}."
    except OSError:
        return None, "Could not write movies.csv (is it open in another program?). Try again."


def save_job(movie_ids, titles):
    """The whole save, off the Tk thread: TMDB fetches through one pool, then the appends in
    selection order (file I/O and lock retries included). Returns (outcomes, notes) for finish_save."""
    with ThreadPoolExecutor(max_workers=DETAIL_FETCH_WORKERS) as pool:
        fetched = list(pool.map(fetch_for_save, movie_ids))
    outcomes = {"added": [], "duplicate": [], "failed": []}
    notes = []
    for movie_id, status, details, credits, keywords in fetched:
        if details is None or credits is None or keywords is None:
            # Never store a partial row: it would block a later, complete save as a duplicate.
            outcomes["failed"].append(titles[movie_id])
            if status == 401 and KEY_ERROR not in notes:
                notes.append(KEY_ERROR)
            continue
        details_cache[movie_id] = details
        row = build_row(movie_id, details, credits, keywords)
        outcome, error = append_movie(row)
        if error:
            notes.append(f"Stopped saving: {error}")
            break  # the movies after it are not attempted; what was saved before it is reported
        outcomes[outcome].append(row["Name"] or titles[movie_id])
    return outcomes, notes


def build_row(movie_id, details, credits, keywords):
    """The CSV row, built only from the TMDB responses fetched for this save (never from the list
    cells, which are blank when listing couldn't fetch the details). Values are raw: the shared
    append escapes them."""
    def names(items):
        return ", ".join(i["name"] for i in items or [] if i.get("name"))

    release_date = field(details, "release_date")
    return {
        "Movie ID": movie_id,
        "Name": field(details, "title"),
        "Language": field(details, "original_language"),
        "Runtime": field(details, "runtime"),
        "Release Year": release_date.split("-")[0] if release_date else "",
        "Genres": names(details.get("genres")),
        "Director": next((m.get("name") or "" for m in credits.get("crew") or [] if m.get("job") == "Director"), ""),
        "Actors/Actresses": names((credits.get("cast") or [])[:5]),
        "Production Company": names(details.get("production_companies")),
        "Production Country": names(details.get("production_countries")),
        "Box Office Revenue": field(details, "revenue"),
        "Budget": field(details, "budget"),
        "Popularity Score": field(details, "popularity"),
        "Vote Average": field(details, "vote_average"),
        "Vote Count": field(details, "vote_count"),
        "Poster URL": f"{TMDB_IMAGE_BASE}{details['poster_path']}" if details.get("poster_path") else "",
        "Keywords/Tags": names(keywords),
        "Release Date": release_date,
    }


# --- Tk thread -----------------------------------------------------------------------------------

def set_busy(flag):
    global busy
    busy = flag
    state = "disabled" if flag else "normal"
    for button in (search_button, save_button, next_page_button):
        button.config(state=state)
    lang_combo.config(state="disabled" if flag else "readonly")


def run_in_background(work, on_done):
    """Run work() on a worker thread and then on_done(result) on the Tk thread, keeping the
    window responsive. Search, Save, Next Page and the language box are disabled meanwhile."""
    set_busy(True)
    results = queue.Queue()

    def worker():
        try:
            results.put((True, work()))
        # Any failure must reach the Tk thread, or the buttons would stay disabled forever. It is
        # reported by type only: exception messages can hold request URLs.
        except Exception as e:  # noqa: BLE001
            results.put((False, e))

    def poll():
        try:
            ok, value = results.get_nowait()
        except queue.Empty:
            root.after(POLL_MS, poll)
            return
        set_busy(False)
        if ok:
            on_done(value)
        else:
            messagebox.showerror("Error", f"Unexpected error ({type(value).__name__}). Try again.")

    threading.Thread(target=worker, daemon=True).start()
    root.after(POLL_MS, poll)


def start_listing(query, actor, start_page, known_total):
    """List a search view in the background. The paging and search state (last_query, last_actor,
    current_page, total_pages) only changes when that view arrives, so a failed or empty search
    leaves the list on screen consistent with Next Page and the language box."""
    lang = LANG_CODE_MAP.get(lang_var.get(), "All")
    run_in_background(lambda: list_job(query, actor, lang, start_page, known_total), finish_listing)


def finish_listing(result):
    global fetched_movies, total_pages, current_page, last_query, last_actor
    if "info" in result:
        messagebox.showinfo("No Results", result["info"])
        return
    if "error_only" in result:
        messagebox.showerror("TMDB Error", result["error_only"])
        return
    fetched_movies = result["movies"]
    last_query, last_actor = result["query"], result["actor"]
    total_pages = result["total_pages"]
    current_page = result["last_page"]  # Next Page continues after the last page read
    show_list(result["details"], partial_scan=result["error_status"] is not False)


def show_list(all_details, partial_scan=False):
    lang = LANG_CODE_MAP.get(lang_var.get(), "All")
    movies = filter_by_language(fetched_movies, lang)

    for widget in table_frame.winfo_children():
        widget.destroy()

    problems = []
    if partial_scan:
        problems.append("TMDB stopped answering partway through this search; showing the pages read so far.")

    if not movies:
        tk.Label(table_frame, text="No results for selected language.").pack(pady=10)
        save_button.config(command=lambda: None)
    else:
        columns = ("Movie ID", "Title", "Language", "Runtime", "Release Year")
        tree = ttk.Treeview(table_frame, columns=columns, show="headings")
        for col in columns:
            tree.heading(col, text=col)
            tree.column(col, width=150, anchor="center")
        failed = 0
        for movie in movies:
            movie_id = field(movie, "id")
            details = all_details.get(str(movie_id))
            if details is None:
                failed += 1
                details = {}
            tree.insert("", "end", values=(
                movie_id,
                field(movie, "title"),
                field(details, "original_language"),
                field(details, "runtime"),
                details["release_date"].split("-")[0] if details.get("release_date") else "",
            ))
        if failed:
            problems.append(f"Failed to fetch details for {failed} of {len(movies)} results. "
                            "Check your connection and try again.")
        tree.pack(fill=tk.BOTH, expand=True)
        save_button.config(command=lambda: save_selected_to_csv(tree))

    if problems:
        messagebox.showerror("Error", "\n".join(problems))


def on_language_change(event=None):
    if busy:
        return
    lang = LANG_CODE_MAP.get(lang_var.get(), "All")
    # A specific language needs a multi-page scan, so it re-runs the shown title search.
    if lang != "All" and last_query and not last_actor:
        start_listing(last_query, "", 1, 1)
        return
    movies = filter_by_language(fetched_movies, lang)
    run_in_background(lambda: fetch_details_for(movies), show_list)


def save_selected_to_csv(tree):
    if busy:
        return
    selected = tree.selection()
    if len(tree.get_children()) == 1:
        selected = tree.get_children()
    if not selected:
        messagebox.showwarning("Selection Required", "Please select a movie from the list")
        return
    # str(): ttk hands numeric cells back as int (a title like "1917"), and both go into joins.
    titles = {str(tree.item(i, "values")[0]): str(tree.item(i, "values")[1]) for i in selected}
    movie_ids = list(titles)
    run_in_background(lambda: save_job(movie_ids, titles), finish_save)


def finish_save(result):
    """One summary dialog per save, instead of one per movie."""
    outcomes, notes = result
    lines = []
    if outcomes["added"]:
        lines.append("Saved: " + ", ".join(outcomes["added"]))
    if outcomes["duplicate"]:
        lines.append("Already in the CSV: " + ", ".join(outcomes["duplicate"]))
    if outcomes["failed"]:
        lines.append("Not saved (TMDB request failed, try again): " + ", ".join(outcomes["failed"]))
    lines += notes
    if outcomes["failed"] or notes:
        messagebox.showerror("Not saved" if not outcomes["added"] else "Save", "\n".join(lines))
    elif outcomes["added"]:
        messagebox.showinfo("Success", "\n".join(lines))
    else:
        messagebox.showinfo("Duplicate Entry", "\n".join(lines))


def on_search_click():
    if busy:
        return
    movie_name = entry.get().strip()
    actor_name = actor_entry.get().strip()

    if not movie_name and not actor_name:
        messagebox.showwarning("Input Required", "Please enter a movie name or actor name")
        return

    start_listing(movie_name, actor_name, 1, 1)


def on_next_page_click():
    if busy:
        return
    # State changes only when the next view arrives, so a failed page can simply be retried.
    if current_page < total_pages:
        start_listing(last_query, last_actor, current_page + 1, total_pages)
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
lang_combo.bind("<<ComboboxSelected>>", on_language_change)

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

if __name__ == "__main__":
    root.mainloop()
