## MODIFIED Requirements

### Requirement: Top-rated rankings require meaningful vote counts
The "highest rated" ranking on the Stats page and the Dashboard's "Top Rated" highlight SHALL include only movies with at least a minimum number of votes, and SHALL apply the same rule. When too few movies meet the minimum for a meaningful ranking, both MAY drop the minimum, and both SHALL drop it under the same condition. Unrated movies SHALL never be picked.

#### Scenario: Single-vote outlier
- **WHEN** a movie has a 10.0 average from one vote
- **THEN** it does not appear in the highest-rated ranking

#### Scenario: Dashboard agrees with Stats
- **WHEN** the catalogue has a 10.0 movie with 1 vote and enough movies with many votes for the minimum to apply
- **THEN** the Dashboard's Top Rated highlight shows the same movie as the first entry of the Stats Highest Rated ranking

## ADDED Requirements

### Requirement: Clickable summaries announce what they show
A clickable card or list entry that summarises data SHALL have an accessible name that includes the information shown on it, not only the action. A stat card's name SHALL include its value; a highlight card's name SHALL include which highlight it is, the movie and its detail; a recent-release entry's name SHALL include the movie, its release date and its rating.

#### Scenario: Box office card
- **WHEN** a screen reader focuses the Total Box Office card
- **THEN** it announces the total amount as well as that the card opens details

#### Scenario: Highlight card
- **WHEN** a screen reader focuses the Top Rated highlight
- **THEN** it announces "Top Rated", the movie's name and its rating

### Requirement: Lists keep their list semantics
A list whose entries are clickable SHALL still be exposed to assistive technology as a list with its number of items. The clickable control SHALL be inside each list item, not replace the item's role.

#### Scenario: Recent Releases
- **WHEN** a screen reader user moves to the Dashboard's Recent Releases
- **THEN** it is announced as a list of its entries, and each entry contains a button that opens the movie's details with Enter or Space

### Requirement: Dashboard headings follow the page outline
Dashboard headings SHALL NOT skip levels: section titles SHALL be one level below the page title, and headings inside a section one level below the section title.

#### Scenario: Heading navigation
- **WHEN** a screen reader user lists the Dashboard's headings
- **THEN** the page title is followed by the section titles one level below it, with no level skipped
