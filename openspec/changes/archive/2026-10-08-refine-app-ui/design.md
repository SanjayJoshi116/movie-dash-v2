## Context

The app's theme tokens already exist as CSS custom properties in `src/index.css` (`--glass-bg`, `--glass-border`, `--glass-shadow`, `--text-primary/secondary/muted`, `--bg-gradient`, `--row-*`, `--filters-*`), swapped via `[data-theme="light"]` vs `:root` (dark default). Most components consume these correctly via `var(--...)` inline styles or the `.glass-panel` class (`StatCard.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx`, `MovieTable.tsx`, etc.).

`src/utils/chartTheme.ts`'s `getCardStyle(isDark)` is the one place that **doesn't** consume those vars — it hardcodes its own duplicate `rgba(...)` values for background/border/shadow. `Dashboard.tsx`'s `MiniChartCard`, `HighlightCard`, and `CtaCard` all use `getCardStyle`, which is why the Dashboard's card surfaces already drift slightly from `StatCard`'s `.glass-panel` surfaces even though both are meant to be "the same" glass card. This drift is the concrete root cause behind "Dashboard doesn't look consistent with the rest of the app" and is where this design starts. See `proposal.md` for the full motivation.

## Goals / Non-Goals

**Goals:**
- Make `getCardStyle` consume the same CSS custom properties every other glass surface already uses, eliminating the duplicate hardcoded values.
- Tune the underlying token *values* (not the mechanism) for a calmer, more professional feel: lower-contrast borders, softer shadow, less saturated hero gradient.
- Replace `CHART_PALETTE`'s 15 bright/saturated hues with a smaller, muted set.
- Introduce one small constants module for the handful of spacing/font-size numbers that are currently copy-pasted as raw literals across `Dashboard.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx`.
- Apply the above to the app shell so it matches the Dashboard.

**Non-Goals:**
- No new CSS framework, design-system library, or Ant Design theme provider overhaul (`ConfigProvider` token setup, if any exists, is out of scope unless it directly blocks a change above).
- No changes to `Movies.tsx`, `Stats.tsx`, `MovieTable.tsx`, `MovieCardGrid.tsx`, `FiltersDrawer.tsx`, or other page-specific styling — only the app shell + Dashboard per the proposal's stated scope.
- No animation/interaction redesign — Framer Motion hover behavior in `StatCard` stays as-is unless it visibly conflicts with the calmer surface treatment.
- No accessibility audit beyond not regressing existing contrast (a full a11y pass is separate work).

## Decisions

**1. Consolidate `getCardStyle` onto existing CSS vars instead of introducing a second token system.**
`getCardStyle(isDark)` becomes:
```ts
export const getCardStyle = (isDark: boolean): React.CSSProperties => ({
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  boxShadow: 'var(--glass-shadow)',
});
```
The `isDark` parameter is kept (call sites already pass it, and it stays useful if a call site ever needs a dark/light-specific branch) but the CSS vars now do the theme switching, not a JS if/else with hardcoded duplicate values.
*Alternative considered*: introduce a new `designTokens.ts` with its own light/dark objects. Rejected — it would create a second source of truth alongside `index.css`'s vars, which is the exact drift problem this change is fixing.

**2. Tune token values in `index.css`, not just the consumption mechanism.**
Adjust for a calmer look while keeping the app's glass identity:
- Dark `--glass-border`: `rgba(255,255,255,0.12)` → `rgba(255,255,255,0.08)` (less glowing edge).
- Dark `--glass-shadow`: `0 8px 32px rgba(0,0,0,0.3)` → `0 4px 20px rgba(0,0,0,0.28)` (tighter, less floaty).
- Light `--glass-border`: `rgba(129,140,248,0.35)` → `rgba(129,140,248,0.22)` (less saturated purple edge).
- Light `--glass-shadow`: `0 2px 20px rgba(100,100,200,0.22)` → `0 2px 16px rgba(100,100,200,0.14)`.
- `StatCard`'s hero gradient overlay: `${color}26` (≈15% alpha) → `${color}14` (≈8% alpha); hero border `${color}55` → `${color}33`.

