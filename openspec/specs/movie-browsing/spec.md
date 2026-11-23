# movie-browsing Specification

## Purpose

Defines how user state on the Movies page is kept across catalogue refreshes, navigation and browser storage failures: filters, sort, pagination, view and open dialogs. It also defines what Export CSV produces for the current view.

## Requirements

### Requirement: Catalogue refresh preserves on-screen state
After the catalogue has loaded once, refreshing it (for example after adding or deleting a movie) SHALL update the displayed data without resetting what the user has open or selected. That includes open dialogs and their contents, the active view, sort order, current page and search text. A full-page loading placeholder SHALL appear only while the catalogue is loading for the first time.

#### Scenario: Import while searching
- **WHEN** the user searches in Add Movie and imports one result
- **THEN** the dialog stays open with the same search results, the imported row is marked as added, and the catalogue behind it includes the new movie

#### Scenario: Delete from page 3
- **WHEN** the user is on page 3 of the table sorted by rating and deletes a movie from the details drawer
- **THEN** the table stays sorted by rating and on page 3, as long as page 3 still exists

### Requirement: Export reflects the current view
Export CSV SHALL output the movies matching the current search and filters, in the order the active view currently shows them. Each row SHALL include every catalogue column.

#### Scenario: Export after sorting
- **WHEN** the user sorts the table by vote average, descending, and exports
- **THEN** the first exported row is the highest-rated matching movie

#### Scenario: First movie lacks a field
- **WHEN** the first matching movie has no poster URL and the user exports
- **THEN** the exported file still has a Poster URL column, filled for the movies that have one

### Requirement: Exported values are safe to open in spreadsheets
Exported cell values that begin with `=`, `+`, `-`, `@`, a tab or a carriage return SHALL be written in a form that spreadsheet applications don't run as a formula. This SHALL apply to header cells as well as data cells. The exported file SHALL declare its UTF-8 encoding so spreadsheet applications show non-ASCII text correctly.

#### Scenario: Formula-like title
- **WHEN** a movie title begins with `=` and the user exports and opens the file in a spreadsheet
- **THEN** the title shows as text and no formula runs

#### Scenario: Formula-like column name
- **WHEN** the catalogue has an extra column whose name begins with `=` and the user exports
- **THEN** the header cell shows as text and no formula runs

#### Scenario: Title with a leading tab
- **WHEN** a movie title begins with a tab followed by `=` and the user exports
- **THEN** the exported cell is written in the same formula-safe form as other formula-like values

#### Scenario: Accented title in Excel
- **WHEN** the export contains "Amélie" and the user opens it in Excel on Windows
- **THEN** the title shows as "Amélie"

### Requirement: Changing filters returns to the first page
Both the table and grid views SHALL show the first page of results whenever the search text or any filter changes.

#### Scenario: Filter change on page 3
- **WHEN** the user is on page 3 of the grid and adds a genre filter
- **THEN** the grid shows page 1 of the filtered results

### Requirement: Range filters apply on release
Range sliders SHALL show their changing value while being dragged, and SHALL apply the resulting filter once, when the user releases the slider. Keyboard adjustment SHALL apply each step.

#### Scenario: Drag the year slider
- **WHEN** the user drags the release year slider across 20 years and releases it
- **THEN** the results update once, to the final range

### Requirement: Restored filters are valid
Filters restored from the current browser session SHALL be checked before use. A field with an invalid shape SHALL fall back to its default. A restored range SHALL be clamped to the span of the current catalogue data. Filters SHALL still be restored when session storage works but persistent (local) storage is blocked.

#### Scenario: Corrupted saved filters
- **WHEN** the saved filter data has an invalid value for genres
- **THEN** the Movies page loads normally with no genre filter, and the other valid saved filters still apply

#### Scenario: Only local storage blocked
- **WHEN** the browser blocks local storage but allows session storage, and the user reloads the Movies page with a genre filter applied
- **THEN** the genre filter is still applied after the reload

### Requirement: Preferences degrade gracefully without storage
The application SHALL load and work normally when browser storage is unavailable. Theme and filter preferences then simply aren't remembered. The theme SHALL be saved only when the user chooses one with the theme toggle. Until the user has chosen, the theme SHALL follow the operating system's colour-scheme preference, including changes made while the application is open. The saved theme SHALL be stored under a key specific to this application, so other applications served from the same origin neither read nor change it.

#### Scenario: Storage blocked
- **WHEN** the browser blocks site storage
- **THEN** the application loads, the theme toggle works for the session, and no error is shown

#### Scenario: First visit on a light-mode system
- **WHEN** a first-time visitor's operating system prefers a light colour scheme
- **THEN** the application opens in light theme

#### Scenario: OS preference changes before any choice
- **WHEN** a visitor who has never used the theme toggle switches their operating system from dark to light, with the application open or before a later visit
- **THEN** the application shows the light theme

