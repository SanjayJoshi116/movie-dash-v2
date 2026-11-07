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
The Add Movie dialog SHALL show results only for the most recently submitted search, and SHALL NOT start a new search while one is in progress. It SHALL show the in-progress state of each movie being imported separately.

#### Scenario: Rapid successive searches
- **WHEN** the user searches "Alien" then quickly searches "Aliens"
- **THEN** the results shown are for "Aliens", whatever order the responses arrive in

#### Scenario: Two imports in flight
- **WHEN** the user starts importing movie A and then movie B before A completes
- **THEN** each row shows its own in-progress state until its own request completes

### Requirement: Deleting an already-removed movie recovers gracefully
The movie details drawer SHALL treat a "not found" response to a delete as the movie already being gone. It SHALL refresh the catalogue and close, rather than leaving a stale entry and an error on screen.

#### Scenario: Movie deleted in another tab
- **WHEN** the user deletes a movie that another tab already deleted
- **THEN** the drawer closes and the refreshed list no longer shows the movie

### Requirement: Offline maintenance tools never truncate the catalogue
Bundled scripts that rewrite the catalogue file SHALL replace it atomically. Interrupting them leaves either the previous complete file or the new complete file.

#### Scenario: Interrupt during backfill checkpoint
- **WHEN** the poster backfill script is interrupted while writing a checkpoint
- **THEN** the catalogue file is complete and parseable

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
