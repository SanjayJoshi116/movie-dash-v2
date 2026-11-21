## MODIFIED Requirements

### Requirement: Add Movie search and import behave predictably under rapid input
The Add Movie dialog SHALL show results only for the most recently submitted search. Submitting a search while another is in progress SHALL replace it: the earlier search's results SHALL never be shown. The dialog SHALL show the in-progress state of each movie being imported separately. A movie SHALL be shown as added exactly when it is in the current catalogue, including when the server reports it is already there. Starting a search or an import SHALL NOT hide an error from a different, earlier operation.

#### Scenario: Rapid successive searches
- **WHEN** the user searches "Alien" then quickly searches "Aliens"
- **THEN** the results shown are for "Aliens", whatever order the responses arrive in

#### Scenario: Two imports in flight
- **WHEN** the user starts importing movie A and then movie B before A completes
- **THEN** each row shows its own in-progress state until its own request completes

#### Scenario: Added from another tab
- **WHEN** a search result was added to the catalogue from another tab and the user clicks Import on it
- **THEN** the row shows "Added", no error is shown, and the catalogue includes the movie

#### Scenario: Deleted after importing
- **WHEN** the user imports a movie, deletes it from the details drawer, and reopens Add Movie with the same results
- **THEN** the row offers Import again

#### Scenario: Earlier import failed
- **WHEN** importing movie A failed and its error is showing, and the user starts importing movie B
- **THEN** movie A's error stays visible

## ADDED Requirements

### Requirement: A delete affects only the movie it was started for
When a delete completes, the details drawer SHALL close or show the delete's error only if it still shows the movie the delete was started for. A drawer showing a different movie SHALL NOT show the earlier delete as in progress.

#### Scenario: Drawer switched during a delete
- **WHEN** the user confirms Delete on movie A, closes the drawer, and opens movie B before A's delete completes
- **THEN** B's Delete button is not shown as in progress, B's drawer stays open when A's delete completes, and A's error (if any) is not shown on B