#### Scenario: User choice wins over the OS
- **WHEN** the user has chosen dark theme with the toggle and the operating system later switches to light
- **THEN** the application stays in dark theme, including after a reload

#### Scenario: Another app on the same origin
- **WHEN** another application served from the same origin stores its own theme setting
- **THEN** this application's theme is unaffected

### Requirement: Clearing the search applies immediately
Typed search text MAY be applied after a short pause. Clearing the search (emptying the box, removing its chip, or Clear all) SHALL apply in the same update as the cleared box and chips: the list SHALL never show results filtered by search text that is no longer in the box, and the views SHALL return to the first page once, not twice.

#### Scenario: Clear all after searching
- **WHEN** the user has searched for a title, then presses Clear all
- **THEN** the full list shows at once, with no interval in which the old search still filters it

#### Scenario: Export right after clearing
- **WHEN** the user clears the search and immediately exports CSV
- **THEN** the export contains the unfiltered list

### Requirement: Drill-down filters are the first filters shown
When the Movies page opens from a drill-down, the drill-down's filters SHALL be the first filters the page renders: the filters saved earlier in the session SHALL NOT be shown first. The drill-down's ranges SHALL be clamped to the current data span in the same way as restored filters, and SHALL replace the saved filters for the rest of the session.

#### Scenario: Drill-down after a saved search
- **WHEN** the user searched for a title on the Movies page, went to the Dashboard and clicked a genre bar
- **THEN** the Movies page shows only that genre's movies from its first render, with an empty search box

#### Scenario: Drill-down range beyond the data
- **WHEN** a decade drill-down's year range is 2020–2029 and the latest release year in the catalogue is 2024
- **THEN** the year filter chip shows 2020–2024, as a restored range would

### Requirement: Malformed catalogue responses show the load error
A successful catalogue response whose body is not a list of movies SHALL be treated as a failed load. On the first load the page SHALL show the load-error view with a retry action. On a later refresh the last loaded data SHALL stay on screen and the refresh error SHALL be shown. The application SHALL NOT show its crash screen for this case.

#### Scenario: HTML returned instead of data
- **WHEN** a proxy answers the first catalogue request with status 200 and an HTML page
- **THEN** the page shows the load-error view with a retry button, not the crash screen

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

### Requirement: Range controls keep bounds the user didn't change
Adjusting one end of a range filter SHALL NOT change the other end. A bound set more precisely than the control's step (for example by a drill-down) SHALL be kept exactly until the user moves that end.

#### Scenario: Rating drill-down, then lower handle moved
- **WHEN** the user drills down into the "2–4" rating bucket (vote range 2–3.999) and then moves the lower Vote Average handle to 2.5
- **THEN** the vote filter is 2.5–3.999, and movies rated exactly 4.0 are still not listed

### Requirement: Range controls step usefully by keyboard
Each keyboard step on a range filter control SHALL move the value by a meaningful amount for that field. For box office revenue a step SHALL be roughly one hundredth of the slider's span, rounded to a readable amount.

#### Scenario: Revenue by keyboard
- **WHEN** the revenue span is $1M–$2.8B and a keyboard user presses Right Arrow on the lower handle
- **THEN** the lower bound moves by tens of millions of dollars, not by $1

### Requirement: Search ignores surrounding whitespace
Leading and trailing spaces in the search text SHALL NOT affect which movies match. Search text that is only whitespace SHALL count as no search: no search chip and no active-filters indicator.

#### Scenario: Pasted title with a trailing space
- **WHEN** the user pastes "The Matrix " (with a trailing space) into the search box
- **THEN** the same movies are listed as for "The Matrix"

#### Scenario: Only a space typed
- **WHEN** the user types a single space into the empty search box
- **THEN** every movie is still listed and no "Search:" chip appears

### Requirement: Missing catalogue columns never crash filtering
Filtering SHALL work when the catalogue lacks a column a filter reads. A movie with no value for the filtered field SHALL simply not match that filter.

#### Scenario: Saved genre filter, no Genres column
- **WHEN** the session has a saved genre filter and the catalogue file has no Genres column
- **THEN** the Movies page loads, lists no movies for that filter, and shows the genre chip so it can be removed

### Requirement: Export filename says whether it is filtered
The exported file's name SHALL include "filtered" only when a search or filter is active.

#### Scenario: No filters
- **WHEN** no search or filter is active and the user exports CSV
- **THEN** the file is named `movies-<count>.csv`

#### Scenario: Genre filter active
- **WHEN** a genre filter is active and the user exports CSV
- **THEN** the file is named `movies-filtered-<count>.csv`

### Requirement: Language filter is searchable by name
Typing in the Filters drawer's language picker SHALL match the language names it shows, not only the stored language codes.

#### Scenario: Search by language name
- **WHEN** the catalogue has a movie in Tamil (`ta`) and the user types "Tamil" in the language picker
- **THEN** "Tamil" is offered and selecting it filters to that movie
