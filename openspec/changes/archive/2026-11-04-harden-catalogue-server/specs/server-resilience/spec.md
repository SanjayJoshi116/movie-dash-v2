## Purpose

Keeps the API server's credentials out of its logs and keeps the server process running when an individual request hits an unexpected error.

## ADDED Requirements

### Requirement: TMDB credentials never appear in server logs
The system SHALL NOT write the TMDB API key to any log output, whatever the outcome of a TMDB request (network error, timeout, `4xx`, `5xx`, or retries exhausted). Logged details of a TMDB failure MUST be limited to non-secret information such as the HTTP status, an error code, and the request path without its query string.

#### Scenario: TMDB outage during search
- **WHEN** a TMDB search fails with a network error after all retries
- **THEN** the response is `502`, and no logged line contains the API key

#### Scenario: TMDB server error during import
- **WHEN** a TMDB details request during import fails with HTTP `500` after all retries
- **THEN** the response is `502`, and no logged line contains the API key

#### Scenario: Unknown movie still reported as not found
- **WHEN** TMDB answers `404` for the requested movie during import
- **THEN** the response is still `404`, as before

### Requirement: Request handler failures do not crash the server
The system SHALL turn any unexpected error raised while handling an API request into a generic `500` JSON response, without exposing internal details. The server process MUST keep serving later requests.

#### Scenario: TMDB returns an empty body for an import
- **WHEN** TMDB answers a movie details or credits request with a successful status but a `null` or field-less body
- **THEN** the import either stores a row with empty values for the missing fields or returns a `5xx` error, and a following `GET /api/health` still succeeds
