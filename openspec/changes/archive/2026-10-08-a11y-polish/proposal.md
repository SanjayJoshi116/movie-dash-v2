## Why

The audit (`docs/audit-findings-2026-10-08.md`: F11, F13, F16–F18, F21, C6, C7, C9, C10) found a set of smaller accessibility, presentation and resilience gaps:
- **Unlabelled controls.** Icon-only buttons have no accessible name, and a button is nested inside a link.
- **Colour-only cues.** The "filters active" state is shown only by a coloured dot.
- **Noisy headings.** Screen readers announce the emoji in page headings.
- **Broken table semantics.** Table rows lose their row meaning for screen readers.
- **Hard to read.** Some text is nearly invisible in light theme, and PNG chart exports are unreadable on light backgrounds.
- **Inconsistent dates.** Release dates appear in two formats, against the project's DD-MM-YYYY rule.
- **Layout glitches.** The mobile nav flashes on desktop at load, and a trailing slash removes the active-nav highlight.
- **Dead-end error screen.** "Try Again" re-renders the same crash.

None of these is severe on its own. Together they make the app feel unfinished and leave out keyboard and screen-reader users.

## What Changes

- **Accessible names.** Icon-only buttons get accessible names (theme toggle, template download, chart PNG download). The template download becomes a single link-button, not a button inside a link.
- **Non-colour filter cue.** The Filters button's state is also announced to assistive technology ("Filters, active").
- **Headings.** Emoji in page headings and Stats tab labels are hidden from assistive technology.
- **Table rows.** Rows keep their table-row semantics while staying keyboard-activatable.
- **TopNExplorer.**
  - Rank badges 6–10 are readable in light theme.
  - The metric selector has a label.
  - "Highest rated" requires a minimum vote count, so a single 10/10 vote doesn't top the list.
- **Chart export.** PNG exports have a solid background that matches the current theme.
- **Dates.** Every displayed release date uses DD-MM-YYYY: Dashboard Recent Releases, the highlight cards, and TopNExplorer "Most Recent".
- **Add Movie.**
  - Result thumbnails fall back to the poster placeholder when an image fails.
  - The year field rejects anything but four digits, with inline feedback.
- **Navigation shell.** No mobile nav flash before breakpoints resolve. Active-nav highlighting tolerates a trailing slash.
- **Error recovery.**
  - The error boundary resets when the user navigates elsewhere and logs the error.
  - "Try Again" also reloads the catalogue.
  - The error view fits inside the content area.
- **Zero count.** The catalogue count badge shows `0` instead of disappearing.

## Capabilities

### New Capabilities
- `accessible-ui`: baseline accessibility, legibility and presentation consistency across the app shell, Movies, Dashboard and Stats pages.

### Modified Capabilities
<!-- None -->

## Impact

- `src/components/TopBar.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `ErrorBoundary.tsx`, `App.tsx`: app shell.
- `src/pages/Movies.tsx`, `Dashboard.tsx`, `Stats.tsx`: headings, filters cue, dates.
- `src/components/MovieTable.tsx`, `TopNExplorer.tsx`, `AddMovieModal.tsx`, `StatsTabs/ChartBlock.tsx`.
- Shell changes may overlap with `ux-state-preservation` (TopBar refresh indicator), so sequence or merge carefully.
