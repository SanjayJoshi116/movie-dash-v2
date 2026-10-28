## Purpose

Defines the Dashboard page's visual structure and hierarchy — how its sections are organized and which metrics are emphasized — built on top of the shared design-system tokens, while preserving its existing data-driven behavior and drill-down navigation.

## ADDED Requirements

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
