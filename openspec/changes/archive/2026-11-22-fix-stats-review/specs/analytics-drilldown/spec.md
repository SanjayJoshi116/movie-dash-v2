## ADDED Requirements

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
