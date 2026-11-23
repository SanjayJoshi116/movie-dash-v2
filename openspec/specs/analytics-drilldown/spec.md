# analytics-drilldown Specification

## Purpose

Defines how Dashboard and Stats charts summarize the movie catalogue. It also guarantees that clicking a chart element opens the Movies page filtered to exactly the set of movies that element counted.

## Requirements

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
When a revenue range filter is active, the system SHALL exclude movies whose box office revenue is missing or zero. When a vote range filter is active, it SHALL exclude movies whose vote average is missing or zero. When a runtime range filter is active, it SHALL exclude movies whose runtime is missing or zero. With no range filter active, these movies SHALL still be listed. Range filter bounds and the charts that drill down into them SHALL ignore these unknown values too.

#### Scenario: Revenue range starting at zero
- **WHEN** the revenue filter is set to $0–$10M
- **THEN** movies with no recorded revenue are not listed

#### Scenario: No revenue filter
- **WHEN** no revenue filter is active
- **THEN** movies with no recorded revenue are listed

#### Scenario: Unknown runtime
- **WHEN** one movie's runtime is 0 and the shortest known runtime is 85 minutes
- **THEN** the runtime slider starts at 85, and a runtime filter of 85–90 does not list the movie with runtime 0

#### Scenario: Runtime bucket ignores unknown runtimes
- **WHEN** a movie's runtime is 0 and the user clicks the "< 60 min" runtime bar
- **THEN** that movie is neither counted in the bar nor listed

### Requirement: Stats tab URL is valid and shareable
The Stats page SHALL show the Overview tab when the requested tab is not one of the defined tabs. Whenever a tab is shown, including on arrival from a drill-down link, the page URL SHALL identify that tab.

#### Scenario: Unknown tab parameter
- **WHEN** the user opens `/stats?tab=bogus`
- **THEN** the Overview tab is selected and shown

#### Scenario: Arrival from Dashboard link
- **WHEN** the user follows a Dashboard link that opens the Box Office tab
- **THEN** the URL contains `tab=boxoffice` without the user switching tabs, and reloading shows the Box Office tab

### Requirement: Money values are labelled accurately
Charts SHALL display a zero amount as `$0` and a negative amount with a leading minus sign. "N/A" SHALL be reserved for values that are missing. A shortened amount SHALL never show 1000 or more of a unit; it SHALL move up to the next unit instead.

#### Scenario: Axis origin
- **WHEN** a box-office chart is rendered
- **THEN** the axis tick at zero reads `$0`

#### Scenario: Break-even profit
- **WHEN** a movie's profit is exactly zero
- **THEN** its tooltip reads `$0`

#### Scenario: Just under a million
- **WHEN** an amount of 999,600 is shown in shortened form
- **THEN** it reads `$1.0M`, not `$1000K`

#### Scenario: Just under a billion
- **WHEN** an amount of 999,960,000 is shown in shortened form
- **THEN** it reads `$1.0B`, not `$1000.0M`

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

### Requirement: Line-chart points are easy to target
On line charts, hovering anywhere over a point's position on the x-axis SHALL show that point's tooltip. Where the point is a drill-down target, clicking there SHALL drill down, and the pointer cursor SHALL show exactly where a click would drill down.

#### Scenario: Near-miss click on the release trend
- **WHEN** the user clicks the Dashboard release trend 20 px above a year's point
- **THEN** the app opens the Movies page filtered to that year

### Requirement: Chart values are shown at their real precision
Chart tooltips SHALL show whole-number values without decimals, and other values with at most two decimals. A point with no value SHALL NOT break the tooltip. Scatter tooltips SHALL name the axes they show, using the chart's axis labels.

#### Scenario: Count tooltip
- **WHEN** the user hovers an actor with 23 appearances in "Top 15 Actors & Actresses"
- **THEN** the tooltip shows 23, not 23.00

#### Scenario: Scatter tooltip
- **WHEN** the user hovers a point in "Vote Count vs Vote Average"
- **THEN** the tooltip shows the movie name with the vote count and vote average, each named by its axis label

### Requirement: Single-series charts have no hiding legend
Bar and line charts with a single dataset SHALL NOT show a legend, so the user can't hide the only dataset by clicking it. Charts with more than one dataset SHALL keep their legend.

