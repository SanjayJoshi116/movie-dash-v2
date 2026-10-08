## Context

See proposal.md, Why. Current setup:
- `App.tsx` imports `Dashboard` eagerly and `React.lazy`-loads `Movies` and `Stats`.
- `vite.config.ts` `manualChunks` object form: `vendor-react`, `vendor-antd` (antd plus icons), `vendor-charts`, `vendor-motion`.
- antd v5 ships ESM and tree-shakes per component. The single forced chunk is what defeats that.
- The Dashboard uses Chart.js mini charts, so `vendor-charts` is legitimately part of the initial load.

## Goals / Non-Goals

**Goals:**
- Initial JS ≤ 400 kB gzip, down from about 514.
- No chunk over 500 kB minified.
- An automated guard against regressions.

**Non-Goals:**
- Lazy-loading the Dashboard itself. It's the landing route, so lazy-loading would only add a waterfall.
- Replacing antd or Chart.js.
- Image or CSS optimization.

## Decisions

### 1. Chunking: keep stable vendor chunks only for framework libraries
Switch `manualChunks` to a function:
- `react`, `react-dom`, `react-router`, `scheduler` → `vendor-react`
- `chart.js`, `react-chartjs-2`, `chartjs-chart-matrix` → `vendor-charts`
- everything else (antd, `@ant-design/*`, `rc-*`, `@rc-component/*`) → `undefined`, so Rollup places it in whichever route chunks use it, with shared pieces split out automatically

*Alternative:* keep `vendor-antd` and split it into "core" and "heavy" by hand. Rejected because it's brittle: it depends on antd's internal module graph and goes stale with each upgrade.

**Budget estimate:** about 300 kB gzip. Check it with the budget script; the threshold is the spec's 400 kB.

### 2. CSS hover lift instead of framer-motion
- Add a `.lift-on-hover` class in `src/index.css`:
  - `transition: transform 180ms cubic-bezier(.34,1.56,.64,1)`, an overshoot curve that approximates the spring
  - `:hover { transform: translateY(-2px) scale(var(--lift-scale, 1.02)) }`
- `StatCard` sets `--lift-scale: 1.03` inline, and `MovieCardGrid` uses the default.
- This doesn't conflict with the "no `@media` in `src/`" rule, which covers responsive layout. No media query is needed here.

*Alternative:* framer-motion `LazyMotion` with `domAnimation`. That's still about 15–20 kB for two hover effects, so CSS is simpler.

### 3. Budget script
- Enable `build.manifest: true`.
- `scripts/check-bundle.mjs` reads `dist/.vite/manifest.json`, starts from the `index.html` entry, and walks `imports` (static only, never `dynamicImports`) to collect the landing route's chunks.
- It gzips each one with `zlib.gzipSync`, sums them, and compares the total with `BUDGET_INITIAL_GZIP_KB = 400`.
- It also fails if any `.js` in `dist/assets` is over 500 kB raw.
- It prints a sorted table of chunks for diagnosis.
- Add the script to `package.json` as `check:bundle`, and to CI after `npm run build`.

Set `build.chunkSizeWarningLimit` to 500 explicitly, so the Vite warning and the script agree.

## Risks / Trade-offs

- **Route chunks duplicate antd internals, or there are more HTTP requests.** Rollup hoists shared modules into common chunks automatically. HTTP/2 makes the number of requests cheap. The budget check catches regressions.
- **Long-term caching is weaker,** because antd code now changes hash with app code. That's acceptable for a personal app. The React and Chart.js chunks stay stable.
- **The CSS easing curve isn't identical to the spring.** Compare it visually; tune the duration and curve.
- **Reduced-motion users still get the hover transform, the same as today.** Honouring `prefers-reduced-motion` would need an `@media` rule or a `matchMedia` check. That's a separate accessibility decision, and out of scope here.

## Migration Plan

Removing `framer-motion` is a plain dependency removal. To roll back, revert `vite.config.ts` and restore the package.
