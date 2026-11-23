## MODIFIED Requirements

### Requirement: Content is legible in both themes
All text and rank indicators SHALL have sufficient contrast against their background in both light and dark themes. Exported chart images SHALL have an opaque background matching the theme they were exported from. Controls SHALL keep their labels readable at phone width rather than being squeezed until the label is cut off.

#### Scenario: Light-theme rank badges
- **WHEN** the Top-N explorer is viewed in light theme
- **THEN** ranks 6 through 10 are clearly readable

#### Scenario: Light-theme Top-N row text
- **WHEN** the Top-N explorer is viewed in light theme
- **THEN** each row's director and genres line, and the minimum-votes note, use the theme's secondary text colour, not a fainter one

#### Scenario: Top-N toolbar on a phone
- **WHEN** the Top-N explorer is viewed at 320 px wide with the minimum-votes note shown
- **THEN** the metric selector keeps its full width, the toolbar wraps onto a second line, and the page does not scroll sideways

#### Scenario: Dark-theme chart export
- **WHEN** a user downloads a chart as PNG in dark theme and opens it in an image viewer
- **THEN** the chart is shown on a dark opaque background
