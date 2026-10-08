## Context

See proposal.md, Why. Most items are local edits. Only a few need decisions.

## Goals / Non-Goals

**Goals:** close the specific audit findings listed in the proposal.

**Non-Goals:**
- A full WCAG audit or automated axe integration. The e2e-hardening change could add `@axe-core/playwright` later.
- Bundle-size work (antd vendor chunk around 987 kB). That's tracked separately.

## Decisions

### 1. Table rows
Remove `role="button"` and `aria-label` from `<tr>`. Keep `tabIndex={0}` and the key handler, and put an accessible name on the Name cell instead: render the title as a `<button type="button">` styled as plain text, which carries the click.

*Alternative:* keep the row as the only focus target. Rejected because overriding `role` on a `<tr>` is exactly what breaks table semantics.

**Decision:** the row stays clickable for mouse users. Keyboard users get a real button in the Name cell. Remove the row's `tabIndex` so the row and the button aren't two tab stops per movie.

### 2. Minimum votes for "Highest rated"
Use a fixed minimum of **50 votes**, shown in the UI as a hint ("min. 50 votes"). If fewer than 10 movies qualify, which happens with tiny datasets like the template CSV, fall back to all movies so the list isn't empty.

*Alternative:* a Bayesian weighted rating. Rejected because it's more accurate but harder to explain in a label.

### 3. PNG export background
In `ChartBlock.handleExport`:
1. Draw onto an offscreen canvas of the same size.
2. Fill it with the current theme's resolved `--bg` colour (read through `getComputedStyle(document.documentElement)`).
3. `drawImage` the chart canvas on top.
4. Export that offscreen canvas.

### 4. Shell first paint
In `App.tsx`, render neither `Sidebar` nor `BottomNav` while `screens.sm === undefined`. `Movies.tsx` already guards against that value. This applies the same pattern to the shell.

### 5. Error boundary reset
- Wrap routes in `<ErrorBoundary resetKey={location.pathname}>`, and reset in `componentDidUpdate` when `resetKey` changes.
- "Try Again" calls an `onReset` prop that `App` wires to `refetch()`.
- Add `componentDidCatch` with `console.error`.
- Replace `minHeight: 100vh` with padding, so the view sits inside the layout.

### 6. Trailing-slash matching
Normalize with `pathname.replace(/\/+$/, '') || '/'` in both nav components.

## Risks / Trade-offs

- **A Name-cell button changes the table's look slightly.** Style it as inherited text with a focus ring only.
- **The minimum-votes cutoff hides some legitimately great niche films.** The hint label makes the rule visible.
