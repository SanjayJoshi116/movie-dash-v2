import os
import requests
import csv
import tkinter as tk
from tkinter import messagebox
from tkinter import ttk
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# TMDB API key — set TMDB_API_KEY in a local .env file (gitignored), never hardcode it here
load_dotenv()
api_key = os.environ.get("TMDB_API_KEY")
if not api_key:
    raise SystemExit("TMDB_API_KEY not set. Create a .env file with TMDB_API_KEY=<your key>.")

# Create a session with retries and a user-agent
session = requests.Session()
retry_strategy = Retry(
    total=3,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET"],
    backoff_factor=2
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("https://", adapter)

headers = {'User-Agent': 'Mozilla/5.0'}

# Global variables for pagination
current_page = 1
total_pages = 1
fetched_movies = []

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
    url = "https://api.themoviedb.org/3/search/movie"
    params = {"api_key": api_key, "query": movie_name, "page": page}
    try:
        response = session.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        messagebox.showerror("Connection Error", f"Failed to fetch data from TMDB:\n{e}")
        return {"results": [], "total_pages": 1}

def fetch_movie_details(api_key, movie_id):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={api_key}"
    try:
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        messagebox.showerror("Error", f"Failed to fetch details:\n{e}")
        return {}

def fetch_movie_credits(api_key, movie_id):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?api_key={api_key}"
    try:
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        messagebox.showerror("Error", f"Failed to fetch credits:\n{e}")
        return {}

def fetch_movie_keywords(api_key, movie_id):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/keywords?api_key={api_key}"
    try:
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json().get("keywords", [])
    except requests.exceptions.RequestException as e:
        messagebox.showerror("Error", f"Failed to fetch keywords:\n{e}")
        return []

def is_duplicate(movie_id):
    try:
        with open("movies.csv", mode="r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            for row in reader:
                if row.get("Movie ID") == str(movie_id):
                    return True
    except FileNotFoundError:
        return False
    return False

def append_to_csv(movie_details):
    fieldnames = movie_details.keys()
    if is_duplicate(movie_details["Movie ID"]):
        messagebox.showinfo("Duplicate Entry", "This movie is already in the CSV file")
        return
    with open("movies.csv", mode="a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if file.tell() == 0:
            writer.writeheader()
        writer.writerow(movie_details)
    messagebox.showinfo("Success", "Movie details appended to CSV file")

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

    for movie in movies:
        movie_id = movie.get("id", "N/A")
        details = fetch_movie_details(api_key, movie_id)
        tree.insert("", "end", values=(
            movie_id,
            movie.get("title", "N/A"),
            details.get("original_language", "N/A"),
            details.get("runtime", "N/A"),
            details.get("release_date", "N/A").split("-")[0] if details.get("release_date") else "N/A"
        ))

    def save_selected_to_csv():
        selected_item = tree.selection()
        if len(tree.get_children()) == 1:
            selected_item = tree.get_children()

        if not selected_item:
            messagebox.showwarning("Selection Required", "Please select a movie from the list")
            return

        for item in selected_item:
            values = tree.item(item, "values")
            movie_id = values[0]
            details = fetch_movie_details(api_key, movie_id)
            credits = fetch_movie_credits(api_key, movie_id)
            keywords = fetch_movie_keywords(api_key, movie_id)

            genres = ", ".join([genre["name"] for genre in details.get("genres", [])])
            director = next((m["name"] for m in credits.get("crew", []) if m["job"] == "Director"), "N/A")
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
                "Box Office Revenue": details.get("revenue", "N/A"),
                "Budget": details.get("budget", "N/A"),
                "Popularity Score": details.get("popularity", "N/A"),
                "Vote Average": details.get("vote_average", "N/A"),
                "Vote Count": details.get("vote_count", "N/A"),
                "Keywords/Tags": keywords_list,
                "Release Date": details.get("release_date", "N/A")
            }

            append_to_csv(movie_details)

    tree.pack(fill=tk.BOTH, expand=True)
    save_button.config(command=save_selected_to_csv)

def fetch_and_display_movies(movie_name):
    global current_page, total_pages, fetched_movies

    selected_lang = LANG_CODE_MAP.get(lang_var.get(), "All")

    if selected_lang == "All":
        response = search_movie(api_key, movie_name, current_page)
        fetched_movies = response.get("results", [])
        total_pages = response.get("total_pages", 1)
    else:
        # Scan all pages, stop early once 20 filtered results found
        all_results = []
        filtered_count = 0
        total_pages = 1
        page = current_page
        while page <= total_pages:
            response = search_movie(api_key, movie_name, page)
            total_pages = response.get("total_pages", 1)
            results = response.get("results", [])
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
    try:
        r = session.get(
            "https://api.themoviedb.org/3/search/person",
            params={"api_key": api_key, "query": actor_name},
            headers=headers, timeout=10
        )
        r.raise_for_status()
        persons = r.json().get("results", [])
    except requests.exceptions.RequestException as e:
        messagebox.showerror("Error", f"Actor search failed:\n{e}")
        return False

    if not persons:
        messagebox.showinfo("No Results", f"Actor '{actor_name}' not found on TMDB")
        return False

    person_id = persons[0]["id"]

    try:
        r = session.get(
            f"https://api.themoviedb.org/3/person/{person_id}/movie_credits",
            params={"api_key": api_key},
            headers=headers, timeout=10
        )
        r.raise_for_status()
        movies = r.json().get("cast", [])
    except requests.exceptions.RequestException as e:
        messagebox.showerror("Error", f"Failed to fetch credits:\n{e}")
        return False

    if movie_name_filter:
        movies = [m for m in movies if movie_name_filter.lower() in m.get("title", "").lower()]

    fetched_movies = movies
    return True

def on_search_click():
    global current_page
    movie_name = entry.get().strip()
    actor_name = actor_entry.get().strip()

    if not movie_name and not actor_name:
        messagebox.showwarning("Input Required", "Please enter a movie name or actor name")
        return

    if actor_name:
        if search_by_actor(actor_name, movie_name):
            apply_filter_and_display()
    else:
        current_page = 1
        fetch_and_display_movies(movie_name)

def on_next_page_click():
    global current_page, total_pages
    if current_page < total_pages:
        current_page += 1
        fetch_and_display_movies(entry.get())
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
