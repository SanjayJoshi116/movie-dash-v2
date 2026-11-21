# catalog-persistence Specification

## Purpose

Defines how the movie catalogue stored in `src/movies.csv` is read and changed, and how it stays consistent across concurrent in-app requests and alongside external tools that edit the same file. The goal is that user data is never silently lost, duplicated or served stale.

## Requirements

### Requirement: Catalogue reads reflect the latest committed write
The system SHALL ensure that a catalogue list request made after a successful add or delete returns a result that includes that change. Clients MUST NOT be told they can reuse a cached catalogue list without revalidating it.

#### Scenario: Refetch after import shows the new movie
- **WHEN** a movie import returns success and the client immediately requests the catalogue list
- **THEN** the response includes the imported movie

#### Scenario: Refetch after delete omits the movie
- **WHEN** a delete returns success and the client immediately requests the catalogue list
- **THEN** the response does not include the deleted movie

### Requirement: Mutations are serialized and atomic
The system SHALL apply catalogue mutations one at a time, in the order they arrive. Every mutation that reports success MUST be present in the stored file. An interrupted write MUST NOT leave the stored file truncated or partly written.

#### Scenario: Concurrent deletes
- **WHEN** two delete requests for different movies arrive at the same time
- **THEN** both succeed and the stored file contains neither movie

#### Scenario: Import during delete
- **WHEN** an import and a delete of a different movie are processed concurrently
- **THEN** after a server restart the imported movie is present and the deleted movie is absent

#### Scenario: Failed write leaves state unchanged
- **WHEN** writing the stored file fails during a mutation
- **THEN** the request returns an error and both the stored file and the served catalogue are unchanged

### Requirement: Duplicate imports are rejected
The system SHALL store at most one row per TMDB movie id. An import of an id already in the catalogue MUST be rejected with a conflict response. This includes an id whose earlier import is still in progress. Whether an id is "already in the catalogue" SHALL be decided against the catalogue file's current contents, so an id whose row was removed from the file by another tool can be imported again.

#### Scenario: Double-click import
- **WHEN** two import requests for the same TMDB id arrive before either completes
- **THEN** exactly one row is stored, one request succeeds, and the other receives `409`

#### Scenario: Re-import after an external tool removed the row
- **WHEN** a movie's row is removed from the file by another tool while the server is running, and the user then imports that movie before any other request
- **THEN** the import succeeds with `201` and the movie is stored once

### Requirement: External edits to the catalogue file are preserved
The system SHALL detect when the catalogue file has changed on disk since it was last read. It SHALL incorporate those changes before applying a mutation, so rows and columns written by other tools are not discarded.

#### Scenario: Row added by external tool, then in-app delete
- **WHEN** an external tool appends a row while the server is running, and the user then deletes a different movie in-app
- **THEN** the externally added row is still present in the stored file

#### Scenario: Column added by external tool, then in-app import
- **WHEN** an external tool adds a new column to the file header while the server is running, and the user then imports a movie in-app
- **THEN** the imported row's values line up with the file's current header

### Requirement: Mutations wait for the catalogue to load
The system SHALL reject mutation requests with `503` until the initial catalogue load has finished. It SHALL refuse to append to an existing, non-empty file whose header could not be read.

#### Scenario: Import during startup
- **WHEN** an import request arrives before the initial load finishes
- **THEN** the request receives `503` and nothing is written

### Requirement: Common hand-edited file shapes are tolerated
The system SHALL read a catalogue file that begins with a UTF-8 byte-order mark. It SHALL append correctly to a file that does not end with a newline. When the system rewrites or appends to an existing file, it SHALL keep that file's byte-order mark (present or absent) and its line-ending style (CRLF or LF). A file the system creates SHALL have no byte-order mark and LF line endings.

#### Scenario: BOM-prefixed file
- **WHEN** the catalogue file starts with a UTF-8 BOM
- **THEN** every movie is served with its correct `Movie ID`, and getting and deleting by id both work

#### Scenario: No trailing newline
- **WHEN** a movie is imported into a file whose last line has no trailing newline
- **THEN** the previous last row is unchanged and the imported movie is stored as its own row

#### Scenario: Delete keeps the BOM
- **WHEN** a movie is deleted from a file that starts with a UTF-8 BOM
- **THEN** the rewritten file still starts with exactly one UTF-8 BOM

