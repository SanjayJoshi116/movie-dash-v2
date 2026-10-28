# Code Review Findings — 2026-10-15

Review of the uncommitted archive of the `refine-app-ui` OpenSpec change (`openspec/changes/archive/2026-10-08-refine-app-ui/`, plus new main specs `openspec/specs/design-system/` and `openspec/specs/dashboard-layout/`). No application code changed in the diff; findings are spec-vs-code gaps and two real UI bugs surfaced along the way. Each finding was re-checked against the code after the review. Line numbers are approximate pointers — re-check before editing.

**Status (2026-10-28): R1–R6 resolved, R7 no action.** R1 chart colors migrated to `CHART_PALETTE` + `CHART_PRIMARY`/`CHART_POSITIVE`/`CHART_NEGATIVE`/`withAlpha` (`chartTheme.ts`), stat-card accents scoped out of the spec; R2 single color + `groupByField`; R3 scenario reworded; R4 provenance note in archived `tasks.md`; R5 compact doughnut legend + 280px genre card below `md`; R6 scenarios added. Also: Dashboard genre doughnut now uses `topNWithOther` (7 + Other), `StatCard` spreads `getCardStyle()`.

Severity: **High** = broken today / data loss / CI red · **Med** = wrong behavior users will hit · **Low** = polish, a11y, edge cases.

**Root cause of most findings:** `refine-app-ui`'s proposal scoped the work to the Dashboard + app shell ("Not affected: `Stats.tsx`…"), but the main specs promoted at archive time are written app-wide ("every chart on every page", "every card-style container … or navigation panel"). The specs over-promise relative to what the change did.

---

## 1. Spec vs. code gaps

### Medium
- **R1 — Shared palette not used everywhere, including the Dashboard itself.** `design-system/spec.md` (~line 22) requires one shared muted palette for every chart. Hardcoded bright hex colors remain in `PeopleTab.tsx` (31/40/65/89), `RatingsTab.tsx` (33/56/78–81/103–104/123–124), `RuntimeTab.tsx` (37/55/76), `BoxOfficeTab.tsx` (27/43/71/89/110), `OverviewTab.tsx` (129–130), and on the Dashboard: trend line `#818cf8` (`Dashboard.tsx:172`) and rating bars `#34d399` (`:193`) render next to the muted genre doughnut. Stat-card accent colors (`Dashboard.tsx:248–258`, `OverviewTab.tsx:155–200`) are also off-palette, though they're arguably a separate concern from chart colors. *Decision needed:* narrow the spec, or migrate. *If migrating:* `chartTheme.ts` needs two concepts the palette doesn't cover yet — a default single-series color (e.g. `CHART_PALETTE[0]`) and a semantic positive/negative pair (BoxOffice profit/loss bars, line 89) — otherwise new charts keep hardcoding colors.

### Low
- **R3 — Shell scenario claims a shared corner radius that shouldn't exist.** `design-system/spec.md` (~line 47), "Sidebar and dashboard card share surface treatment", requires the same border/corner radius/elevation. `Sidebar.tsx:53` (`borderRight`), `TopBar.tsx:21` (`borderBottom`), `BottomNav.tsx:30` (`borderTop`) are full-bleed edge panels — single-edge border, no radius is correct. They already share `--glass-border`/shadow tokens. *Fix:* reword the scenario to "shared border/shadow tokens" and drop "corner radius" (spec fix, not code).
- **R6 — Dashboard drill-down requirement only partly covered by scenarios.** `dashboard-layout/spec.md` (~line 34) lists year-trend/genre/rating chart drill-downs, but scenarios only cover the genre chart and highlight cards. Rating bucket (relies on `bucketToRange` inclusive `[min, max − step]`), year trend, Recent Releases, and Total Box Office → `/stats?tab=boxoffice` have none. The archived task 4.2 verified all 8 paths, so the evidence exists — only the scenarios are missing. *Fix:* add scenarios.

## 2. UI bugs

### Medium
- **R2 — Explore genre bar repeats colors.** `ExploreTab.tsx:30–32` shows the top 20 genres with `backgroundColor: CHART_PALETTE` (8 colors), so Chart.js cycles: bars 1/9/17 share a color. It's a single-series ranked bar, where color encodes nothing. *Fix:* a single color (rather than `topNWithOther`, which would hide a useful top-20 ranking). It also re-implements the comma-split genre counting that `groupByField` + `MULTI_VALUED_FIELDS` already provide.
- **R5 — Mobile Genre doughnut legend clipped.** On a 390px viewport the second legend row of the Dashboard "Genre Breakdown" card is cut off by the fixed `MiniChartCard` height (`Dashboard.tsx:92–95`, `miniChartHeight`). It was found during `refine-app-ui` task 4.1 QA and marked "pre-existing, out of scope", and this file is its only record outside that archived task list. Cause not yet confirmed (fixed height vs. legend position/size at narrow widths).

## 3. Record-keeping

### Low
- **R4 — Archived `tasks.md` was edited during the move.** Items 2.5/4.1/4.2 changed from `[ ] Not performed` to `[x] Done via Playwright …` at archive time; the rest of the archive is byte-identical. Git shows the move as delete + untracked add, so the edit won't stand out as a content change in review. The cited evidence (a gitignored `tests/*.tmp.spec.ts`) no longer exists. The claims are specific and plausible — this is a traceability issue. *Fix:* commit the move and the task edits as separate commits, or add a dated note.
- **R7 — "56/56 passed" vs. 59 current tests.** Task 4.5's addendum is a dated record, accurate when written. **No action.**

---

## Suggested grouping

```
 ┌─ spec wording fix (docs only) ─┐   R3, R6 (+ R1 if narrowing)
 ├─ unify-chart-colors ───────────┤   R1, R2, R5
 └─ archive commit hygiene ───────┘   R4
```
