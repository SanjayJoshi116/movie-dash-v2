## ADDED Requirements

### Requirement: Range controls keep bounds the user didn't change
Adjusting one end of a range filter SHALL NOT change the other end. A bound set more precisely than the control's step (for example by a drill-down) SHALL be kept exactly until the user moves that end.

#### Scenario: Rating drill-down, then lower handle moved
- **WHEN** the user drills down into the "2–4" rating bucket (vote range 2–3.999) and then moves the lower Vote Average handle to 2.5
- **THEN** the vote filter is 2.5–3.999, and movies rated exactly 4.0 are still not listed

### Requirement: Range controls step usefully by keyboard
Each keyboard step on a range filter control SHALL move the value by a meaningful amount for that field. For box office revenue a step SHALL be roughly one hundredth of the slider's span, rounded to a readable amount.

#### Scenario: Revenue by keyboard
- **WHEN** the revenue span is $1M–$2.8B and a keyboard user presses Right Arrow on the lower handle
- **THEN** the lower bound moves by tens of millions of dollars, not by $1

### Requirement: Search ignores surrounding whitespace
Leading and trailing spaces in the search text SHALL NOT affect which movies match. Search text that is only whitespace SHALL count as no search: no search chip and no active-filters indicator.

#### Scenario: Pasted title with a trailing space
- **WHEN** the user pastes "The Matrix " (with a trailing space) into the search box
- **THEN** the same movies are listed as for "The Matrix"

#### Scenario: Only a space typed
- **WHEN** the user types a single space into the empty search box
- **THEN** every movie is still listed and no "Search:" chip appears

### Requirement: Missing catalogue columns never crash filtering
Filtering SHALL work when the catalogue lacks a column a filter reads. A movie with no value for the filtered field SHALL simply not match that filter.

#### Scenario: Saved genre filter, no Genres column
- **WHEN** the session has a saved genre filter and the catalogue file has no Genres column
- **THEN** the Movies page loads, lists no movies for that filter, and shows the genre chip so it can be removed

### Requirement: Export filename says whether it is filtered
The exported file's name SHALL include "filtered" only when a search or filter is active.

#### Scenario: No filters
- **WHEN** no search or filter is active and the user exports CSV
- **THEN** the file is named `movies-<count>.csv`

#### Scenario: Genre filter active
- **WHEN** a genre filter is active and the user exports CSV
- **THEN** the file is named `movies-filtered-<count>.csv`
