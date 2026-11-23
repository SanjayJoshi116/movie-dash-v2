## MODIFIED Requirements

### Requirement: Exported values are safe to open in spreadsheets
Exported cell values that begin with `=`, `+`, `-`, `@`, a tab or a carriage return SHALL be written in a form that spreadsheet applications don't run as a formula. This SHALL apply to header cells as well as data cells. The exported file SHALL declare its UTF-8 encoding so spreadsheet applications show non-ASCII text correctly.

#### Scenario: Formula-like title
- **WHEN** a movie title begins with `=` and the user exports and opens the file in a spreadsheet
- **THEN** the title shows as text and no formula runs

#### Scenario: Formula-like column name
- **WHEN** the catalogue has an extra column whose name begins with `=` and the user exports
- **THEN** the header cell shows as text and no formula runs

#### Scenario: Title with a leading tab
- **WHEN** a movie title begins with a tab followed by `=` and the user exports
- **THEN** the exported cell is written in the same formula-safe form as other formula-like values

#### Scenario: Accented title in Excel
- **WHEN** the export contains "Amélie" and the user opens it in Excel on Windows
- **THEN** the title shows as "Amélie"

## ADDED Requirements

### Requirement: Language filter is searchable by name
Typing in the Filters drawer's language picker SHALL match the language names it shows, not only the stored language codes.

#### Scenario: Search by language name
- **WHEN** the catalogue has a movie in Tamil (`ta`) and the user types "Tamil" in the language picker
- **THEN** "Tamil" is offered and selecting it filters to that movie
