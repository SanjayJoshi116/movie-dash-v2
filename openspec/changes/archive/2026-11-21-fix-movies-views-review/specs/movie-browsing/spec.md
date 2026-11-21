## MODIFIED Requirements

### Requirement: Exported values are safe to open in spreadsheets
Exported cell values that begin with `=`, `+`, `-` or `@` SHALL be written in a form that spreadsheet applications don't run as a formula. This SHALL apply to header cells as well as data cells. The exported file SHALL declare its UTF-8 encoding so spreadsheet applications show non-ASCII text correctly.

#### Scenario: Formula-like title
- **WHEN** a movie title begins with `=` and the user exports and opens the file in a spreadsheet
- **THEN** the title shows as text and no formula runs

#### Scenario: Formula-like column name
- **WHEN** the catalogue has an extra column whose name begins with `=` and the user exports
- **THEN** the header cell shows as text and no formula runs

#### Scenario: Accented title in Excel
- **WHEN** the export contains "Amélie" and the user opens it in Excel on Windows
- **THEN** the title shows as "Amélie"

## ADDED Requirements

### Requirement: Table sorting follows the displayed values
Sorting a table column SHALL order rows by the value the column displays.

#### Scenario: Language column
- **WHEN** rows have languages de, el and en and the user sorts the Language column ascending
- **THEN** the order is English, German, Greek

### Requirement: Hidden columns don't keep sorting the list
When a sorted column is hidden because the window became narrower, the sort SHALL be cleared, so the rows shown and exported follow the remaining visible order.

#### Scenario: Window narrowed after sorting by Actors
- **WHEN** the user sorts by Actors/Actresses on a wide window, then narrows it until that column is hidden, then exports
- **THEN** the table and the export use the default order, and widening the window again doesn't bring the sort back

### Requirement: Missing fields never crash the movie views
The table, grid, details drawer and Stats tabs SHALL work when a movie lacks a value for any catalogue column, whether its row is short or the catalogue has no such column. A missing value SHALL be treated as blank.

#### Scenario: Row that stops before Genres
- **WHEN** one catalogue row ends before its Genres value and the user opens the grid, sorts the table by Genres and opens that movie's details
- **THEN** each view renders, and the movie shows no genres

### Requirement: Movie details show unknown values as unknown
The details drawer and grid cards SHALL NOT present a blank or unknown value as a real one: a runtime of 0 or less, a vote average of 0 or less, and a blank release date or year SHALL be shown as "—" or left out.

#### Scenario: Unrated movie in the drawer
- **WHEN** the user opens the details of a movie whose vote average is 0
- **THEN** the drawer shows no "⭐ 0" rating tag and no vote colour

#### Scenario: Unknown runtime on a grid card
- **WHEN** a movie's runtime is 0
- **THEN** its grid card doesn't show "0 mins"