**3. Replace `CHART_PALETTE` with a smaller, muted 8-color set.**
```ts
export const CHART_PALETTE = [
  '#7C93E0', // muted indigo
  '#5FB3A3', // muted teal
  '#D98E73', // muted terracotta
  '#C9A15C', // muted amber
  '#8E8FC7', // muted violet
  '#6FA8C9', // muted sky
  '#B08BC4', // muted plum
  '#82A87A', // muted sage
];
```
8 colors (down from 15) because every current consumer caps its category count at or below 8 already (genre doughnut: top 6 + "Other"; rating buckets: 5; year trend: single series) — this change doesn't need to touch that "top N + Other" grouping pattern, just shrink the palette to match what's actually used.
*Alternative considered*: keep 15 colors but desaturate all of them. Rejected — a shorter, curated list is easier to keep visually distinct at low saturation than a long desaturated list (muted colors converge on each other faster than saturated ones do).

**4. Add a small `SPACING`/`FONT_SIZE` constants object, colocated in `chartTheme.ts`.**
Rather than a new file, extend `src/utils/chartTheme.ts` (already the de facto shared theme module) with:
```ts
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const FONT_SIZE = { label: 13, body: 14, value: 28, hero: 40 } as const;
```
Scope is deliberately narrow: only the values already repeated 3+ times across `Dashboard.tsx`/`Sidebar.tsx`/`TopBar.tsx`/`BottomNav.tsx` get a constant. This is a light formalization of existing conventions, not a new scale invented from scratch — avoids over-engineering a full design-token pipeline for a 5-component app shell.
*Alternative considered*: CSS custom properties for spacing too (`--space-md`, etc.). Rejected — every component in this codebase does layout via inline `style={{}}` objects, not CSS classes, so a JS constants object is a smaller diff and matches existing style.

**5. Migration order: tokens → shell → Dashboard.**
Land `chartTheme.ts` + `index.css` changes first (foundation, affects nothing visibly on its own beyond the tuned values), then `StatCard.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx` (shell consumes tokens, gets the calmer look), then `Dashboard.tsx` and its local subcomponents last (highest visual surface area, easiest to sanity-check once shell already matches).

## Risks / Trade-offs

- **[Risk]** Tuning shared CSS vars (`--glass-border`, `--glass-shadow`) affects every existing consumer of `.glass-panel`/these vars app-wide (including `Movies.tsx`/`Stats.tsx`, which are out of scope per the proposal) → **Mitigation**: the value changes are small (opacity/blur tuning, not structural), and since those pages already share the same vars today, this is consistent with "don't make the shell/Dashboard diverge from the rest of the app" rather than a scope violation — call this out in the PR description so a reviewer isn't surprised by the diff touching `index.css` globally.
- **[Risk]** Shrinking `CHART_PALETTE` from 15 to 8 could under-supply a chart that (now or in the future) renders more than 8 categories without "Other" grouping → **Mitigation**: audited all current consumers (none exceed 8); if a future chart needs more, cycle the palette (`palette[i % palette.length]`) rather than re-inflating it.
- **[Risk]** Manual visual QA is required in both themes since there's no visual-regression tooling in this repo → **Mitigation**: proposal.md already calls this out; tasks.md will include an explicit manual QA step per changed area before calling the change done.

## Migration Plan

1. Update `index.css` token values (dark + light).
2. Refactor `getCardStyle` in `chartTheme.ts` to consume vars; add `SPACING`/`FONT_SIZE`; replace `CHART_PALETTE`.
3. Update `StatCard.tsx` hero gradient/border alpha values.
4. Update `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx` to use `SPACING`/`FONT_SIZE` where they currently hardcode repeated raw numbers.
5. Update `Dashboard.tsx` (+ `HighlightCard`/`MiniChartCard`/`CtaCard`) to use `SPACING`/`FONT_SIZE` and verify the section hierarchy (`dashboard-layout` spec) still holds visually.
6. Manual QA pass: both themes, desktop + mobile breakpoint (`BottomNav` swap), all Dashboard drill-down click paths.
7. `npm run lint && npm run build && npm run test:e2e` before considering the change complete.

No rollback complexity beyond a normal revert — this is a styling-only change with no data migration, no API change, and no persisted state format change.
