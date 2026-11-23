## MODIFIED Requirements

### Requirement: Stored values round-trip faithfully and safely
The system SHALL store text values that begin with `=`, `+`, `-`, `@`, a tab or a carriage return in a form that spreadsheet applications will not run as a formula. It SHALL serve those values to clients exactly as originally entered, and they MUST NOT pick up extra escaping across later rewrites.

#### Scenario: Title starting with a plus sign
- **WHEN** a movie titled `+1` is imported and another movie is later deleted
- **THEN** the UI shows the title as `+1` and the stored file still holds a formula-safe form of it

#### Scenario: Value starting with a tab
- **WHEN** a movie whose title begins with a tab followed by `=` is imported and another movie is later deleted
- **THEN** the UI shows the original title and the stored file holds a formula-safe form of it, escaped once
