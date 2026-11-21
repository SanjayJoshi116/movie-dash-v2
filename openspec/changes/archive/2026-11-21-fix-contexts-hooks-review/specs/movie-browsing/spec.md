## MODIFIED Requirements

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

## ADDED Requirements

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