#### Scenario: CRLF file stays CRLF
- **WHEN** a movie is imported into, and another deleted from, a file whose lines end in CRLF
- **THEN** every line of the stored file, including the imported row, ends in CRLF

### Requirement: Stored values round-trip faithfully and safely
The system SHALL store text values that begin with `=`, `+`, `-` or `@` in a form that spreadsheet applications will not run as a formula. It SHALL serve those values to clients exactly as originally entered, and they MUST NOT pick up extra escaping across later rewrites.

#### Scenario: Title starting with a plus sign
- **WHEN** a movie titled `+1` is imported and another movie is later deleted
- **THEN** the UI shows the title as `+1` and the stored file still holds a formula-safe form of it

### Requirement: Errors are reported accurately
The system SHALL return status codes and messages that reflect the actual failure:
- An unknown TMDB id yields `404`.
- A storage failure yields a server error that names storage, not TMDB.
- A malformed or oversized request body yields its matching `4xx`.

#### Scenario: Unknown TMDB id
- **WHEN** an import is requested for an id TMDB reports as not found
- **THEN** the response status is `404`

#### Scenario: Oversized request body
- **WHEN** a request body exceeds the accepted size limit
- **THEN** the response status is `413`, not `500`

### Requirement: Add Movie search and import behave predictably under rapid input
The Add Movie dialog SHALL show results only for the most recently submitted search. Submitting a search while another is in progress SHALL replace it: the earlier search's results SHALL never be shown. The dialog SHALL show the in-progress state of each movie being imported separately. A movie SHALL be shown as added exactly when it is in the current catalogue, including when the server reports it is already there. Starting a search or an import SHALL NOT hide an error from a different, earlier operation.

#### Scenario: Rapid successive searches
- **WHEN** the user searches "Alien" then quickly searches "Aliens"
- **THEN** the results shown are for "Aliens", whatever order the responses arrive in

#### Scenario: Two imports in flight
- **WHEN** the user starts importing movie A and then movie B before A completes
- **THEN** each row shows its own in-progress state until its own request completes

#### Scenario: Added from another tab
- **WHEN** a search result was added to the catalogue from another tab and the user clicks Import on it
- **THEN** the row shows "Added", no error is shown, and the catalogue includes the movie

#### Scenario: Deleted after importing
- **WHEN** the user imports a movie, deletes it from the details drawer, and reopens Add Movie with the same results
- **THEN** the row offers Import again

#### Scenario: Earlier import failed
- **WHEN** importing movie A failed and its error is showing, and the user starts importing movie B
- **THEN** movie A's error stays visible

### Requirement: Deleting an already-removed movie recovers gracefully
The movie details drawer SHALL treat a "not found" response to a delete as the movie already being gone. It SHALL refresh the catalogue and close, rather than leaving a stale entry and an error on screen.

#### Scenario: Movie deleted in another tab
- **WHEN** the user deletes a movie that another tab already deleted
- **THEN** the drawer closes and the refreshed list no longer shows the movie

### Requirement: Offline maintenance tools never truncate the catalogue
Bundled scripts that rewrite the catalogue file SHALL replace it atomically. Interrupting them leaves either the previous complete file or the new complete file. Each run SHALL write to its own temporary file, so two tools running at once cannot overwrite each other's partial output. When the operating system briefly reports the catalogue file as locked or busy, the scripts SHALL retry replacing it for a short, bounded time before giving up. A row with more cells than the header SHALL NOT stop a rewrite: the extra cells are dropped, matching the server.

#### Scenario: Interrupt during backfill checkpoint
- **WHEN** the poster backfill script is interrupted while writing a checkpoint
- **THEN** the catalogue file is complete and parseable

#### Scenario: File briefly locked during a checkpoint
- **WHEN** replacing the catalogue file fails once with a permission error and succeeds on retry
- **THEN** the checkpoint is saved and the script continues

#### Scenario: Row with stray extra cells
- **WHEN** the catalogue file contains a row with more cells than the header and a script rewrites the file
- **THEN** the rewrite succeeds, every row keeps its values for the header's columns, and no temporary file is left behind

