## MODIFIED Requirements

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

## ADDED Requirements

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
