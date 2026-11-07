# server-resilience Specification

## Purpose

Keeps the API server's credentials out of its logs and keeps the server process running when an individual request hits an unexpected error.

## Requirements

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
The system SHALL turn any unexpected error raised while handling an API request into a generic `500` JSON response, without exposing internal details. The server process MUST keep serving later requests. An unexpected error SHALL be logged as a single line of non-secret detail, never as a dump of the error object. An import whose TMDB movie-details response is not a movie record with a title SHALL fail with `502` and store nothing.

#### Scenario: TMDB returns an empty body for an import
- **WHEN** TMDB answers a movie details request with a successful status but a `null`, non-object, or title-less body
- **THEN** the import returns `502`, nothing is stored, a later import of the same id is not rejected as a duplicate, and a following `GET /api/health` still succeeds

#### Scenario: TMDB returns empty credits for an import
- **WHEN** the movie details response is valid but the credits request answers with a successful status and a `null` body
- **THEN** the import succeeds with an empty director and cast

#### Scenario: Unexpected handler error is logged in one line
- **WHEN** a route handler throws an unexpected error
- **THEN** the response is a generic `500`, and the log entry for it is a single line

### Requirement: Startup load failures are visible
If the catalogue file exists but cannot be loaded when the server starts, the system SHALL report an error state instead of serving an empty catalogue. The health endpoint MUST report the error, and catalogue routes MUST return a server error with a generic message. The system SHALL keep running and leave the error state once a later reload succeeds; while in the error state, every catalogue request SHALL retry the load, whether or not the file appears changed. A missing catalogue file is still treated as an empty catalogue.

#### Scenario: Unreadable file at boot
- **WHEN** the server starts with a catalogue file whose header repeats a column name
- **THEN** the health endpoint reports an error status, and the catalogue list request returns a `5xx` error rather than an empty list

#### Scenario: File repaired while running
- **WHEN** the file is fixed after a failed startup and the client retries
- **THEN** the catalogue list is served normally and the health endpoint reports ok

#### Scenario: Missing file
- **WHEN** the server starts and no catalogue file exists
- **THEN** the health endpoint reports ok and the catalogue list is empty

#### Scenario: Broken file removed while running
- **WHEN** the server started with an unloadable catalogue file and that file is then deleted
- **THEN** the next catalogue list request returns an empty list and the health endpoint reports ok

#### Scenario: Load failure is logged in one line
- **WHEN** the startup load fails with any error value
- **THEN** the log line describing it names the failure (never `undefined`)

### Requirement: Startup configuration errors are reported clearly
The system SHALL stop with a one-line explanatory message and a non-zero exit code when its port is already in use, the configured port is not a valid port number, or proxy trust is configured as "trust every proxy" (which would let any client choose the address used for rate limiting). It SHALL log, without stopping, when an environment file exists but cannot be read. A missing environment file SHALL produce no message.

#### Scenario: Port already in use
- **WHEN** the server starts and its port is held by another process
- **THEN** it prints a message naming the port and exits with a non-zero code

#### Scenario: Invalid port
- **WHEN** the configured port is `abc`, `5000abc`, `0`, or `70000`
- **THEN** the server prints a message naming the invalid value and exits with a non-zero code, without listening

#### Scenario: Unreadable environment file
- **WHEN** an environment file exists but reading it fails
- **THEN** the server logs that it could not be read and keeps starting

#### Scenario: Proxy trust set to true
- **WHEN** `TRUST_PROXY` is `true` (any letter case)
- **THEN** the server prints a message recommending a hop count such as `1` or an address list, and exits with a non-zero code without listening

### Requirement: Shutdown does not interrupt catalogue writes
On a termination signal the system SHALL stop accepting new connections and wait for in-progress catalogue operations to finish before exiting. It SHALL exit after a bounded time even if something is still pending.

#### Scenario: Signal during a delete
- **WHEN** a termination signal arrives while a delete is rewriting the catalogue file
- **THEN** the process exits only after the rewrite has completed, and the file contains the result of the delete

#### Scenario: Stuck request
- **WHEN** a request is still open after the shutdown time limit
- **THEN** the process exits anyway

### Requirement: TMDB failures are reported within a bounded time
The system SHALL give up on a single TMDB request, including all of its retries and waits, within 15 seconds, and report the failure to the client. It SHALL retry only failures that may be transient (network errors and `429`/`5xx` responses), SHALL NOT retry errors that did not come from the network or TMDB, and SHALL wait at least as long as a `429` response's `Retry-After` asks before retrying, giving up instead if that wait would pass the deadline.

#### Scenario: TMDB hangs
- **WHEN** TMDB accepts the connection but never answers
- **THEN** a movie search returns `502` within 15 seconds, and an actor search within 30 seconds

#### Scenario: Rate limited with a long Retry-After
- **WHEN** TMDB answers `429` with `Retry-After: 60`
- **THEN** the request fails at once with `502` instead of waiting

#### Scenario: Rate limited with a short Retry-After
- **WHEN** TMDB answers `429` with `Retry-After: 2` and then succeeds
- **THEN** the retry happens no sooner than 2 seconds later and the request succeeds