### Requirement: Ambiguous file headers never cause data loss
The system SHALL detect a catalogue file whose header names the same column more than once, after ignoring a leading byte-order mark and surrounding whitespace. Header cells that are empty after trimming SHALL NOT count as column names: they are not reported as duplicates, and their columns are not part of the catalogue (a later rewrite does not keep them). While the file has a repeated non-empty column name, the system MUST refuse every add and delete with a storage error, and MUST NOT rewrite the file. The duplicated column name SHALL be reported in the server log.

#### Scenario: Duplicate Movie ID column
- **WHEN** the catalogue file's header contains `Movie ID` twice and the user deletes a movie
- **THEN** the delete fails with a storage error and the file on disk is byte-for-byte unchanged

#### Scenario: Header repaired externally
- **WHEN** the duplicated column is removed from the file by hand while the server is running
- **THEN** the next request reloads the file, and adds and deletes work again

#### Scenario: Trailing blank header cells
- **WHEN** the catalogue file's header ends in two or more empty cells (for example `...,Release Date,,`)
- **THEN** the catalogue loads normally, every movie is served, and adds and deletes work

### Requirement: Catalogue validators are unique across server restarts
The system SHALL NOT issue a validator for the catalogue list that a client might hold from an earlier server process, so a client revalidating against a restarted server always receives the current list.

#### Scenario: Revalidation after restart
- **WHEN** a client cached the catalogue list from one server process, the server restarts with a changed file, and the client revalidates with its cached validator
- **THEN** the client receives the full current list, not a "not modified" response

### Requirement: Deletes do not overwrite concurrent external writes
The system SHALL make sure a delete that rewrites the catalogue file does not replace changes another tool made to the file while the rewrite was being prepared. If the file changed in that window, the delete SHALL be applied to the file's new contents.

#### Scenario: External append during delete rewrite
- **WHEN** an external tool appends a row after a delete has read the file but before the rewritten file replaces it
- **THEN** after the delete succeeds the stored file contains the externally appended row and not the deleted movie

### Requirement: Transient file locks do not fail mutations
The system SHALL retry replacing the catalogue file for a short, bounded time when the operating system reports it as temporarily locked or busy. It SHALL report a storage error only if the lock persists.

#### Scenario: Antivirus briefly locks the file
- **WHEN** replacing the file fails once with a "busy" or "permission" error and succeeds on retry
- **THEN** the delete returns success and the file reflects it

### Requirement: Committed writes are reported as successful
The system SHALL report an add or delete as successful once its write to the catalogue file has completed, even if follow-up bookkeeping after the write fails. In that case the next catalogue operation MUST re-read the file.

#### Scenario: Bookkeeping fails after import write
- **WHEN** an import's row is appended to the file but checking the file's state afterwards fails
- **THEN** the import returns `201`, and a later list request includes the movie

### Requirement: Read-only routes reflect the current catalogue file
The system SHALL answer TMDB search and get-by-id requests from catalogue state that has been reconciled with the file on disk, and SHALL answer TMDB search with `503` until the initial load has finished. TMDB search results for an actor SHALL list each movie at most once, most popular first.

#### Scenario: Search after an external tool added the movie
- **WHEN** an external tool appends a movie to the file while the server is running, and the user then searches TMDB for it
- **THEN** that result is marked as already imported

#### Scenario: Get by id after external append
- **WHEN** an external tool appends a movie and the client requests that movie by id
- **THEN** the movie is returned, not `404`

#### Scenario: Search during startup
- **WHEN** a TMDB search arrives before the initial catalogue load finishes
- **THEN** the response is `503`

#### Scenario: Actor with two roles in one film
- **WHEN** TMDB lists the same movie twice in an actor's credits
- **THEN** the search results contain that movie once

### Requirement: Imported rows are served as stored
After a successful import, the system SHALL serve the imported movie with exactly the fields the catalogue file holds for it. Fields with no matching column in the file's header MUST NOT appear, and header columns the import did not fill SHALL be present and empty, as they would be after a reload.

#### Scenario: Import into a file missing a column
- **WHEN** the catalogue file's header has no `Poster URL` column and a movie with a poster is imported
- **THEN** the import response and the following catalogue list show the movie without a poster URL, and the same is true after a server restart

