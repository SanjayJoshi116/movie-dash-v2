## MODIFIED Requirements

### Requirement: Details failing to load don't break the Dashboard
If the movie details panel fails to load when the user opens it, the Dashboard SHALL stay on screen, the user SHALL be told the details couldn't be opened, and opening details again SHALL retry the load without a page reload. The message SHALL also offer to reload the page, for browsers that keep a failed download cached. Only a failed download of the panel SHALL be reported this way: an error raised while the loaded panel renders SHALL be shown by the page's error view, not as a load failure.

#### Scenario: Network drops before first open
- **WHEN** the details panel's code fails to download and the user clicks a highlight card
- **THEN** the Dashboard stays visible with a message that the details couldn't be opened

#### Scenario: Retry after the network returns
- **WHEN** the network is back and the user clicks the highlight card again
- **THEN** the details panel opens for that movie

#### Scenario: Reload offered
- **WHEN** the details couldn't be opened and the user chooses to reload the page from the message
- **THEN** the page reloads

#### Scenario: Panel crashes after loading
- **WHEN** the details panel's code has downloaded and the panel throws an error while showing a movie
- **THEN** the page's error view is shown, not the "details couldn't be opened" message
