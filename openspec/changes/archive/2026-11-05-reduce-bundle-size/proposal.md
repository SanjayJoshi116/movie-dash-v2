## Why

The production build warns about a 987 kB `vendor-antd` chunk (audit C11). The landing page currently downloads about 514 kB of gzipped JavaScript, roughly 1.6 MB minified:
- `index` 86 kB
- `vendor-antd` 310 kB
- `vendor-charts` 69 kB
- `vendor-motion` 37 kB
- `vendor-react` 13 kB

Two configuration choices cause most of it:
- `vite.config.ts`'s `manualChunks` pushes all of antd and `@ant-design/icons` into one chunk that every route loads up front. That cancels the per-component tree-shaking and the route-level `React.lazy` splitting the app already has. Table, Drawer, Slider, Modal and Tabs ship on the Dashboard even though only Movies and Stats use them.
- `framer-motion` (112 kB minified) is used only for two hover "lift" effects (`StatCard`, `MovieCardGrid`) that CSS can do.

## What Changes

- **Per-route antd.** Stop forcing antd and icons into one chunk, so each route's chunk carries only the components it imports. React and Chart.js keep their own stable vendor chunks for caching.
- **Drop `framer-motion`.** Replace the two `whileHover` springs with a CSS transform transition, and remove the dependency.
- **Bundle budget.** Add a size-budget check to the build, run in CI:
  - the landing route's initial JavaScript must stay within budget
  - no chunk may exceed 500 kB minified, which removes the Vite warning
- **Docs.** Record the budget and the chunking rationale in CLAUDE.md, and update the README's "Code splitting" line.

## Capabilities

### New Capabilities
- `frontend-performance`: load-size budgets for the production web build, and the guarantee that they're enforced automatically.

### Modified Capabilities
<!-- None -->

## Impact

- `vite.config.ts`: the `manualChunks` strategy. `build.manifest` is enabled for the budget check.
- `src/components/StatCard.tsx`, `src/components/MovieCardGrid.tsx`, `src/index.css`: CSS hover lift.
- `package.json`: remove `framer-motion`; add a `check:bundle` script (a small Node script using built-in `zlib`, so no new dependency).
- `.github/workflows/ci.yml`: a budget step after build.
- **Sequencing:** if `upgrade-major-deps` moves to Vite 8 (Rolldown), the chunking config syntax changes. Whichever change lands second adapts the config, and the budget check guards both.
