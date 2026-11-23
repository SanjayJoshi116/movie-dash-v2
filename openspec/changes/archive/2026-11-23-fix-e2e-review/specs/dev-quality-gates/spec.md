## MODIFIED Requirements

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
