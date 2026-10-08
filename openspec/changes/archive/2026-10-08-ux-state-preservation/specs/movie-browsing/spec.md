## Purpose

Defines how user state on the Movies page is kept across catalogue refreshes, navigation and browser storage failures: filters, sort, pagination, view and open dialogs. It also defines what Export CSV produces for the current view.

## ADDED Requirements

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
Exported cell values that begin with `=`, `+`, `-` or `@` SHALL be written in a form that spreadsheet applications don't run as a formula.

#### Scenario: Formula-like title
- **WHEN** a movie title begins with `=` and the user exports and opens the file in a spreadsheet
- **THEN** the title shows as text and no formula runs

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
Filters restored from the current browser session SHALL be checked before use. A field with an invalid shape SHALL fall back to its default. A restored range SHALL be clamped to the span of the current catalogue data.

#### Scenario: Corrupted saved filters
- **WHEN** the saved filter data has an invalid value for genres
- **THEN** the Movies page loads normally with no genre filter, and the other valid saved filters still apply

### Requirement: Preferences degrade gracefully without storage
The application SHALL load and work normally when browser storage is unavailable. Theme and filter preferences then simply aren't remembered. When no theme has been saved, the initial theme SHALL follow the operating system's colour-scheme preference.

#### Scenario: Storage blocked
- **WHEN** the browser blocks site storage
- **THEN** the application loads, the theme toggle works for the session, and no error is shown

#### Scenario: First visit on a light-mode system
- **WHEN** a first-time visitor's operating system prefers a light colour scheme
- **THEN** the application opens in light theme
