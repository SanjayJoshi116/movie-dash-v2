## ADDED Requirements

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
