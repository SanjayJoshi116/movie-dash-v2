import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { matchesSearch } from '../src/utils/search';

/** A movie row as `/api/movies` returns it (every CSV column is a string). */
export type ApiMovie = Record<string, string>;

/**
 * Every spec imports `test` from here, not from '@playwright/test': it routes all `/api` traffic
 * through a guard that aborts anything that could mutate data or reach TMDB (any non-GET request,
 * and every `/api/tmdb/*` call) unless the test registered its own `page.route` mock for it.
 * Playwright runs the most recently registered matching handler first, so a test's mocks take
 * precedence and this guard only ever sees unmocked requests. A local run reads the developer's
 * real `src/movies.csv`, which must never be modified by e2e.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/**', (route) => {
      const req = route.request();
      if (req.method() !== 'GET' || new URL(req.url()).pathname.startsWith('/api/tmdb/')) {
        return route.abort('blockedbyclient');
      }
      return route.fallback();
    });
    await use(page);
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
  const item = option
    ? dropdown.locator('.ant-select-item-option').filter({ hasText: option }).first()
    : dropdown.locator('.ant-select-item-option').first();
  await item.click();
  await page.keyboard.press('Escape');
  // Report what the Select actually selected (its tag), not the option read before the click: the
  // virtual option list can scroll in between, so the click may land on a neighbouring row.
  const tag = page.locator('.ant-select').filter({ has: combobox }).locator('.ant-select-selection-item[title]').first();
  await expect(tag).toBeVisible();
  const picked = (await tag.getAttribute('title'))!;
  if (option) expect(picked).toContain(option);
  return picked;
}

/** Picks `option` in the (non-multiple) Select labelled `label`. */
export async function chooseOption(page: Page, label: string, option: string) {
  // A single Select's search input sits under its selection text, so click the Select itself.
  await page.locator('.ant-select').filter({ has: page.getByRole('combobox', { name: label }) }).click();
  await openDropdown(page).locator(`.ant-select-item-option[title="${option}"]`).click();
  await expect(openDropdown(page)).toHaveCount(0);
}

/** Reads the whole catalogue straight from the API (not routed, so never mocked). */
export async function fetchMovies(page: Page): Promise<ApiMovie[]> {
  const res = await page.request.get('/api/movies');
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/** The "x–y of N movies" pagination total of the table/grid on screen. */
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

/** Parsed release years of `movies` (unparseable ones skipped) and their min/max. */
export function yearSpan(movies: ApiMovie[]): { years: number[]; yearMin: number; yearMax: number } {
  const years = movies.map((m) => parseInt(m['Release Year'], 10)).filter((y) => !isNaN(y));
  return { years, yearMin: Math.min(...years), yearMax: Math.max(...years) };
}
