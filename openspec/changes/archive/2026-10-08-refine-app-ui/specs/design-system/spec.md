## Purpose

Defines the shared visual contract — surface/card treatment, chart color palette, and spacing/typography consistency — that every page and the app shell must follow so the app reads as one coherent, professional product rather than a set of independently styled screens.

## ADDED Requirements

### Requirement: Consistent card surface treatment
Any card-style container (stat card, chart card, highlight card, CTA card, or navigation panel) SHALL use a shared surface treatment — consistent border, corner radius, and elevation/shadow — rather than each component defining its own one-off variant. The treatment SHALL provide sufficient contrast between a card's content and its background in both the light and dark theme.

#### Scenario: Card rendered in dark theme
- **WHEN** the app theme is dark and a card-style container is rendered
- **THEN** the card uses the dark-theme surface tokens (background, border, shadow) shared by every other card-style container in the app

#### Scenario: Card rendered in light theme
- **WHEN** the app theme is light and a card-style container is rendered
- **THEN** the card uses the light-theme surface tokens shared by every other card-style container in the app

#### Scenario: Theme toggle updates all cards consistently
- **WHEN** the user switches the theme from light to dark (or vice versa)
- **THEN** every card-style container across the current page updates to the corresponding theme's surface tokens without any card retaining the previous theme's styling

### Requirement: Bounded, muted chart color palette
The system SHALL provide a single shared chart color palette, reused by every chart on every page, whose colors are muted/desaturated relative to the prior bright palette and remain visually distinguishable from one another when used in the same chart.

#### Scenario: Multi-series chart uses shared palette
- **WHEN** a chart renders more than one data series or category (e.g. a doughnut or bar chart with multiple slices/bars)
- **THEN** each series/category is assigned a color from the shared palette, and no two adjacent series share the same color

#### Scenario: Palette applied consistently across chart types
- **WHEN** two different chart components (e.g. a line chart and a bar chart) render on the same page
- **THEN** both draw their colors from the same shared palette rather than each defining independent colors

### Requirement: Shared spacing and typography scale
Page sections, cards, and navigation chrome SHALL use a shared spacing scale (for padding, gaps, and margins) and a shared typography scale (for headings, body, and secondary/muted text), rather than ad hoc pixel values chosen per component.

#### Scenario: Section spacing is consistent
- **WHEN** two different dashboard-style sections (e.g. a stat card row and a chart card row) are rendered on the same page
- **THEN** the spacing between and within those sections is drawn from the shared spacing scale

### Requirement: App shell shares dashboard tokens
Navigation chrome (sidebar, top bar, bottom navigation on mobile) SHALL use the same surface, spacing, and typography tokens as the Dashboard page, so the shell and the page content read as one visual system.

#### Scenario: Sidebar and dashboard card share surface treatment
- **WHEN** the sidebar and a Dashboard stat card are visible at the same time
- **THEN** both use the same card surface tokens (border, corner radius, elevation) defined by this design system, differing only where content requires it (e.g. active-item highlight)
