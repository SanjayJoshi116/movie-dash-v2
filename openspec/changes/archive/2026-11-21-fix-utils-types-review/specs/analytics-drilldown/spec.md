## MODIFIED Requirements

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
