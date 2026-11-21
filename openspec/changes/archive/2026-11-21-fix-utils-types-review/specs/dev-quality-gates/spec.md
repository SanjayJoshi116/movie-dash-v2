## ADDED Requirements

### Requirement: Shared display helpers have unit tests
The shared formatting, colour and grouping helpers used by the charts and tables SHALL have unit tests that run without a browser or server, and CI SHALL fail when any of them fails. These unit tests SHALL NOT be picked up by the end-to-end runner.

#### Scenario: Broken formatter
- **WHEN** a change makes the revenue formatter return `$1000K` for 999,600
- **THEN** the unit-test step fails in CI

#### Scenario: Separate runners
- **WHEN** the end-to-end suite runs
- **THEN** it does not try to run the unit-test files
