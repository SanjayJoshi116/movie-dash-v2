## MODIFIED Requirements

### Requirement: Landing page JavaScript stays within budget
The JavaScript a browser must download to render the Dashboard (the landing route), measured gzipped across the entry chunk and everything it statically imports, SHALL NOT exceed 400 kB. The size SHALL be measured at the same gzip compression level the production server uses when sending it.

#### Scenario: Budget check on a compliant build
- **WHEN** the production build is created and the bundle budget check runs
- **THEN** it reports the landing page's initial JavaScript size and passes when the size is 400 kB gzipped or less

#### Scenario: Regression detected
- **WHEN** a change pushes the landing page's initial JavaScript over 400 kB gzipped
- **THEN** the budget check fails, names the chunks involved, and CI fails

#### Scenario: Measured as served
- **WHEN** the budget check measures a chunk
- **THEN** its gzipped size matches what the production server sends for that chunk
