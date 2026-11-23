## ADDED Requirements

### Requirement: Stats rating averages leave out unrated movies
Every average-rating figure on the Stats tabs (by director, actor, genre, language, release year and runtime length) SHALL count only movies with a vote average above 0. Unrated movies SHALL NOT lower an average or count toward a minimum-films threshold. A category with no rated movies SHALL NOT be plotted as an average of 0.

#### Scenario: Director with an unrated film
- **WHEN** a director has one film rated 8.0 and one unrated film (vote average 0)
- **THEN** the director does not appear in "Highest Rated Directors (2+ films)", and no rating chart shows them with an average of 4.0

#### Scenario: Language radar
- **WHEN** some movies have no language, or a language has only unrated movies
- **THEN** the "Average Vote by Language" radar has no "Unknown" axis and no axis with an average of 0

### Requirement: Stats average-vote-by-year line covers a continuous span
The Ratings tab's "Average Vote by Year" line SHALL show every year from the earliest to the latest year with a rated release in scope, in ascending order. Years with no rated movie SHALL appear as a gap in the line, not as a point, and SHALL NOT be drill-down targets.

#### Scenario: Gap years
- **WHEN** rated movies in scope were released only in 1962 and 1971
- **THEN** the axis shows every year from 1962 to 1971, the line is broken between them, and clicking an empty year does nothing
