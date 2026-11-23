# dev-quality-gates Specification

## Purpose

Guards in CI and local tooling that keep the test suite meaningful and protect the user's real catalogue file while developing and testing.

## Requirements

### Requirement: Focused tests fail CI
When run in CI, the end-to-end suite SHALL fail if any test or suite is marked as focused (so only it runs), instead of silently running a subset.

#### Scenario: Committed focused test
- **WHEN** a spec containing a focused test is run in CI
- **THEN** the run fails with an error naming the focused test, and no tests are reported as passed

### Requirement: End-to-end specs cannot bypass the write guard
Lint SHALL fail when an end-to-end spec takes its test runner functions from the test library directly instead of the project's guarded test helpers, since only the helpers block writes to the real catalogue. Importing types from the library SHALL remain allowed. Lint SHALL also fail on fixed-duration waits in the end-to-end tests. The guard SHALL cover every page the test's browser context opens and the test's API request client. Lint SHALL fail on API write calls that skip page routing, and on new browser contexts created inside a test.

#### Scenario: Spec imports the unguarded runner
- **WHEN** a spec file imports the test runner function from the test library
- **THEN** `npm run lint` fails, pointing at the import

#### Scenario: Type-only import
- **WHEN** a spec file imports only types from the test library
- **THEN** lint passes

#### Scenario: Fixed sleep in a test
- **WHEN** a test calls a fixed-duration wait
- **THEN** `npm run lint` fails

#### Scenario: Second page in the same test
- **WHEN** a test opens another page in its context and that page sends an unmocked DELETE to the catalogue API
- **THEN** the request is blocked and the catalogue file is unchanged

#### Scenario: Direct API write
- **WHEN** a test calls a write method (POST, PUT, PATCH, DELETE or a raw fetch) on an API request client
- **THEN** `npm run lint` fails, and the guarded request fixture refuses the call at run time

### Requirement: Tests and build configs are type-checked
The production build check SHALL type-check the end-to-end specs, their helpers and the build/test configuration files, not only the application source.

#### Scenario: Wrong helper argument
- **WHEN** an end-to-end spec calls a helper with an argument of the wrong type
- **THEN** `npm run build` fails with a type error

### Requirement: Lint warnings fail the lint step
`npm run lint` SHALL exit non-zero when it reports any warning. It SHALL NOT lint gitignored throwaway files named `*.tmp.*`.

#### Scenario: Unused variable
- **WHEN** a source file has an unused variable that lint reports as a warning
- **THEN** `npm run lint` exits non-zero

#### Scenario: Throwaway script present
- **WHEN** a gitignored `something.tmp.mjs` script exists in the repo
- **THEN** `npm run lint` ignores it

### Requirement: The dev server refuses a busy port
The web dev server SHALL exit with an error when its port is already in use, rather than starting on a different port.

#### Scenario: Port 3000 taken
- **WHEN** `npm run dev` starts while another process holds port 3000
- **THEN** the web dev server reports the port as in use and does not start on another port

### Requirement: Shared display helpers have unit tests
The shared formatting, colour and grouping helpers used by the charts and tables SHALL have unit tests that run without a browser or server, and CI SHALL fail when any of them fails. These unit tests SHALL NOT be picked up by the end-to-end runner.

#### Scenario: Broken formatter
- **WHEN** a change makes the revenue formatter return `$1000K` for 999,600
- **THEN** the unit-test step fails in CI

#### Scenario: Separate runners
- **WHEN** the end-to-end suite runs
- **THEN** it does not try to run the unit-test files

### Requirement: Server tests are deterministic and can fail
Server tests SHALL wait for the server to reach a point by observing an event at that point (a stub or hook being called), not by sleeping for a fixed time. A test that injects a fault SHALL assert that the fault was actually triggered. Tests SHALL NOT depend on the operating-system user's file permissions.

#### Scenario: Slow machine
- **WHEN** the server suite runs on a heavily loaded machine
- **THEN** the concurrency tests still reach the state they describe before they act, and pass

#### Scenario: Fault point moves
- **WHEN** a server change shifts which file-system call a test's injected fault lands on
- **THEN** that test fails, saying the fault didn't fire, instead of passing without testing the failure

#### Scenario: Running as root
- **WHEN** the server suite runs as the root user in a container
- **THEN** the write-failure tests still see their writes fail and pass

### Requirement: Offline tools use the server's formula rule, checked by tests
The test suites SHALL fail when the set of leading characters that the bundled scripts escape against formula injection differs from the set the server and the export escape. The escaping rule SHALL be tested to round-trip: un-escaping an escaped value gives back the original.

#### Scenario: Prefix added on one side only
- **WHEN** a leading character is added to the server's formula rule but not to the scripts' rule
- **THEN** the Python test suite fails, naming the difference

#### Scenario: Round trip
- **WHEN** the unit tests escape and then un-escape each value in the shared case table
- **THEN** every value comes back unchanged
