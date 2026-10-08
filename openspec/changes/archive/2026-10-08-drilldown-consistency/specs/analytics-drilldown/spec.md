## Purpose

Defines how Dashboard and Stats charts summarize the movie catalogue. It also guarantees that clicking a chart element opens the Movies page filtered to exactly the set of movies that element counted.

## ADDED Requirements

### Requirement: Drill-down result matches the clicked element's count
When a user clicks a clickable chart element, the system SHALL navigate to the Movies page with filters that select exactly the movies counted in that element. The number of movies listed MUST equal the value the element showed.

#### Scenario: Rating bucket boundary
- **WHEN** a movie has a vote average of exactly 4.0 and the user clicks the "2–4" rating bar
- **THEN** that movie is not listed, and the number of listed movies equals the bar's count

#### Scenario: Runtime bucket boundary
- **WHEN** a movie runs exactly 90 minutes and the user clicks the "60–90 min" runtime bar
- **THEN** that movie is not listed, and it is listed when the user clicks the "90–120 min" bar

#### Scenario: Open-ended bucket
- **WHEN** the user clicks the "> 180 min" runtime bar
- **THEN** every movie longer than 180 minutes is listed, and the runtime filter control shows a range it can display

### Requirement: Stats drill-downs respect the Release Year Range
When the Stats page's Release Year Range is narrowed, every drill-down from any Stats tab SHALL also limit results to that year range. A drill-down that itself selects years (a specific year or a decade) SHALL list only the years that fall inside the active range.

#### Scenario: Genre click within a narrowed range
- **WHEN** the range is 2010–2015 and the user clicks the "Drama" bar showing 40 movies
- **THEN** the Movies page lists 40 Drama movies, all released between 2010 and 2015, and the active filter chips show both the genre and the year range

#### Scenario: Decade click partially outside the range
- **WHEN** the range is 2005–2015 and the user clicks the "2000s" element
- **THEN** the Movies page lists only movies from 2005–2009

### Requirement: Unknown and aggregate categories are not drill-down targets
Chart elements that stand for missing values ("Unknown") or for a group of many categories ("Other") SHALL NOT navigate when clicked, and SHALL NOT show a clickable cursor.

#### Scenario: Unknown bar clicked
- **WHEN** the user clicks a bar labelled "Unknown"
- **THEN** the page does not navigate

### Requirement: Unknown numeric values are excluded by range filters
When a revenue range filter is active, the system SHALL exclude movies whose box office revenue is missing or zero. When a vote range filter is active, it SHALL exclude movies whose vote average is missing or zero. With no range filter active, these movies SHALL still be listed.

#### Scenario: Revenue range starting at zero
- **WHEN** the revenue filter is set to $0–$10M
- **THEN** movies with no recorded revenue are not listed

#### Scenario: No revenue filter
- **WHEN** no revenue filter is active
- **THEN** movies with no recorded revenue are listed

### Requirement: Stats tab URL is valid and shareable
The Stats page SHALL show the Overview tab when the requested tab is not one of the defined tabs. Whenever a tab is shown, including on arrival from a drill-down link, the page URL SHALL identify that tab.

#### Scenario: Unknown tab parameter
- **WHEN** the user opens `/stats?tab=bogus`
- **THEN** the Overview tab is selected and shown

#### Scenario: Arrival from Dashboard link
- **WHEN** the user follows a Dashboard link that opens the Box Office tab
- **THEN** the URL contains `tab=boxoffice` without the user switching tabs, and reloading shows the Box Office tab

### Requirement: Money values are labelled accurately
Charts SHALL display a zero amount as `$0` and a negative amount with a leading minus sign. "N/A" SHALL be reserved for values that are missing.

#### Scenario: Axis origin
- **WHEN** a box-office chart is rendered
- **THEN** the axis tick at zero reads `$0`

#### Scenario: Break-even profit
- **WHEN** a movie's profit is exactly zero
- **THEN** its tooltip reads `$0`

### Requirement: Category charts use distinct colours
Category breakdown charts SHALL show at most seven named categories, with the remainder grouped as "Other". No two segments in one chart SHALL share a colour.

#### Scenario: Many production countries
- **WHEN** the catalogue spans 30 production countries
- **THEN** the country chart shows the 7 largest plus "Other", each in a distinct colour

### Requirement: Release trend covers a continuous span
The Dashboard's recent release trend SHALL cover a continuous span of the 10 most recent calendar years ending at the latest release year. Years with no releases SHALL appear with a count of zero.

#### Scenario: Gap year
- **WHEN** the catalogue has no movies released in 2019
- **THEN** the trend still shows 2019 with a value of 0, and the chart title's year range matches the axis
