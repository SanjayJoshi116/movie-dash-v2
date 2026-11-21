## ADDED Requirements

### Requirement: Charts don't update on unrelated re-renders
A chart SHALL NOT be updated when its parent re-renders without changing the chart's data, theme or the presence of its click handler or value formatter. This holds whether or not the parent passes new function instances on each render.

#### Scenario: Animated counters next to charts
- **WHEN** the Stats Overview tab's metric counters animate after the page loads
- **THEN** the "Movies by Language" and "Movies Released per Year" charts are not updated on each counter tick

#### Scenario: Handler changes still take effect
- **WHEN** a parent passes a new click handler that drills down to different filters
- **THEN** the next click on the chart uses the new handler
