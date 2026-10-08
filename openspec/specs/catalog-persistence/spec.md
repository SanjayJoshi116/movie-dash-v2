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
The system SHALL store at most one row per TMDB movie id. An import of an id already in the catalogue MUST be rejected with a conflict response. This includes an id whose earlier import is still in progress.

#### Scenario: Double-click import
- **WHEN** two import requests for the same TMDB id arrive before either completes
- **THEN** exactly one row is stored, one request succeeds, and the other receives `409`

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
The system SHALL read a catalogue file that begins with a UTF-8 byte-order mark. It SHALL append correctly to a file that does not end with a newline.

#### Scenario: BOM-prefixed file
- **WHEN** the catalogue file starts with a UTF-8 BOM
- **THEN** every movie is served with its correct `Movie ID`, and getting and deleting by id both work

#### Scenario: No trailing newline
- **WHEN** a movie is imported into a file whose last line has no trailing newline
- **THEN** the previous last row is unchanged and the imported movie is stored as its own row

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
