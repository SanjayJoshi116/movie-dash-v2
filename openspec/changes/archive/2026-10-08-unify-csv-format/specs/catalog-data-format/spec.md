## Purpose

Defines the canonical value format of movie catalogue fields, so every tool that writes the catalogue produces the same shape. It also defines how the application reads missing and legacy values.

## ADDED Requirements

### Requirement: Multi-valued fields list every value, comma-separated
Every catalogue writer SHALL store `Genres`, `Actors/Actresses`, `Production Company` and `Production Country` as the full names of all values, joined by a comma and a space. Production countries SHALL use full country names, not ISO codes.

#### Scenario: Co-production imported in-app
- **WHEN** a movie produced in the United Kingdom and the United States is imported
- **THEN** its `Production Country` is stored as `United Kingdom, United States of America`

#### Scenario: Same movie added by the Python tool
- **WHEN** the same movie is added using the bundled search tool
- **THEN** its stored `Production Country` value is identical to the in-app import's

### Requirement: Missing values are stored as empty
Every catalogue writer SHALL store a missing value as an empty field. Placeholder text such as `N/A` MUST NOT be written.

#### Scenario: Movie without a director
- **WHEN** a movie with no credited director is added by any writer
- **THEN** its `Director` field is empty

### Requirement: Legacy placeholder values read as missing
The application SHALL treat a stored field value of exactly `N/A` as missing everywhere the value is shown or aggregated.

#### Scenario: Legacy N/A director
- **WHEN** the catalogue contains rows whose `Director` is `N/A`
- **THEN** no director named "N/A" appears in any chart, filter option or drill-down

### Requirement: Analytics count each value of a multi-valued field
Charts that break the catalogue down by production country or production company SHALL count a movie once toward each listed value.

#### Scenario: Country breakdown
- **WHEN** a movie's `Production Country` is `United Kingdom, United States of America`
- **THEN** it adds one to "United Kingdom" and one to "United States of America", and no combined category appears
