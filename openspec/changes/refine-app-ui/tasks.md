## 1. Foundation tokens

- [x] 1.1 Update `src/index.css` `:root` (dark) token values: `--glass-border` → `rgba(255,255,255,0.08)`, `--glass-shadow` → `0 4px 20px rgba(0,0,0,0.28)`.
- [x] 1.2 Update `src/index.css` `[data-theme="light"]` token values: `--glass-border` → `rgba(129,140,248,0.22)`, `--glass-shadow` → `0 2px 16px rgba(100,100,200,0.14)`.
- [x] 1.3 Refactor `getCardStyle` in `src/utils/chartTheme.ts` to build its style object from `var(--glass-bg)` / `var(--glass-border)` / `var(--glass-shadow)` instead of hardcoded per-theme `rgba(...)` literals (keep the `isDark` param for call-site compatibility).
- [x] 1.4 Replace `CHART_PALETTE` in `src/utils/chartTheme.ts` with the 8-color muted set from design.md.
- [x] 1.5 Add `SPACING` and `FONT_SIZE` constant objects to `src/utils/chartTheme.ts` per design.md.
- [x] 1.6 Run `npm run build` to confirm the token/palette refactor alone doesn't break typecheck (no visible changes expected yet beyond tuned shadow/border/palette).

## 2. App shell

- [x] 2.1 Update `src/components/StatCard.tsx` hero gradient/border alpha (`${color}26` → `${color}14`, `${color}55` → `${color}33`).
- [x] 2.2 Update `src/components/Sidebar.tsx` to use `SPACING`/`FONT_SIZE` constants in place of repeated raw padding/gap/font-size numbers. (Only `padding` and `marginTop` matched the scale exactly; `gap: 10` and the 17/22px font sizes don't correspond to a scale step and were left as-is to avoid an undocumented visual nudge.)
- [x] 2.3 Update `src/components/TopBar.tsx` to use `SPACING`/`FONT_SIZE` constants in place of repeated raw numbers.
- [x] 2.4 `src/components/BottomNav.tsx` reviewed — none of its raw numbers (gap:2, padding "10px 0", fontSize 20/11) exactly match a `SPACING`/`FONT_SIZE` step, so no changes made (same reasoning as 2.2).
- [ ] 2.5 Manual check: toggle light/dark theme with Sidebar/TopBar visible, confirm calmer border/shadow and no layout shift. **Not performed — no browser tooling available in this session; needs manual verification.**

## 3. Dashboard page

- [x] 3.1 Update `src/pages/Dashboard.tsx`'s `HighlightCard`, `MiniChartCard`, and `CtaCard` to use `SPACING`/`FONT_SIZE` constants in place of their current raw padding/gap/font-size numbers. Also applied to the outer page padding, subtitle margin, `Row` gutters, and the Recent Releases card (same rationale as `DashboardSection.tsx`).
- [x] 3.2 Verified: `StatCard`'s existing `hero` prop already gives Total Movies a larger value font (40 vs 28), bigger icon, gradient background, and its own half-width column — independent of the 2.1 alpha tuning, this hierarchy is preserved (still distinct border/gradient at the tuned 8%/20% alphas vs. 0% for secondary cards). No Dashboard.tsx change needed beyond what 2.1 already did.
- [x] 3.3 `DashboardSection` spacing (`marginBottom`, header `gap`) now sourced from `SPACING`; section-to-section gap (32px) intentionally left outside the token scale since it's a one-off larger-than-`xxl` separator, not a repeated value.
- [x] 3.4 Confirmed: the `movies.length === 0` branch structure is untouched — only its `padding` value was re-expressed via `SPACING.xxl` (same 24px), logic unchanged.

## 4. Verification

- [ ] 4.1 Manual QA: both themes × desktop and mobile (`BottomNav`) breakpoints, on Dashboard and shell. **Not performed — no browser tooling available in this agent session; needs manual verification by a human.**
- [ ] 4.2 Manual QA: click through all Dashboard drill-down paths (genre chart, rating-bucket chart, year-trend chart, highlight cards, recent-releases list, total box office stat) and confirm each still navigates/opens as before. **Not performed — same reason as 4.1.**
- [x] 4.3 Run `npm run lint` — clean, no errors/warnings.
- [x] 4.4 Run `npm run build` — passes (`tsc --noEmit && vite build`), run 3 times across the session.
- [x] 4.5 Run `npm run test:e2e` — 45 passed, 9 failed, 2 skipped. **All 9 failures are pre-existing and unrelated to this change**: `Movies.tsx:172`'s search placeholder (`"...director, actor, year, language, country…"`, added in commit `a4a1a40` before this change) no longer matches the shorter placeholder `tests/app.spec.ts` still expects (`"...director, actor…"`), so every `getByPlaceholder(...)` call times out. `git status` confirms this change never touched `Movies.tsx` or `tests/app.spec.ts`. All Dashboard/shell-related tests passed — no regression from this restyle. Fixing the placeholder/test mismatch is out of scope here (design.md excludes `Movies.tsx`) and should be filed as a separate fix.
