## ADDED Requirements

### Requirement: Ambiguous file headers never cause data loss
The system SHALL detect a catalogue file whose header names the same column more than once, after ignoring a leading byte-order mark and surrounding whitespace. While the file is in that state, the system MUST refuse every add and delete with a storage error, and MUST NOT rewrite the file. The duplicated column name SHALL be reported in the server log.

#### Scenario: Duplicate Movie ID column
- **WHEN** the catalogue file's header contains `Movie ID` twice and the user deletes a movie
- **THEN** the delete fails with a storage error and the file on disk is byte-for-byte unchanged

#### Scenario: Header repaired externally
- **WHEN** the duplicated column is removed from the file by hand while the server is running
- **THEN** the next request reloads the file, and adds and deletes work again

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