#### Scenario: Rating distribution
- **WHEN** the Dashboard rating distribution chart is shown
- **THEN** it has no legend, and its bars can't be hidden

### Requirement: Stats per-year chart is ordered and continuous
The Stats Overview "Movies Released per Year" chart SHALL show years in ascending order. It SHALL cover every year from the earliest to the latest dated release in scope, and years with no releases SHALL appear with a count of zero. Movies without a release year SHALL NOT appear as a point on the chart. A year with a count of zero SHALL NOT be a drill-down target.

#### Scenario: Undated movies
- **WHEN** some movies in scope have no release year
- **THEN** the chart has no "Unknown" point, and its years are in ascending order

#### Scenario: Gap years
- **WHEN** the movies in scope were released only in 1950, 1960 and 2000
- **THEN** the chart shows every year from 1950 to 2000, with 0 for the years in between, and clicking a zero year does nothing

### Requirement: Stats summary does not show unknown years as zero
When no movie in scope has a release year, the Stats Overview's Earliest Release and Latest Release SHALL show a placeholder dash instead of 0.

#### Scenario: Year range inside a gap
- **WHEN** the catalogue has movies only in 1950 and 1960 and the Release Year Range is 1952–1958
- **THEN** Earliest Release and Latest Release do not show 0

### Requirement: Stats Release Year Range stays within the data
After the catalogue changes, the Stats Release Year Range SHALL be limited to the new span of release years. If the narrowed range no longer overlaps the data, or now covers the full span, it SHALL reset to the full span, and the Reset button SHALL be hidden.

#### Scenario: Latest year removed
- **WHEN** the range is narrowed to 2015–2024 and a refresh changes the latest release year to 2020
- **THEN** the range label reads 2015 – 2020

#### Scenario: Range now covers everything
- **WHEN** the range is narrowed and a refresh makes the data span fit inside it
- **THEN** the label shows the full span and the Reset button is hidden

### Requirement: Stats has empty states
When the catalogue is empty, the Stats page SHALL show an empty-state message with a button that opens the Movies page, instead of the year slider and tabs. When the catalogue has movies but none fall in the selected Release Year Range, the page SHALL show an empty-state message with a way to reset the range, instead of the tabs.

#### Scenario: Empty catalogue
- **WHEN** the Stats page loads and the catalogue has no movies
- **THEN** it shows an empty-state message and a button that navigates to the Movies page, with no year slider or tabs

#### Scenario: Range with no releases
- **WHEN** the Release Year Range covers years with no releases
- **THEN** the tabs are replaced by an empty-state message, and resetting the range shows the previously active tab again

### Requirement: Top 10 date rankings use known release dates
The Top 10 explorer's "Oldest" ranking SHALL include only movies with a known release date or year. It SHALL order them by release date, using the year when the date is missing.

#### Scenario: Undated movie
- **WHEN** a movie has neither a release date nor a release year
- **THEN** it does not appear in the "Oldest" ranking

#### Scenario: Same-year movies
- **WHEN** two movies were released in the same year on different dates
- **THEN** the one released earlier ranks higher in "Oldest"

### Requirement: Stats rating averages leave out unrated movies
Every average-rating figure on the Stats tabs (by director, actor, genre, language, release year and runtime length) SHALL count only movies with a vote average above 0. Unrated movies SHALL NOT lower an average or count toward a minimum-films threshold. A category with no rated movies SHALL NOT be plotted as an average of 0.

#### Scenario: Director with an unrated film
- **WHEN** a director has one film rated 8.0 and one unrated film (vote average 0)
- **THEN** the director does not appear in "Highest Rated Directors (2+ films)", and no rating chart shows them with an average of 4.0

#### Scenario: Language radar
- **WHEN** some movies have no language, or a language has only unrated movies
- **THEN** the "Average Vote by Language" radar has no "Unknown" axis and no axis with an average of 0

### Requirement: Stats average-vote-by-year line covers a continuous span
The Ratings tab's "Average Vote by Year" line SHALL show every year from the earliest to the latest year with a rated release in scope, in ascending order. Years with no rated movie SHALL appear as a gap in the line, not as a point, and SHALL NOT be drill-down targets.

#### Scenario: Gap years
- **WHEN** rated movies in scope were released only in 1962 and 1971
- **THEN** the axis shows every year from 1962 to 1971, the line is broken between them, and clicking an empty year does nothing
