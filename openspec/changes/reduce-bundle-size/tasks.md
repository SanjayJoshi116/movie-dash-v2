## 1. Baseline and budget tooling

- [ ] 1.1 Enable `build.manifest: true` and `build.chunkSizeWarningLimit: 500` in `vite.config.ts`
- [ ] 1.2 Write `scripts/check-bundle.mjs`. It walks the static imports from the entry manifest, gzips and sums the chunks, and checks:
  - total ≤ 400 kB gzip
  - no chunk > 500 kB raw

  It prints a sorted table.
- [ ] 1.3 Add a `check:bundle` script; record the baseline numbers (expected failure at about 514 kB) in the PR description

## 2. Chunking

- [ ] 2.1 Replace the `manualChunks` object with a function that keeps only `vendor-react` and `vendor-charts`
- [ ] 2.2 Rebuild and confirm the Movies-only components (Table, Drawer, Slider, Modal) are absent from the landing route's static import graph

## 3. Remove framer-motion

- [ ] 3.1 Add the `.lift-on-hover` class (transform transition with an overshoot easing) to `src/index.css`
- [ ] 3.2 `StatCard`: replace `motion(Card)` with `Card` plus `className="lift-on-hover"` and `--lift-scale: 1.03`
- [ ] 3.3 `MovieCardGrid`: same, with the default scale
- [ ] 3.4 Uninstall `framer-motion`; confirm `grep -r framer-motion src` returns nothing

## 4. CI and docs

- [ ] 4.1 `.github/workflows/ci.yml`: run `npm run check:bundle` after `npm run build`
- [ ] 4.2 Update CLAUDE.md: the chunking rationale (why antd isn't force-chunked), the budget and script, and the CSS hover lift that replaces framer-motion. Remove framer-motion from the Stack line
- [ ] 4.3 Update the README Performance section ("Code splitting" and the budget)

## 5. Verification

- [ ] 5.1 `npm run build` prints no chunk-size warning, and `npm run check:bundle` passes
- [ ] 5.2 Visually check the hover lift on stat cards and grid cards in both themes
- [ ] 5.3 Confirm `npm run lint` passes. No local e2e run: chunking and the CSS hover swap don't change behaviour or selectors (grid card tests use `.ant-card[role="button"]`, unaffected); CI runs the e2e suite on push
