## Why

The app's visual language (glassmorphism cards, bright saturated chart palette, ad-hoc spacing/typography scattered across inline styles) was built incrementally feature-by-feature and now reads as decorative rather than professional. The Dashboard in particular mixes a gradient hero stat card, translucent blurred panels, and a 15-color bright palette with no clear visual hierarchy between primary and secondary information. The user wants the app to look more professional — refined, not flashy — starting with the Dashboard but carried through the shared shell (Sidebar, TopBar, BottomNav, StatCard, chart theming) so the result is consistent everywhere rather than a one-page fix.

## What Changes

- Introduce a small set of shared design tokens (spacing scale, typography scale, card elevation/border treatment, a restrained chart color palette) that formalize what `src/utils/chartTheme.ts` and inline styles currently do ad hoc.
- Refine the glass-card treatment: keep translucency/blur as the app's identity but tighten contrast, border, and shadow so cards read as calm surfaces rather than heavy glow — applied consistently via `getCardStyle`/`StatCard` rather than each component inlining its own variant.
- Tone down `CHART_PALETTE` (`src/utils/chartTheme.ts`) from 15 bright/saturated hues to a smaller, more muted, professional set; update chart wrappers that consume it.
- Rework `Dashboard.tsx` and its local subcomponents (`HighlightCard`, `MiniChartCard`, `CtaCard`) to use the shared tokens, improve spacing/hierarchy (clearer separation between Overview / Highlights / Trends / Explore sections), and reduce the hero stat card's gradient intensity.
- Apply the same tokens to the app shell: `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx`, `StatCard.tsx` — so navigation chrome and the Dashboard share one visual system instead of the Dashboard looking different from the rest of the app.
- No routes, data flow, or interactive behavior change — this is a visual/styling pass over existing components. `MoviesContext`, filtering, drill-down navigation, and chart click-through behavior are unaffected.

## Capabilities

### New Capabilities
- `design-system`: The shared visual tokens (spacing, typography, card surface treatment, chart color palette) and where they live, consumed by both the app shell and page-level components.
- `dashboard-layout`: The Dashboard page's specific visual structure and hierarchy (Overview, Highlights, Trends & Breakdown, Explore More sections) built on top of the design-system tokens.

### Modified Capabilities
- None — no existing `openspec/specs/` capabilities exist yet in this repo; this change establishes the first two.

## Impact

- **Affected files**: `src/utils/chartTheme.ts` (card style + `CHART_PALETTE`), `src/components/StatCard.tsx`, `src/pages/Dashboard.tsx` (+ its local `HighlightCard`/`MiniChartCard`/`CtaCard`), `src/components/Sidebar.tsx`, `src/components/TopBar.tsx`, `src/components/BottomNav.tsx`, `src/components/DashboardSection.tsx`.
- **Not affected**: `MoviesContext`, `server/`, `Movies.tsx`/`Stats.tsx` page logic, routing, filter/drill-down behavior, CSV/TMDB integration. Chart wrapper components (`src/components/Charts/*`) only change insofar as they consume the updated `CHART_PALETTE`/card style — their click-handling and Chart.js registration are untouched.
- **Visual regression risk**: existing Playwright tests (`tests/app.spec.ts`) assert on structure/behavior, not colors, so this should not break e2e — but a manual visual pass in both light and dark themes is required before considering this done.
