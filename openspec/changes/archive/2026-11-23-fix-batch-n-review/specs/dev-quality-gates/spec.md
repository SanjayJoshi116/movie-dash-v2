## ADDED Requirements

### Requirement: Offline tools use the server's formula rule, checked by tests
The test suites SHALL fail when the set of leading characters that the bundled scripts escape against formula injection differs from the set the server and the export escape. The escaping rule SHALL be tested to round-trip: un-escaping an escaped value gives back the original.

#### Scenario: Prefix added on one side only
- **WHEN** a leading character is added to the server's formula rule but not to the scripts' rule
- **THEN** the Python test suite fails, naming the difference

#### Scenario: Round trip
- **WHEN** the unit tests escape and then un-escape each value in the shared case table
- **THEN** every value comes back unchanged
