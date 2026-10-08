## Purpose

Sets load-size budgets for the production web build, so the landing page stays fast to load as features are added, and requires those budgets to be enforced automatically on every build in CI.

## ADDED Requirements

### Requirement: Landing page JavaScript stays within budget
The JavaScript a browser must download to render the Dashboard (the landing route), measured gzipped across the entry chunk and everything it statically imports, SHALL NOT exceed 400 kB.

#### Scenario: Budget check on a compliant build
- **WHEN** the production build is created and the bundle budget check runs
- **THEN** it reports the landing page's initial JavaScript size and passes when the size is 400 kB gzipped or less

#### Scenario: Regression detected
- **WHEN** a change pushes the landing page's initial JavaScript over 400 kB gzipped
- **THEN** the budget check fails, names the chunks involved, and CI fails

### Requirement: No oversized chunks
No JavaScript chunk in the production build SHALL exceed 500 kB minified.

#### Scenario: Build output
- **WHEN** the production build completes
- **THEN** no chunk is over 500 kB minified, and the build prints no chunk-size warning

### Requirement: Page-specific code loads only when needed
Code needed only by the Movies or Stats pages SHALL NOT be part of the landing page's initial download.

#### Scenario: Dashboard first load
- **WHEN** a user opens the Dashboard in a fresh browser session
- **THEN** the table, drawer, slider and tabs components used only by Movies and Stats are not downloaded until the user navigates to those pages

### Requirement: Hover feedback is preserved
Stat cards and movie grid cards SHALL keep a visible lift-on-hover effect.

#### Scenario: Hover a movie card
- **WHEN** the user hovers over a movie card in the grid
- **THEN** the card rises slightly and scales up smoothly, then returns when the pointer leaves
