## MODIFIED Requirements

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
