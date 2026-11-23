## ADDED Requirements

### Requirement: Failed requests always show a message
When a search, import or delete request fails, the user SHALL see an error message. If the server's error text is missing or blank, a generic message SHALL be shown instead.

#### Scenario: Blank server error on search
- **WHEN** a TMDB search request fails with a response body whose error is an empty string
- **THEN** the Add Movie dialog shows a generic error message

#### Scenario: Blank server error on delete
- **WHEN** a delete request fails with a response body whose error is an empty string
- **THEN** the details drawer shows a generic delete error message
