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
Lint SHALL fail when an end-to-end spec takes its test runner functions from the test library directly instead of the project's guarded test helpers, since only the helpers block writes to the real catalogue. Importing types from the library SHALL remain allowed. Lint SHALL also fail on fixed-duration waits in the end-to-end tests.

#### Scenario: Spec imports the unguarded runner
- **WHEN** a spec file imports the test runner function from the test library
- **THEN** `npm run lint` fails, pointing at the import

#### Scenario: Type-only import
- **WHEN** a spec file imports only types from the test library
- **THEN** lint passes

#### Scenario: Fixed sleep in a test
- **WHEN** a test calls a fixed-duration wait
- **THEN** `npm run lint` fails

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
