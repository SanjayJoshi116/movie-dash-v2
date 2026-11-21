## Context

Batch K (`BUG_BACKLOG.md` §6 rows 53, 56–61, 75) reviewed the shared utils and the `Movie` type. Findings re-checked on 2026-11-20:

- `statsHelpers.ts:118-124`: the unit is chosen from the raw `n`, then `toFixed` rounds. `999_600` → `(999.6).toFixed(0)` = `"1000"` → `$1000K` (B143).
- `statsHelpers.ts:88`: `hoverBackgroundColor: CHART_PALETTE` (B144). `statsHelpers.ts:98`: `CHART_PALETTE.map(c => c + 'cc')` (B145).
- `formatDate.ts:2`: `dateStr.split('-')` with no shape check, and it throws on `undefined` (B148; the `undefined` case is B129).
- `types/movie.ts:22`: typed `readonly (keyof Movie)[]`, so a missing key compiles (B149).
- `chartTheme.ts:27`: `parseInt(hex.slice(1), 16)`, so `#fff` → `0xfff` → `rgba(0, 15, 255, a)` (B150).
- `languages.ts:44`: `LANGUAGE_MAP[code.toLowerCase()] ?? code` on a plain object literal, so `'constructor'` hits `Object.prototype` (B151).
- Not fixed here: `groupByField` keys single-valued fields by raw value (B146), and the multi-valued branch splits names that contain commas (B147). See the proposal for why.

## Goals / Non-Goals

**Goals:** correct output from the shared helpers for every input they can get, compile-time protection for `CATALOGUE_COLUMNS`, and a unit-test runner for `src/utils` that CI runs.

**Non-Goals:** B146/B147 (above). Unit tests for `sanitizeFilters`/`clampFiltersToSpans`, the export formula guard and `usePersistedFilters` (the rest of B15). Those modules are owned by other changes, which can add tests now that the runner exists.

## Decisions

**D1: Revenue units (B143).** Walk the units from largest to smallest: `[1e9, 'B', 1], [1e6, 'M', 1], [1e3, 'K', 0]`. For the first unit with `n ≥ size`, compute `rounded = Number((n / size).toFixed(digits))`. If `rounded ≥ 1000` and a larger unit exists, use that unit instead. Below 1,000: `$${Math.round(n)}`, unless it rounds to 1000, in which case `$1K`. The existing `0`/negative/non-finite rules are unchanged.

**D2: Date format (B148).** `formatDateDDMMYYYY(dateStr: string | undefined)`: `/^(\d{4})-(\d{2})-(\d{2})$/` → `DD-MM-YYYY`; otherwise `dateStr ?? ''`. A timestamp such as `2020-05-12T00:00:00Z` is shown as-is rather than guessed at.

**D3: Column check (B149).**
```ts
export const CATALOGUE_COLUMNS = [ … ] as const satisfies readonly (keyof Movie)[];
type MissingColumn = Exclude<keyof Movie, (typeof CATALOGUE_COLUMNS)[number]>;
const _allColumnsListed: [MissingColumn] extends [never] ? true : never = true;
```
Callers that expect `readonly (keyof Movie)[]` accept the tuple. The Python `CATALOGUE_COLUMNS` equality test reads the TS file's string literals and is unaffected; check it during apply.

**D4: `withAlpha` (B150).** Match `/^#([0-9a-f]{3}|[0-9a-f]{6})$/i`. Expand a 3-digit colour by doubling each digit. Anything else throws `TypeError('withAlpha expects #RGB or #RRGGBB')`. *Alternative:* return the input unchanged. Rejected: a silent wrong colour is how this bug went unnoticed, and every input is a constant, so the throw shows up on first render in development.

**D5: Own-key language lookup (B151).** `const key = code.toLowerCase(); return Object.prototype.hasOwnProperty.call(LANGUAGE_MAP, key) ? LANGUAGE_MAP[key] : code;`. (`Object.hasOwn` was the first plan, but the root tsconfig's lib is ES2020, so it doesn't type-check; widening `lib` is out of scope.)

**D6: Unit-test runner (B15 part).** `tests/unit/*.test.ts` using `node:test` and `node:assert/strict`, run by `tsx --test` (the same runner as `test:server`, so no new dependency). `tsconfig.node.json` already includes `tests/` with Node types, so `npm run type-check` covers the tests. Playwright's default `testMatch` would pick up `*.test.ts` under `testDir: './tests'`, so add `testIgnore: ['unit/**']`. CI runs `npm run test:unit` right after `npm run test:server`. CLAUDE.md's test count list gets a "unit tests" entry.

**D7: Chart helpers (B144, B145).** Delete `hoverBackgroundColor`. `backgroundColor: CHART_PALETTE.map(c => withAlpha(c, 0.8))` (`0xcc` / 255 ≈ 0.8, same look).

## Risks / Trade-offs

- [The `withAlpha` throw could crash a page if a non-hex colour is added later] → Intended: it fails in development on first render, and the unit test pins the accepted formats.
- [`as const` changes the inferred type of `CATALOGUE_COLUMNS`] → It's still assignable to every current use. Type-check both projects during apply.
- [Revenue labels at unit boundaries change, e.g. `$1000K` → `$1.0M`] → Intended. The e2e revenue chip test derives its expectations from `formatRevenue`, so it follows.
