## ADDED Requirements

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
