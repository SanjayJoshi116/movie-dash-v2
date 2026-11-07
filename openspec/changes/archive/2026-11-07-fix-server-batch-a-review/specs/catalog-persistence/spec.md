## MODIFIED Requirements

### Requirement: Duplicate imports are rejected
The system SHALL store at most one row per TMDB movie id. An import of an id already in the catalogue MUST be rejected with a conflict response. This includes an id whose earlier import is still in progress. Whether an id is "already in the catalogue" SHALL be decided against the catalogue file's current contents, so an id whose row was removed from the file by another tool can be imported again.

#### Scenario: Double-click import
- **WHEN** two import requests for the same TMDB id arrive before either completes
- **THEN** exactly one row is stored, one request succeeds, and the other receives `409`

#### Scenario: Re-import after an external tool removed the row
- **WHEN** a movie's row is removed from the file by another tool while the server is running, and the user then imports that movie before any other request
- **THEN** the import succeeds with `201` and the movie is stored once

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

## ADDED Requirements

### Requirement: Imported rows are served as stored
After a successful import, the system SHALL serve the imported movie with exactly the fields the catalogue file holds for it. Fields with no matching column in the file's header MUST NOT appear, and header columns the import did not fill SHALL be present and empty, as they would be after a reload.

#### Scenario: Import into a file missing a column
- **WHEN** the catalogue file's header has no `Poster URL` column and a movie with a poster is imported
- **THEN** the import response and the following catalogue list show the movie without a poster URL, and the same is true after a server restart
