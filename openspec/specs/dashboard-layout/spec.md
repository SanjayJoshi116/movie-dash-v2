# dashboard-layout Specification

## Purpose

Defines the Dashboard page's visual structure and hierarchy — how its sections are organized and which metrics are emphasized — built on top of the shared design-system tokens, while preserving its existing data-driven behavior and drill-down navigation.

## Requirements

### Requirement: Dashboard section structure
The Dashboard SHALL present its content in four visually distinct sections, in this order: Overview, Highlights, Trends & Breakdown, Explore More. Each section SHALL be visually separated from the others (using the shared design-system spacing/typography) so a user can identify section boundaries without reading every label.

#### Scenario: Sections render in order
- **WHEN** the Dashboard loads with at least one movie in the dataset
- **THEN** the Overview, Highlights, Trends & Breakdown, and Explore More sections are present in that order

### Requirement: Primary metric visual emphasis
Within the Overview section, the total movie count SHALL be visually emphasized as the primary metric, distinguishable from the secondary metrics (average rating, average runtime, total box office) shown alongside it.

#### Scenario: Total movies is visually primary
- **WHEN** the Overview section renders
- **THEN** the total movie count is styled with greater visual weight (e.g. size or emphasis) than the average rating, average runtime, and total box office metrics

### Requirement: Empty dataset state preserved
When the movie dataset is empty, the Dashboard SHALL show an empty-state message with a call-to-action to the Movies page instead of rendering stat cards, highlights, or charts with zero/placeholder values.

#### Scenario: No movies in dataset
- **WHEN** the Dashboard loads and the dataset contains zero movies
- **THEN** the page shows an empty-state message and a call-to-action button that navigates to the Movies page, and does not render the Overview/Highlights/Trends sections

### Requirement: Drill-down navigation preserved
Interactive elements that navigate elsewhere on click (highlight cards, chart elements in the year trend/genre/rating charts, recent-release list items, and the total box office stat) SHALL continue to navigate to the same destination with the same preset filters or drill-down state after the visual restyle.

#### Scenario: Genre chart click still filters Movies
- **WHEN** the user clicks a genre segment in the Genre Breakdown chart
- **THEN** the app navigates to the Movies page pre-filtered to that genre, unchanged from prior behavior

#### Scenario: Highlight card click still opens movie detail
- **WHEN** the user clicks a Highlight card (Top Rated, Most Popular, or Newest Release) that has a movie
- **THEN** the movie detail drawer opens for that movie, unchanged from prior behavior

#### Scenario: Rating bucket click filters Movies by inclusive vote range
- **WHEN** the user clicks a bar in the Rating Distribution chart (half-open bucket `[min, max)`)
- **THEN** the app navigates to the Movies page with a vote filter of `[min, max − 0.001]` (the last bucket's upper bound is 10), so the filtered list matches the bar's count

#### Scenario: Year trend click filters Movies to that year
- **WHEN** the user clicks a point in the release-year trend chart
- **THEN** the app navigates to the Movies page with the release year range set to that single year

#### Scenario: Recent release click opens movie detail
- **WHEN** the user clicks an item in the Recent Releases list
- **THEN** the movie detail drawer opens for that movie

#### Scenario: Total box office opens Box Office analytics
- **WHEN** the user clicks the Total Box Office stat card
- **THEN** the app navigates to the Stats page with the Box Office tab active (`/stats?tab=boxoffice`)

#### Scenario: Other slice is not a drill-down target
- **WHEN** the user clicks the "Other" segment of the Genre Breakdown chart
- **THEN** no navigation occurs and the segment shows no pointer cursor

### Requirement: Unknown values are not shown as real values
Dashboard figures SHALL treat unknown values the way the rest of the application does: revenue of 0 or less is unknown and SHALL NOT count toward Total Box Office; a vote average of 0 or a missing one means unrated. An unrated movie SHALL be labelled as not rated instead of showing a rating of 0. An average with no known values SHALL be shown as a placeholder dash, not as 0.

#### Scenario: Negative revenue row
- **WHEN** one movie's Box Office Revenue is -1000000 and the others are positive
- **THEN** Total Box Office equals the sum of the positive revenues, matching the Box Office tab

#### Scenario: Unrated recent release
- **WHEN** the newest movie has a vote average of 0
- **THEN** its Recent Releases entry shows "Not rated", not "⭐ 0"

#### Scenario: No rated movies
- **WHEN** no movie in the catalogue has a vote average above 0
- **THEN** the Average Rating card shows "—" with no "/ 10" suffix

### Requirement: Details failing to load don't break the Dashboard
If the movie details panel fails to load when the user opens it, the Dashboard SHALL stay on screen, the user SHALL be told the details couldn't be opened, and opening details again SHALL retry the load without a page reload. The message SHALL also offer to reload the page, for browsers that keep a failed download cached. Only a failed download of the panel SHALL be reported this way: an error raised while the loaded panel renders SHALL be shown by the page's error view, not as a load failure.

#### Scenario: Network drops before first open
- **WHEN** the details panel's code fails to download and the user clicks a highlight card
- **THEN** the Dashboard stays visible with a message that the details couldn't be opened

#### Scenario: Retry after the network returns
- **WHEN** the network is back and the user clicks the highlight card again
- **THEN** the details panel opens for that movie

#### Scenario: Reload offered
- **WHEN** the details couldn't be opened and the user chooses to reload the page from the message
- **THEN** the page reloads

#### Scenario: Panel crashes after loading
- **WHEN** the details panel's code has downloaded and the panel throws an error while showing a movie
- **THEN** the page's error view is shown, not the "details couldn't be opened" message
