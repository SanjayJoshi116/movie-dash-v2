## ADDED Requirements

### Requirement: Unknown values are not shown as real values
Dashboard figures SHALL treat unknown values the way the rest of the application does: revenue of 0 or less is unknown and SHALL NOT count toward Total Box Office; a vote average of 0 or a missing one means unrated. An unrated movie SHALL be labelled as not rated instead of showing a rating of 0. An average with no known values SHALL be shown as a placeholder dash, not as 0.

#### Scenario: Negative revenue row
- **WHEN** one movie's Box Office Revenue is -1000000 and the others are positive
- **THEN** Total Box Office equals the sum of the positive revenues, matching the Box Office tab

#### Scenario: Unrated recent release
- **WHEN** the newest movie has a vote average of 0
- **THEN** its Recent Releases entry shows "Not rated", not "⭐ 0"

#### Scenario: No rated movies
- **WHEN** no movie in the catalogue has a vote average above 0
- **THEN** the Average Rating card shows "—" with no "/ 10" suffix

### Requirement: Details failing to load don't break the Dashboard
If the movie details panel fails to load when the user opens it, the Dashboard SHALL stay on screen, the user SHALL be told the details couldn't be opened, and opening details again SHALL retry the load without a page reload.

#### Scenario: Network drops before first open
- **WHEN** the details panel's code fails to download and the user clicks a highlight card
- **THEN** the Dashboard stays visible with a message that the details couldn't be opened

#### Scenario: Retry after the network returns
- **WHEN** the network is back and the user clicks the highlight card again
- **THEN** the details panel opens for that movie