### Requirement: Offline tools handle the catalogue file like the server does
Bundled scripts that read or write the catalogue file SHALL read a file that begins with a UTF-8 byte-order mark with its first column name intact. When they append to or rewrite an existing file, they SHALL keep its byte-order mark (present or absent) and its line-ending style (CRLF or LF). An append to a file that does not end with a newline SHALL leave the previous last row unchanged. A file they create SHALL have no byte-order mark and LF line endings.

#### Scenario: Saving a movie to a BOM-prefixed file
- **WHEN** the catalogue file starts with a UTF-8 BOM and the search tool saves a movie that is already in it
- **THEN** the save is refused as a duplicate, and the file's header is unchanged (no second `Movie ID` column)

#### Scenario: Backfilling a BOM-prefixed file
- **WHEN** the poster backfill runs on a file that starts with a UTF-8 BOM
- **THEN** rows are looked up by their `Movie ID`, and the rewritten file still starts with exactly one BOM

#### Scenario: Append without trailing newline
- **WHEN** the search tool saves a movie to a file whose last line has no trailing newline
- **THEN** the previous last row is unchanged and the saved movie is stored as its own row

#### Scenario: LF file stays LF
- **WHEN** a script appends to or rewrites a file whose lines end in LF
- **THEN** every line of the stored file ends in LF

### Requirement: Offline tools keep concurrent changes
A bundled script that rewrites the catalogue file from rows it read earlier SHALL NOT discard changes another writer made to the file in the meantime. Before replacing the file it SHALL detect such changes and apply its own updates to the file's current contents instead.

#### Scenario: Movie added in-app during a backfill
- **WHEN** a movie is imported in the app while the poster backfill is running, and the backfill then saves a checkpoint
- **THEN** the stored file contains both the imported movie and the posters the backfill found

### Requirement: Offline tools never store a partial movie
The search tool SHALL store a movie only when every TMDB request needed to build its row has succeeded. If any of them fails, it SHALL store nothing, report the failure once, and a later save of the same movie SHALL NOT be refused as a duplicate. Failures while listing search results SHALL be reported in a single message, not one per result.

#### Scenario: Credits request fails during save
- **WHEN** the user saves a movie and the TMDB credits request fails
- **THEN** no row is added, one error message is shown, and saving the same movie once TMDB recovers adds it

#### Scenario: TMDB unreachable while listing results
- **WHEN** a search returns 20 results and every per-result details request fails
- **THEN** the user sees one error message, not 20

### Requirement: Offline tools leave the file alone when there is nothing to change
The poster backfill SHALL NOT rewrite the catalogue file when it found no posters to add. It SHALL stop with one explanatory message when TMDB rejects the API key, keeping any progress already made, instead of requesting every remaining movie.

#### Scenario: Nothing to backfill
- **WHEN** the backfill runs and finds no new posters
- **THEN** the catalogue file's bytes and modification time are unchanged

#### Scenario: Invalid API key
- **WHEN** TMDB answers the backfill's first request with `401`
- **THEN** the script stops after that request with a message naming the API key as the problem, and the catalogue file is unchanged

### Requirement: Search tool paging is predictable
The search tool's Next Page action SHALL show results not shown before for the same search. With a language filter, the next page SHALL continue after the last page already scanned. After an actor search, which returns a single list, Next Page SHALL report that there are no more pages.

#### Scenario: Next page with a language filter
- **WHEN** the user searches with a language filter, the first view scans TMDB pages 1–3, and the user clicks Next Page
- **THEN** the next view starts at TMDB page 4

#### Scenario: Next page after an actor search
- **WHEN** the user runs an actor search and clicks Next Page
- **THEN** the tool reports that there are no more pages and the listed results are unchanged

### Requirement: Offline tools read file headers like the server does
Bundled scripts SHALL interpret the catalogue file's header the same way the server does:
- They SHALL ignore a leading byte-order mark and the whitespace around each column name.
- Header cells that are empty after trimming SHALL NOT count as columns.
- When the header repeats a non-empty column name, the scripts SHALL refuse to add or rewrite rows, report the problem once, and leave the file byte-for-byte unchanged.
- A script that rewrites the file SHALL store the trimmed column names.

#### Scenario: Column name with trailing space
- **WHEN** the header contains `Poster URL ` (with a trailing space) and the poster backfill saves a checkpoint
- **THEN** the stored header has exactly one `Poster URL` column, the posters are in it, and the server loads the file and accepts adds and deletes

