## MODIFIED Requirements

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

### Requirement: Decorative glyphs are hidden from assistive technology
Emoji and icons used decoratively in headings, tab labels and navigation links SHALL NOT be announced.

#### Scenario: Movies heading
- **WHEN** a screen reader reads the Movies page heading
- **THEN** it announces "Movies" without an emoji description

#### Scenario: Mobile navigation links
- **WHEN** a screen reader reads the bottom navigation on a phone-width screen
- **THEN** each link is announced by its visible label only (for example "Movies"), without an icon name

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

## ADDED Requirements

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
