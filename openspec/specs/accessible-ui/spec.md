# accessible-ui Specification

## Purpose

Sets a baseline for accessibility, legibility and presentation consistency across the app shell and the Dashboard, Movies and Stats pages. Keyboard and screen-reader users must be able to operate everything, and content must stay readable in both themes.

## Requirements

### Requirement: Interactive controls have accessible names
Every interactive control SHALL expose an accessible name that describes its action, including icon-only buttons and icon-only links. Interactive elements MUST NOT be nested inside other interactive elements.

#### Scenario: Theme toggle
- **WHEN** a screen reader focuses the theme toggle in dark theme
- **THEN** it announces a name such as "Switch to light mode"

#### Scenario: Template download
- **WHEN** a keyboard user tabs through the top bar
- **THEN** the template download is a single focus stop with an accessible name

#### Scenario: Collapsed sidebar logo
- **WHEN** the sidebar is collapsed and a screen reader focuses the logo link
- **THEN** it announces a name that identifies the app and the Dashboard, not an icon name

### Requirement: State is not conveyed by colour alone
Any status shown by a colour indicator SHALL also be available to assistive technology as text.

#### Scenario: Filters active
- **WHEN** at least one filter is active and a screen reader focuses the Filters button
- **THEN** it announces that filters are active

### Requirement: Decorative glyphs are hidden from assistive technology
Emoji and icons used decoratively in headings, tab labels and navigation links SHALL NOT be announced.

#### Scenario: Movies heading
- **WHEN** a screen reader reads the Movies page heading
- **THEN** it announces "Movies" without an emoji description

#### Scenario: Mobile navigation links
- **WHEN** a screen reader reads the bottom navigation on a phone-width screen
- **THEN** each link is announced by its visible label only (for example "Movies"), without an icon name

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
The app shell SHALL NOT briefly show the mobile navigation on wide screens while loading. On a screen narrower than the tablet breakpoint (768px) that still shows the sidebar, the sidebar SHALL be collapsed from the first paint. The current section SHALL be highlighted whether or not the URL has a trailing slash.

#### Scenario: Desktop load
- **WHEN** the app loads on a 1440px-wide window
- **THEN** the bottom navigation never appears

#### Scenario: Tablet load
- **WHEN** the app loads on a 700px-wide window
- **THEN** the sidebar is shown collapsed, without the user resizing the window

#### Scenario: Trailing slash
- **WHEN** the user opens `/movies/`
- **THEN** Movies is highlighted as the current section

### Requirement: Error screen offers real recovery
When a page crashes, the error view SHALL fit inside the content area and SHALL clear when the user navigates, including when the user follows a navigation link to the section that is already shown. Its retry action SHALL reload the catalogue before re-rendering. In-page URL updates that replace the current history entry SHALL NOT reset the page.

#### Scenario: Navigate away from a crash
- **WHEN** the Stats page shows the error view and the user clicks Movies in the navigation
- **THEN** the Movies page renders normally

#### Scenario: Re-open the crashed section
- **WHEN** the Stats page shows the error view at `/stats?tab=people` and the user clicks Stats in the navigation
- **THEN** the error view clears and Stats renders again from its default tab

#### Scenario: Switching Stats tabs
- **WHEN** the user switches Stats tabs and the URL's `tab` parameter updates
- **THEN** the Stats page is not remounted

### Requirement: Catalogue count is always visible
The catalogue count indicator SHALL show the number of movies, including when that number is zero, once a load has succeeded. It SHALL NOT show a count while the first catalogue load has failed and no data has been loaded.

#### Scenario: Empty catalogue
- **WHEN** the catalogue has no movies
- **THEN** the count indicator shows 0

#### Scenario: First load failed
- **WHEN** the first catalogue request fails and the page shows the load error
- **THEN** the top bar shows no movie count

### Requirement: Load failures explain the cause
When the catalogue fails to load, the error shown SHALL include the reason the server gave, if it gave one, instead of only a generic status-code message. If the server reports that the catalogue is still loading on the first request, the app SHALL retry once automatically before showing an error.

#### Scenario: Server reports a reason
- **WHEN** the first catalogue request fails with a response body whose error is "Catalogue file could not be loaded; see server log"
- **THEN** the load error shows that text

#### Scenario: Server still loading
- **WHEN** the first catalogue request returns 503 and the next request succeeds
- **THEN** the page shows the catalogue without displaying an error

### Requirement: Back and Forward keep the scroll position
Navigating to a new section SHALL start at the top of the page. Returning to a page with the browser's Back or Forward SHALL NOT force the page to the top.

#### Scenario: Back to Dashboard
- **WHEN** the user scrolls the Dashboard down, follows a drill-down to Movies, then presses Back
- **THEN** the Dashboard is not scrolled to the top by the app

#### Scenario: Link to a new section
- **WHEN** the user scrolls down on Movies and clicks Stats in the navigation
- **THEN** the Stats page opens at the top

### Requirement: Background activity is announced
A background catalogue refresh indicator SHALL be exposed to assistive technology as a status with descriptive text.

#### Scenario: Refresh after adding a movie
- **WHEN** a movie is added and the catalogue refreshes in the background
- **THEN** a status element containing text such as "Refreshing catalogue" is present until the refresh ends

### Requirement: Grid cards expose their details
A clickable movie card SHALL expose the details it shows (rating, year, language, director, genres, runtime) to assistive technology, not only the movie's name.

#### Scenario: Screen reader on the grid
- **WHEN** a screen reader focuses a movie card in the grid view
- **THEN** it announces the movie's name and that it opens details, followed by the card's visible details