#### Scenario: Movie ID column name with trailing space
- **WHEN** the header contains `Movie ID ` and the search tool saves a movie that is already in the file
- **THEN** the save is refused as a duplicate and no row is added

#### Scenario: Repeated column name
- **WHEN** the header contains `Name` twice and the backfill or the search tool tries to write
- **THEN** the tool reports that the header repeats `Name`, nothing is written, and the file is byte-for-byte unchanged

#### Scenario: Trailing blank header cells
- **WHEN** the header ends in empty cells (for example `...,Release Date,,`) and the search tool saves a movie
- **THEN** the save succeeds and the server still loads the file

### Requirement: Search tool stores values from the details it fetched
The search tool SHALL build every stored field from the TMDB responses it fetched for that save, never from values shown in the result list. A save SHALL store a complete row even when the result list could not show that movie's details.

#### Scenario: Details failed while listing, succeed on save
- **WHEN** the details request for one listed movie fails, so its language, runtime and year are shown blank, and the user then saves that movie while TMDB is reachable
- **THEN** the stored row has the movie's language, runtime and release year from TMDB

### Requirement: Backfill keeps found posters when it stops early
When the poster backfill stops before the end, it SHALL make one last attempt to save the posters found since the last checkpoint. This covers a user interrupt, an unexpected error and a malformed TMDB response. A checkpoint that fails because the file cannot be read, written or parsed SHALL be reported and retried at the next checkpoint, without ending the run.

#### Scenario: User interrupts the run
- **WHEN** the user presses Ctrl+C after the backfill found 50 posters since its last checkpoint
- **THEN** those 50 posters are in the stored file and the script exits with a non-zero status

#### Scenario: TMDB returns a body that is not an object
- **WHEN** one TMDB response body parses as JSON but is not an object
- **THEN** that movie is skipped with a reason and the run continues

#### Scenario: Checkpoint write fails once
- **WHEN** writing one checkpoint fails with an operating-system error and the next checkpoint succeeds
- **THEN** the run continues and every poster found is in the stored file at the end

### Requirement: Search tool re-checks for duplicates just before appending
If the catalogue file changed between the search tool's duplicate check and its append, the tool SHALL re-read the file and repeat the duplicate check before appending.

#### Scenario: Movie added in-app during a save
- **WHEN** the search tool has checked that movie 550 is absent, and the app then adds movie 550 before the tool appends
- **THEN** the tool reports 550 as already saved and the file contains one row for it

### Requirement: Search tool stays responsive while fetching
The search tool's window SHALL keep repainting and responding while it fetches from TMDB for a listing or a save. The Search and Save actions SHALL be unavailable until that fetch finishes. A language-filtered search SHALL read a bounded number of TMDB pages per view, and Next Page SHALL continue after the last page read.

#### Scenario: Slow network while listing
- **WHEN** a search lists 20 results and each details request takes several seconds
- **THEN** the window can still be moved and redrawn, and Search and Save are disabled until the list appears

#### Scenario: Rare language on a broad query
- **WHEN** the user searches a query with hundreds of TMDB pages using a language with few matches
- **THEN** one view reads at most 10 TMDB pages, and Next Page continues from page 11

### Requirement: Every offline write escapes formulas and uses the server's column order
Every row a bundled script appends SHALL have its text values escaped against spreadsheet formula injection, using the same rule as the server. A catalogue file a script creates SHALL list the server's catalogue columns first, in the server's order, followed by any extra columns.

#### Scenario: Title starting with an equals sign
- **WHEN** a movie whose title starts with `=` is saved by the search tool
- **THEN** the stored value starts with `'=` and the app shows the original title

#### Scenario: New file
- **WHEN** the search tool saves a movie and no catalogue file exists
- **THEN** the new file's header starts with the server's catalogue columns in order, and `Keywords/Tags` comes after them

### Requirement: A delete affects only the movie it was started for
When a delete completes, the details drawer SHALL close or show the delete's error only if it still shows the movie the delete was started for. A drawer showing a different movie SHALL NOT show the earlier delete as in progress.

#### Scenario: Drawer switched during a delete
- **WHEN** the user confirms Delete on movie A, closes the drawer, and opens movie B before A's delete completes
- **THEN** B's Delete button is not shown as in progress, B's drawer stays open when A's delete completes, and A's error (if any) is not shown on B
