## Purpose

Sets a baseline for accessibility, legibility and presentation consistency across the app shell and the Dashboard, Movies and Stats pages. Keyboard and screen-reader users must be able to operate everything, and content must stay readable in both themes.

## ADDED Requirements

### Requirement: Interactive controls have accessible names
Every interactive control SHALL expose an accessible name that describes its action, including icon-only buttons. Interactive elements MUST NOT be nested inside other interactive elements.

#### Scenario: Theme toggle
- **WHEN** a screen reader focuses the theme toggle in dark theme
- **THEN** it announces a name such as "Switch to light mode"

#### Scenario: Template download
- **WHEN** a keyboard user tabs through the top bar
- **THEN** the template download is a single focus stop with an accessible name

### Requirement: State is not conveyed by colour alone
Any status shown by a colour indicator SHALL also be available to assistive technology as text.

#### Scenario: Filters active
- **WHEN** at least one filter is active and a screen reader focuses the Filters button
- **THEN** it announces that filters are active

### Requirement: Decorative glyphs are hidden from assistive technology
Emoji and icons used decoratively in headings and tab labels SHALL NOT be announced.

#### Scenario: Movies heading
- **WHEN** a screen reader reads the Movies page heading
- **THEN** it announces "Movies" without an emoji description

### Requirement: Table semantics are preserved
Rows in the movies table SHALL keep their table-row role while still opening details when activated with the mouse, Enter or Space.

#### Scenario: Screen reader table navigation
- **WHEN** a screen reader user navigates the movies table
- **THEN** rows and cells are announced with their table positions, and pressing Enter on a focused row opens its details

### Requirement: Content is legible in both themes
All text and rank indicators SHALL have sufficient contrast against their background in both light and dark themes. Exported chart images SHALL have an opaque background matching the theme they were exported from.

#### Scenario: Light-theme rank badges
- **WHEN** the Top-N explorer is viewed in light theme
- **THEN** ranks 6 through 10 are clearly readable

#### Scenario: Dark-theme chart export
- **WHEN** a user downloads a chart as PNG in dark theme and opens it in an image viewer
- **THEN** the chart is shown on a dark opaque background

### Requirement: Release dates use one display format
Every user-visible release date SHALL be shown as DD-MM-YYYY.

#### Scenario: Recent releases
- **WHEN** the Dashboard shows recent releases
- **THEN** each date is formatted DD-MM-YYYY

### Requirement: Top-rated rankings require meaningful vote counts
The "highest rated" ranking SHALL include only movies with at least a minimum number of votes.

#### Scenario: Single-vote outlier
- **WHEN** a movie has a 10.0 average from one vote
- **THEN** it does not appear in the highest-rated ranking

### Requirement: Images degrade to a placeholder
Every movie poster image, including Add Movie search results, SHALL show the standard placeholder when the image URL is missing or fails to load.

#### Scenario: Broken poster in search results
- **WHEN** an Add Movie result's poster URL fails to load
- **THEN** the placeholder image is shown in its place

### Requirement: Add Movie year input is validated
The Add Movie year field SHALL accept only a four-digit year, and SHALL tell the user when the value is invalid instead of searching without it.

#### Scenario: Three-digit year
- **WHEN** the user enters "199" as the year and searches
- **THEN** no search is sent and the field shows a validation message

### Requirement: Navigation shell renders correctly from first paint
The app shell SHALL NOT briefly show the mobile navigation on wide screens while loading. The current section SHALL be highlighted whether or not the URL has a trailing slash.

#### Scenario: Desktop load
- **WHEN** the app loads on a 1440px-wide window
- **THEN** the bottom navigation never appears

#### Scenario: Trailing slash
- **WHEN** the user opens `/movies/`
- **THEN** Movies is highlighted as the current section

### Requirement: Error screen offers real recovery
When a page crashes, the error view SHALL fit inside the content area, SHALL clear when the user navigates to another section, and its retry action SHALL reload the catalogue before re-rendering.

#### Scenario: Navigate away from a crash
- **WHEN** the Stats page shows the error view and the user clicks Movies in the navigation
- **THEN** the Movies page renders normally

### Requirement: Catalogue count is always visible
The catalogue count indicator SHALL show the number of movies, including when that number is zero.

#### Scenario: Empty catalogue
- **WHEN** the catalogue has no movies
- **THEN** the count indicator shows 0
