import { test as base, expect, type Page, type Locator, type APIRequestContext, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { matchesSearch } from '../src/utils/search';
import { getLanguageName } from '../src/utils/languages';
export { STORAGE_KEY as FILTERS_STORAGE_KEY } from '../src/hooks/usePersistedFilters';

/** A movie row as `/api/movies` returns it (every CSV column is a string). */
export type ApiMovie = Record<string, string>;

/** Aborts anything that could mutate data or reach TMDB: any non-GET request and every `/api/tmdb/*` call. */
function writeGuard(route: Route) {
  const req = route.request();
  if (req.method() !== 'GET' || new URL(req.url()).pathname.startsWith('/api/tmdb/')) {
    return route.abort('blockedbyclient');
  }
  return route.fallback();
}

const NO_WRITES = 'e2e must not write the catalogue: mock the request with page.route instead';

/** The `request` fixture with every write method refused; `get`/`head` pass through. */
function getOnly(request: APIRequestContext): APIRequestContext {
  const blocked = new Set(['post', 'put', 'patch', 'delete', 'fetch']);
  return new Proxy(request, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && blocked.has(prop)) return () => { throw new Error(NO_WRITES); };
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/**
 * Every spec imports `test` from here, not from '@playwright/test'. The guard is on the browser
 * *context*, so it covers `page` and any other page the test opens; a test's own `page.route`
 * mocks run first (page routes take precedence over context routes, and `route.fallback()` hands
 * unhandled requests on to it), so the guard only ever sees unmocked requests. The `request`
 * fixture is GET-only. `page.request` shares the context's API client but isn't routed, so lint
 * bans write calls on any `.request` and new browser contexts in tests/. A local run reads the
 * developer's real `src/movies.csv`, which must never be modified by e2e.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('**/api/**', writeGuard);
    await use(context);
  },
  request: async ({ request }, use) => {
    await use(getOnly(request));
  },
});

export { expect };

// Resolve the Movies search box by its accessible name, not its placeholder copy,
// so wording tweaks to the placeholder can't break the suite.
export function searchBox(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Search movies' });
}

/**
 * The visible pane of the Stats tabs. Ant keeps inactive panes mounted but `aria-hidden`, so the
 * role query (which skips hidden elements) matches only the active one — and, unlike a class
 * selector, survived antd 6 renaming `.ant-tabs-tabpane*` to `.ant-tabs-content*`.
 */
export function activeTabPane(page: Page): Locator {
  return page.getByRole('tabpanel');
}

/** A result row in the Add Movie modal's "Search results" list (all rows without `text`). */
export function searchResult(modal: Locator, text?: string): Locator {
  const items = modal.getByRole('list', { name: 'Search results' }).getByRole('listitem');
  return text === undefined ? items : items.filter({ hasText: text });
}

/** Clicks the Movies page's Export CSV and returns the downloaded file's text. */
export async function exportCsv(page: Page): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/i }).click();
  return readFileSync(await (await download).path(), 'utf8');
}

/**
 * An active-filter chip on the Movies page, found through ActiveFilters' named list rather than
 * antd's `.ant-tag` class (the drawer's vote tag is an `.ant-tag` too). `text` is a substring of the label.
 */
export function filterChip(page: Page, text: string): Locator {
  return page.getByRole('list', { name: 'Active filters' }).getByRole('listitem').filter({ hasText: text });
}

export async function waitForTable(page: Page) {
  await page.waitForSelector('.ant-table-row', { timeout: 30000 });
}

export async function waitForStats(page: Page) {
  await activeTabPane(page).waitFor({ timeout: 30000 });
}

export async function openFiltersDrawer(page: Page) {
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
}

export async function closeFiltersDrawer(page: Page) {
  await page.locator('.ant-drawer-open .ant-drawer-close').click();
  await expect(page.locator('.ant-drawer-open')).toHaveCount(0);
}

/** The currently open Select dropdown (closed ones stay in the DOM, hidden). */
export function openDropdown(page: Page): Locator {
  return page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
}

/**
 * Opens the filters-drawer Select labelled `label` and picks `option` (by its label), or the first
 * option when omitted. Closes the dropdown again and returns the picked option's label.
 */
export async function selectInDrawer(page: Page, label: string, option?: string): Promise<string> {
  const combobox = page.getByRole('combobox', { name: label });
  await combobox.click();
  const dropdown = openDropdown(page);
  // Exact title match: a substring filter would let "Drama" pick "Docudrama".
  const item = option
    ? dropdown.getByTitle(option, { exact: true })
    : dropdown.locator('.ant-select-item-option').first();
  // The option list is virtual (only rows in view exist), so arrow down until the option renders.
  // (Typing would also work now that Language searches its labels, B177; arrowing keeps every Select alike.)
  await expect(dropdown).toBeVisible();
  for (let i = 0; option && i < 300 && !(await item.isVisible()); i++) await page.keyboard.press('ArrowDown');
  await item.click();
  await page.keyboard.press('Escape');
  // Report what the Select actually selected (its tag), not the option read before the click: the
  // virtual option list can scroll in between, so the click may land on a neighbouring row.
  const tag = page.locator('.ant-select').filter({ has: combobox }).locator('.ant-select-selection-item[title]').first();
  await expect(tag).toBeVisible();
  const picked = (await tag.getAttribute('title'))!;
  if (option) expect(picked).toBe(option);
  return picked;
}

/** Picks `option` in the (non-multiple) Select labelled `label`. */
export async function chooseOption(page: Page, label: string, option: string) {
  // A single Select's search input sits under its selection text, so click the Select itself.
  await page.locator('.ant-select').filter({ has: page.getByRole('combobox', { name: label }) }).click();
  await openDropdown(page).getByTitle(option, { exact: true }).click();
  await expect(openDropdown(page)).toHaveCount(0);
}

