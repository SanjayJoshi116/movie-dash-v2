## Context

The review findings are in proposal.md (Why). All four files are config. The only runtime-adjacent piece is `scripts/check-bundle.mjs`, which CI runs after `build`. Facts the decisions below rely on:
- ESLint is 10.14 with flat config, and it doesn't read `.gitignore`.
- typescript-eslint is 8.72; its `config()` helper is deprecated in favour of ESLint core's `defineConfig()`.
- `tests/app.spec.ts` imports only types from `@playwright/test`; `tests/helpers.ts` is the one legitimate runtime importer.
- A probe tsconfig over `tests/`, `playwright.config.ts` and `vite.config.ts` type-checks with 0 errors today.

## Goals / Non-Goals

**Goals:** each guard fails loudly in CI or locally, with no new dependencies and no new CI steps.

**Non-Goals:**
- B75, the shared rate-limit bucket behind the dev proxy. It has never been seen to fail, and raising the dev limit would also loosen `dev:lan`. Deferred and logged open.
- Changing `dev:lan` behaviour. The proxy reaching the API is the accepted `harden-server-entry` trade-off; only the docs change.

## Decisions

### D1: Import guard via `@typescript-eslint/no-restricted-imports`
The rule is scoped to `tests/**/*.spec.ts` (and `tests/**/*.tmp.spec.ts`, which matches the same glob). It restricts the path `@playwright/test` with `allowTypeImports: true` and a message pointing to `tests/helpers.ts`. `tests/helpers.ts` isn't matched by the glob, so it can keep importing.
- Alternative: `no-restricted-imports` from ESLint core. Rejected: it has no type-only exemption, so `app.spec.ts`'s `import type` would fail.

### D2: `waitForTimeout` ban via `no-restricted-properties`
The ban is `{ property: 'waitForTimeout', message: 'Use web-first assertions' }` on `tests/**/*.ts`. It is syntactic, which is enough for `page.waitForTimeout(...)` and `frame.waitForTimeout(...)`.

### D3: `tsconfig.node.json` checked by `build` and `type-check`
- It sets `types: ["node"]`, `module`/`moduleResolution: "bundler"`, `noEmit`, `strict`, and `allowImportingTsExtensions` (specs import `../src/utils/*`). Its `include` is `tests`, `playwright.config.ts` and `vite.config.ts`.
- `build` becomes `tsc --noEmit && tsc -p tsconfig.node.json && vite build`, and `type-check` checks both.
- This uses a separate file, not a wider root `include`, because the root config has `types: ["vite/client"]` (DOM) and the configs need Node types.
- `@types/node` is already a devDependency, through the server tsconfig.

### D4: `forbidOnly: !!process.env.CI`
Local `test.only` stays usable for debugging.

### D5: `strictPort: true` in `server`
`strictPort: true` goes in `server`. Playwright's webServer then sees `npm run dev` exit, and its error names the port. The gotcha's documented workaround (a throwaway config on port 3100 with `--strictPort`) is unaffected.

### D6: Lint script and ignores
- The script becomes `eslint . --max-warnings 0`.
- `ignores` gains `'**/*.tmp.*'`, which covers `*.tmp.mjs`, `*.tmp.spec.ts` and `*.tmp.config.ts` from `.gitignore`, plus `__pycache__`.
- `tseslint.config(...)` becomes `defineConfig(...)` from `eslint/config`, with the same arguments.
- Because the tmp specs are now ignored, D1 doesn't guard them. That is acceptable: they are gitignored, short-lived, and CLAUDE.md already tells authors to mock mutations in them.

### D7: Budget gzip level
`check-bundle.mjs` uses `zlib.gzipSync(buf)`, zlib's default level 6, which is what `compression()` uses. Expect the reported number to rise by roughly 1–2 %, still under 400 kB (about 362 today). The task re-runs `check:bundle` and records the new figure in the docs.

## Risks / Trade-offs

- [Level-6 numbers sit closer to the 400 kB budget] → Measured in tasks. Headroom is about 9 % today.
- [`--max-warnings 0` blocks a PR over a cosmetic warning] → Intended. The count is 0 now.
- [`strictPort` fails `npm run dev` when 3000 is busy, where before it moved quietly] → Intended. The README troubleshooting text mentions it.

## Migration Plan

Config-only. Roll back by reverting the commit.
