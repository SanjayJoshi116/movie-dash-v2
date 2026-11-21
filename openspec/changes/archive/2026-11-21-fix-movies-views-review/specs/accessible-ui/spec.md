## ADDED Requirements

### Requirement: Grid cards expose their details
A clickable movie card SHALL expose the details it shows (rating, year, language, director, genres, runtime) to assistive technology, not only the movie's name.

#### Scenario: Screen reader on the grid
- **WHEN** a screen reader focuses a movie card in the grid view
- **THEN** it announces the movie's name and that it opens details, followed by the card's visible details