/** Clicks the open drawer's Delete and confirms it in the Popconfirm. */
export async function confirmDrawerDelete(page: Page) {
  await page.locator('.ant-drawer-open').getByRole('button', { name: 'Delete' }).click();
  await page.locator('.ant-popconfirm').getByRole('button', { name: 'Delete' }).click();
}

/** The canvas of a Stats chart, by its ChartBlock heading in the active tab. */
export function chartCanvas(page: Page, title: string): Locator {
  return activeTabPane(page).getByRole('heading', { name: title, exact: true }).locator('xpath=../..').locator('canvas');
}

/** The canvas of a Dashboard mini chart, by its card title. */
export function dashboardChartCanvas(page: Page, title: string): Locator {
  return page.getByText(title, { exact: true }).locator('xpath=..').locator('canvas');
}

/** Language codes grouped by the display name the UI shows (several codes can share one name, B146). */
export function codesByLanguageName(movies: ApiMovie[]): Map<string, Set<string>> {
  const byName = new Map<string, Set<string>>();
  for (const m of movies) {
    if (!m.Language) continue;
    const name = getLanguageName(m.Language);
    byName.set(name, (byName.get(name) ?? new Set()).add(m.Language));
  }
  return byName;
}

/** Reads the whole catalogue straight from the API (not routed, so never mocked). */
export async function fetchMovies(page: Page): Promise<ApiMovie[]> {
  const res = await page.request.get('/api/movies');
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/**
 * The Movies table's body cells under the column headed `header` (exact text), found through the
 * header row rather than a hard-coded `td:nth-child(n)`, so reordering columns or hiding them at a
 * breakpoint can't silently point a test at the wrong one. Fails if the column isn't shown.
 */
export async function columnCells(page: Page, header: string): Promise<Locator> {
  const headers = (await page.locator('.ant-table-thead').getByRole('columnheader').allInnerTexts()).map((t) => t.trim());
  const index = headers.indexOf(header);
  expect(index, `column "${header}" in [${headers.join(', ')}]`).toBeGreaterThanOrEqual(0);
  return page.locator(`.ant-table-row td:nth-child(${index + 1})`);
}

/** The pagination "a–b of n movies" text (Movies table and grid). */
export function paginationTotal(page: Page): Locator {
  return page.locator('.ant-pagination-total-text');
}

/** Picks `pageSize` (e.g. 5 → "5 / page") in the pagination size changer and waits for it to apply. */
export async function setPageSize(page: Page, pageSize: number) {
  const changer = page.locator('.ant-pagination-options .ant-select');
  await changer.click();
  await openDropdown(page).getByText(`${pageSize} / page`, { exact: true }).click();
  await expect(changer).toContainText(`${pageSize} / page`);
}

export async function movieTotal(page: Page): Promise<number> {
  const text = await paginationTotal(page).innerText();
  const m = text.match(/of (\d+) movies/);
  if (!m) throw new Error(`unexpected total text: ${text}`);
  return Number(m[1]);
}

/** Web-first: waits until the pagination total reads `of n movies`. */
export async function expectTotal(page: Page, n: number) {
  await expect(paginationTotal(page)).toHaveText(new RegExp(`of ${n} movies$`));
}

/** A complete synthetic catalogue row; `i` makes IDs/names unique. */
export function makeMovie(i: number, overrides: Partial<ApiMovie> = {}): ApiMovie {
  return {
    'Movie ID': String(900000 + i),
    Name: `Mock Movie ${String(i).padStart(2, '0')}`,
    Language: 'en',
    Runtime: String(90 + i),
    'Release Year': String(2000 + i),
    Genres: 'Drama',
    Director: `Director ${i}`,
    'Actors/Actresses': `Actor ${i}`,
    'Production Company': 'Mock Studios',
    'Production Country': 'United States of America',
    'Box Office Revenue': String(1000000 * i),
    Budget: String(500000 * i),
    'Popularity Score': String(10 + i),
    'Vote Average': (5 + (i % 5) * 0.5).toFixed(1),
    'Vote Count': String(100 * i),
    'Poster URL': '',
    'Release Date': `${2000 + i}-01-15`,
    ...overrides,
  };
}

/**
 * Serves `GET /api/movies` from `rows` instead of the real catalogue. Returns a setter so a test
 * can change what the next fetch (e.g. the refetch after an add/delete) returns.
 */
export async function mockMovies(page: Page, rows: ApiMovie[]): Promise<(next: ApiMovie[]) => void> {
  let current = rows;
  await page.route('**/api/movies', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: current, headers: { 'Cache-Control': 'no-store' } });
  });
  return (next) => { current = next; };
}

/** How many movies the Movies page search should show for `term` (the page's own matcher). */
export function searchMatchCount(movies: ApiMovie[], term: string): number {
  return movies.filter((m) => matchesSearch(m, term)).length;
}

/**
 * Parsed release years of `movies` (unparseable ones skipped) and their min/max, or `null` when no
 * movie has a year. One loop, no spread into Math.min/max (that throws on a very large catalogue).
 */
export function yearSpan(movies: ApiMovie[]): { years: number[]; yearMin: number; yearMax: number } | null {
  const years: number[] = [];
  let yearMin = Infinity, yearMax = -Infinity;
  for (const m of movies) {
    const y = parseInt(m['Release Year'], 10);
    if (isNaN(y)) continue;
    years.push(y);
    if (y < yearMin) yearMin = y;
    if (y > yearMax) yearMax = y;
  }
  return years.length ? { years, yearMin, yearMax } : null;
}

/** Why a year-range test can't run on this dataset (the Stats slider is disabled below two years). */
export const SINGLE_YEAR_SKIP = 'dataset spans fewer than two years — the range slider is disabled';
