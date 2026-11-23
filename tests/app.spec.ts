import { readFileSync } from 'node:fs';
import type { Page, Locator } from '@playwright/test';
import {
  test,
  expect,
  type ApiMovie,
  searchBox,
  activeTabPane,
  columnCells,
  filterChip,
  searchResult,
  exportCsv,
  waitForTable,
  waitForStats,
  openFiltersDrawer,
  closeFiltersDrawer,
  openDropdown,
  confirmDrawerDelete,
  chartCanvas,
  dashboardChartCanvas,
  codesByLanguageName,
  FILTERS_STORAGE_KEY,
  selectInDrawer,
  chooseOption,
  fetchMovies,
  movieTotal,
  expectTotal,
  makeMovie,
  mockDelete,
  mockMovies,
  searchMatchCount,
  yearSpan,
  SINGLE_YEAR_SKIP,
  paginationTotal,
  setPageSize,
} from './helpers';
import { getLanguageName } from '../src/utils/languages';
import { matchesSearch } from '../src/utils/search';
import { voteColor } from '../src/utils/vote';
import { slugify } from '../src/utils/slugify';
import { formatRevenue, countIntoBuckets, parseVote, splitNames, type Bucket } from '../src/utils/statsHelpers';
import { RATING_BUCKETS, VOTE_BUCKETS } from '../src/utils/chartBuckets';

/** Asserts the first two `names` are in localeCompare order (dir 1 = A–Z, -1 = Z–A), compared in the browser. */
async function expectFirstTwoOrdered(page: Page, names: Locator, dir: 1 | -1) {
  const [a, b] = await names.evaluateAll((els) => els.slice(0, 2).map((e) => e.textContent ?? ''));
  const cmp = await page.evaluate(([x, y]) => x.localeCompare(y), [a, b] as const);
  expect(dir * cmp, `"${a}" vs "${b}"`).toBeLessThanOrEqual(0);
}

/**
 * Chart.js draws tooltips and legends on the canvas, so they aren't in the DOM. This init script
 * records every `fillText` call with its canvas; `canvasTexts` reads them back for one canvas.
 */
type CanvasTextWindow = Window & { __canvasTexts: { c: HTMLCanvasElement; t: string }[] };

async function recordCanvasText(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as CanvasTextWindow;
    w.__canvasTexts = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text: string, x: number, y: number, maxWidth?: number) {
      w.__canvasTexts.push({ c: this.canvas, t: String(text) });
      return maxWidth === undefined ? orig.call(this, text, x, y) : orig.call(this, text, x, y, maxWidth);
    };
  });
}

function canvasTexts(canvas: Locator): Promise<string[]> {
  return canvas.evaluate((c) => (window as unknown as CanvasTextWindow)
    .__canvasTexts.filter((e) => e.c === c).map((e) => e.t));
}

/** One movie per year from `from` to `to`, released on 1 March. */
const yearRows = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) =>
  makeMovie(i + 1, { 'Release Year': String(from + i), 'Release Date': `${from + i}-03-01` }));

// ── Dashboard ──────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ant-layout-sider');
  });

  test('layout renders — header, sidebar, stat cards, highlights', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('.ant-layout-header')).toBeVisible();
    await expect(page.getByText('Total Movies')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Highlights' })).toBeVisible();
  });

  test('highlight cards show top rated, most popular, newest', async ({ page }) => {
    await expect(page.getByText('Top Rated')).toBeVisible();
    await expect(page.getByText('Most Popular')).toBeVisible();
    await expect(page.getByText('Newest Release')).toBeVisible();
  });

  test('CTA buttons navigate to Movies and Stats', async ({ page }) => {
    await page.getByRole('button', { name: 'Go to Movies' }).click();
    await expect(page).toHaveURL('/movies');
    await page.goto('/');
    await page.getByRole('button', { name: 'Go to Stats' }).click();
    await expect(page).toHaveURL('/stats');
  });

  test('highlight card click opens movie drawer', async ({ page }) => {
    await page.getByText('Top Rated').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Movie ID')).toBeVisible();
  });

  test('Total Box Office stat card navigates to Stats Box Office tab', async ({ page }) => {
    await page.getByText('Total Box Office').click();
    // The hand-off tab is written to ?tab= on arrival, so the URL is shareable/reloadable at once.
    await expect(page).toHaveURL('/stats?tab=boxoffice');
    await waitForStats(page);
    await expect(page.getByRole('tab', { name: /Box Office/, selected: true })).toBeVisible();
    await page.reload();
    await waitForStats(page);
    await expect(page.getByRole('tab', { name: /Box Office/, selected: true })).toBeVisible();
  });

  test('a click well above a release-trend point still drills down to that year', async ({ page }) => {
    // 2015–2024, five movies a year except one in 2020, so the 2020 point sits near the bottom.
    const rows = Array.from({ length: 10 }, (_, y) => Array.from({ length: y === 5 ? 1 : 5 }, (_, k) =>
      makeMovie(y * 10 + k + 1, { 'Release Year': String(2015 + y), 'Release Date': `${2015 + y}-01-15` }))).flat();
    await mockMovies(page, rows);
    await page.goto('/');
    const canvas = page.getByText('Movies Released — 2015–2024', { exact: true }).locator('xpath=..').locator('canvas');
    await expect(canvas).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('trend canvas not visible');
    // Category points sit at plotLeft + i * step; plot area ≈ canvas minus the y-axis labels.
    const plotLeft = box.x + 36;
    const step = (box.x + box.width - 8 - plotLeft) / 9;
    // 30% down the canvas: far above the 2020 point (value 1 of 5), so only index-mode hit-testing reaches it.
    await page.mouse.move(plotLeft + 5 * step, box.y + box.height * 0.3);
    await expect.poll(() => canvas.evaluate((el) => (el as HTMLElement).style.cursor)).toBe('pointer');
    await page.mouse.click(plotLeft + 5 * step, box.y + box.height * 0.3);
    await expect(page).toHaveURL('/movies');
    await expect(filterChip(page, 'Year: 2020–2020')).toBeVisible();
    await expectTotal(page, 1);
  });

  test('the single-series rating distribution draws no legend', async ({ page }) => {
    await recordCanvasText(page);
    await page.goto('/');
    const canvas = dashboardChartCanvas(page, 'Rating Distribution');
    await expect(canvas).toBeVisible();
    // Bars (and so axis labels) are drawn; the dataset label "Movies" would only appear in a legend.
    await expect.poll(() => canvasTexts(canvas)).toContain('0–2');
    expect(await canvasTexts(canvas)).not.toContain('Movies');
  });

  test('empty catalogue shows the Empty view with a Go to Movies CTA', async ({ page }) => {
    await mockMovies(page, []);
    await page.reload();
    await expect(page.getByText('No movies yet — add one to see stats and trends here.')).toBeVisible();
    await expect(page.getByText('Total Movies')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Highlights' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Go to Movies' }).click();
    await expect(page).toHaveURL('/movies');
  });

  test('Top Rated needs enough votes and matches Stats › Explore Highest Rated #1', async ({ page }) => {
    // 10 movies with ≥ 50 votes (so the cutoff applies) plus a 10.0 from a single vote.
    const rows = [
      ...Array.from({ length: 9 }, (_, i) => makeMovie(i + 1)),
      makeMovie(10, { Name: 'Best Voted', 'Vote Average': '9.1', 'Vote Count': '5000' }),
      makeMovie(11, { Name: 'Lucky Single', 'Vote Average': '10.0', 'Vote Count': '1' }),
    ];
    await mockMovies(page, rows);
    await page.goto('/');
    await expect(page.getByRole('button', { name: /^Top Rated: Best Voted, / })).toBeVisible();

    await page.goto('/stats?tab=explore');
    await waitForStats(page);
    const pane = activeTabPane(page);
    await expect(pane.getByText('min. 50 votes')).toBeVisible();
    await expect(pane.getByText('Lucky Single')).toHaveCount(0);
    const text = (await pane.textContent()) ?? '';
    const best = text.indexOf('Best Voted');
    expect(best).toBeGreaterThan(-1);
    for (const r of rows.slice(0, 9)) {
      const at = text.indexOf(r.Name);
      if (at !== -1) expect(at, r.Name).toBeGreaterThan(best);
    }
  });

  /** Makes the next download of the MovieDrawer chunk fail; later ones go through. Returns whether it fired. */
  async function failDrawerChunkOnce(page: Page): Promise<() => boolean> {
    let aborted = false;
    await page.route(/MovieDrawer/, (route) => {
      if (aborted) return route.fallback();
      aborted = true;
      return route.abort('internetdisconnected');
    });
    return () => aborted;
  }

  test('a failed details chunk keeps the Dashboard up and the next click retries', async ({ page }) => {
    const aborted = await failDrawerChunkOnce(page);
    await page.goto('/');
    const topRated = page.getByRole('button', { name: /^Top Rated: / });
    await topRated.click();
    const alert = page.getByRole('alert').filter({ hasText: "Couldn't open movie details. Check your connection and try again." });
    await expect(alert).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(aborted()).toBe(true);

    await topRated.click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Movie ID')).toBeVisible();
    await expect(alert).toHaveCount(0);
  });

  test('the details failure alert offers a page reload', async ({ page }) => {
    await failDrawerChunkOnce(page);
    await page.goto('/');
    await page.getByRole('button', { name: /^Top Rated: / }).click();
    const reload = page.getByRole('button', { name: 'Reload page' });
    await expect(reload).toBeVisible();
    await Promise.all([page.waitForEvent('load'), reload.click()]);
    await expect(reload).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('a drawer that crashes after loading shows the error view, not the load-failure alert', async ({ page }) => {
    // The chunk downloads fine; the component it exports throws on render.
    await page.route(/MovieDrawer/, (route) => route.fulfill({
      contentType: 'application/javascript',
      body: "export default function MovieDrawer() { throw new Error('drawer render crash'); }",
    }));
    await page.goto('/');
    await page.getByRole('button', { name: /^Top Rated: / }).click();
    await expect(page.getByText('Something went wrong')).toBeVisible();
    await expect(page.getByText("Couldn't open movie details")).toHaveCount(0);
  });

  test('a route page whose chunk failed to download loads on Try Again', async ({ page }) => {
    let fail = true;
    await page.route(/\/src\/pages\/Stats\.tsx/, (route) => (fail ? route.abort() : route.fallback()));
    await page.goto('/');
    await page.getByRole('link', { name: 'Stats', exact: true }).click();
    await expect(page.getByText("Couldn't load this page.", { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
    // The failed page never rendered its title, so the tab doesn't keep the Dashboard's.
    await expect(page).toHaveTitle('Something went wrong · MovieDash');
    fail = false;
    // A download retry doesn't wait on the catalogue: hold every reload and Stats still appears.
    await page.route('**/api/movies', () => new Promise<void>(() => {}));
    await page.getByRole('button', { name: 'Try Again' }).click();
    await expect(page.getByRole('heading', { name: 'Statistics Dashboard', exact: true })).toBeVisible();
  });

  test('Try Again keeps the error view up until the catalogue reload finishes', async ({ page }) => {
    await page.route(/MovieDrawer/, (route) => route.fulfill({
      contentType: 'application/javascript',
      body: "export default function MovieDrawer() { throw new Error('drawer render crash'); }",
    }));
    // Only reloads after the crash are held (dev StrictMode already fetches twice on load).
    let holding = false;
    let held = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/movies', async (route) => {
      if (holding) { held += 1; await gate; }
      await route.fallback();
    });
    await page.goto('/');
    await page.getByRole('button', { name: /^Top Rated: / }).click();
    const tryAgain = page.getByRole('button', { name: 'Try Again' });
    holding = true;
    await tryAgain.click();
    await expect.poll(() => held).toBe(1);
    // Reload still in flight: the error view stays, its button busy.
    await expect(page.getByText('Something went wrong')).toBeVisible();
    await expect(tryAgain).toHaveClass(/ant-btn-loading/);
    release();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('sections render in order: Overview, Highlights, Trends & Breakdown, Explore More', async ({ page }) => {
    await mockMovies(page, Array.from({ length: 6 }, (_, i) => makeMovie(i + 1)));
    await page.goto('/');
    const headings = page.getByRole('heading', { level: 4 });
    await expect(headings.first()).toBeVisible();
    expect(await headings.allInnerTexts()).toEqual(['Overview', 'Highlights', 'Trends & Breakdown', 'Explore More']);
  });

  test('Total Movies is styled as the primary metric', async ({ page }) => {
    await mockMovies(page, Array.from({ length: 6 }, (_, i) => makeMovie(i + 1)));
    await page.goto('/');
    const valueSize = (label: string) => page.locator('.ant-statistic').filter({ hasText: label })
      .locator('.ant-statistic-content').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const total = await valueSize('Total Movies');
    for (const label of ['Average Rating', 'Average Runtime', 'Total Box Office']) {
      expect(total, label).toBeGreaterThan(await valueSize(label));
    }
  });

  test('a genre slice drills down to that genre', async ({ page }) => {
    // Drama covers the first 3/5 of the ring (clockwise from the top), Comedy the rest, so the ring's
    // upper-left quarter is Comedy.
    await mockMovies(page, [
      ...[1, 2, 3].map((i) => makeMovie(i, { Genres: 'Drama' })),
      ...[4, 5].map((i) => makeMovie(i, { Genres: 'Comedy' })),
    ]);
    await page.goto('/');
    const canvas = dashboardChartCanvas(page, 'Genre Breakdown (Top 7)');
    await expect(canvas).toBeVisible();
    const pt = await findPointer(page, canvas, 'x', 0.35);
    await page.mouse.click(pt.x, pt.y);
    await expect(page).toHaveURL('/movies');
    await expect(filterChip(page, 'Comedy')).toBeVisible();
    await expectTotal(page, 2);
  });

  test('the Other genre slice is not a drill-down target', async ({ page }) => {
    // 7 named genres with 2 movies each, then 20 single-movie genres folded into "Other" (20 of 34):
    // Other is the last slice, covering the ring's whole upper-left quarter.
    const rows = [
      ...Array.from({ length: 14 }, (_, i) => makeMovie(i + 1, { Genres: `Named ${Math.floor(i / 2)}` })),
      ...Array.from({ length: 20 }, (_, i) => makeMovie(100 + i, { Genres: `Rare ${i}` })),
    ];
    await mockMovies(page, rows);
    await page.goto('/');
    const canvas = dashboardChartCanvas(page, 'Genre Breakdown (Top 7)');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('genre canvas not visible');
    const middle = box.x + box.width / 2;
    const runs = await pointerRuns(page, canvas, 'x', 0.35, { step: 8 });
    expect(runs.length, 'the named slices on the right are clickable').toBeGreaterThan(0);
    for (const pt of runs) expect(pt.x, 'no pointer over the Other slice').toBeGreaterThan(middle);
    // Click where the ring is actually drawn on the left (the Other slice), not on empty canvas.
    const now = await canvas.boundingBox(); // the sweep scrolled the chart into view
    const y = now!.y + now!.height * 0.35;
    const x = await firstPaintedX(canvas, y, box.x, middle);
    expect(x, 'the Other slice is drawn on the left of the sweep line').not.toBeNull();
    expect(await isPointerAt(page, canvas, x! + 6, y)).toBe(false);
    await page.mouse.click(x! + 6, y);
    await expect(page).toHaveURL('/');
  });

  test('Recent Releases says so when no movie has a release date', async ({ page }) => {
    await mockMovies(page, [makeMovie(1, { 'Release Date': '' }), makeMovie(2, { 'Release Date': '' })]);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByText('No dated releases')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Recent releases' })).toHaveCount(0);
  });

  test('unknown revenue and ratings are not shown as real values', async ({ page }) => {
    const rows = [
      makeMovie(1, { 'Box Office Revenue': '-1000000' }),
      makeMovie(2, { 'Box Office Revenue': '250000000' }),
      makeMovie(3, { Name: 'Newest Unrated', 'Vote Average': '0', 'Release Date': '2030-06-01', 'Release Year': '2030' }),
    ];
    await mockMovies(page, rows);
    await page.goto('/');
    const positive = rows.reduce((sum, m) => sum + Math.max(0, Number(m['Box Office Revenue'])), 0);
    await expect(page.getByRole('button', { name: `Total Box Office: ${formatRevenue(positive)}, view details` })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Newest Unrated, released 01-06-2030, not rated$/ })).toContainText('Not rated');

    const unrated = rows.map((m) => ({ ...m, 'Vote Average': '0' }));
    await mockMovies(page, unrated);
    await page.reload();
    const avg = page.locator('.ant-card').filter({ hasText: 'Average Rating' });
    await expect(avg).toContainText('—');
    await expect(avg).not.toContainText('/ 10');
  });

  test('cards, Recent Releases and headings expose their content to assistive tech', async ({ page }) => {
    const rows = Array.from({ length: 6 }, (_, i) => makeMovie(i + 1));
    await mockMovies(page, rows);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 4, name: 'Highlights' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Total Box Office: \$.+, view details$/ })).toBeVisible();

    const list = page.getByText('Recent Releases', { exact: true }).locator('xpath=..').getByRole('list');
    const items = list.getByRole('listitem');
    await expect(items).toHaveCount(5);
    for (const item of await items.all()) await expect(item.getByRole('button')).toHaveCount(1);

    const newest = rows[rows.length - 1];
    const button = list.getByRole('button', { name: new RegExp(`^${newest.Name}, released 15-01-${newest['Release Year']}, rated `) });
    await button.focus();
    await page.keyboard.press('Enter');
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(newest.Name).first()).toBeVisible();
  });
});

// ── Movies ─────────────────────────────────────────────────────────────────

test.describe('Movies', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);
  });

  test('layout renders — header, sidebar, table', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('.ant-layout-header')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Movies', exact: true })).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('table/grid toggle switches view', async ({ page }) => {
    await expect(page.locator('.ant-table')).toBeVisible();
    await page.getByText('Grid', { exact: true }).click();
    await expect(page.locator('.ant-table')).not.toBeVisible();
    await expect(page.locator('.ant-card').first()).toBeVisible();
    await page.getByText('Table', { exact: true }).click();
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('grid card click opens drawer with movie details', async ({ page }) => {
    await page.getByText('Grid', { exact: true }).click();
    await page.locator('.ant-card').first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Movie ID')).toBeVisible();
  });

  test('movie count badge matches the catalogue size', async ({ page }) => {
    const movies = await fetchMovies(page);
    expect(movies.length).toBeGreaterThan(0);
    const badge = page.getByTitle(/movies in catalogue$/);
    await expect(badge).toBeVisible();
    const count = parseInt(((await badge.textContent()) ?? '').replace(/,/g, ''), 10);
    expect(count).toBe(movies.length);
  });

  test('search and filters button visible by default', async ({ page }) => {
    await expect(searchBox(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
  });

  test('filters button opens drawer with all filter groups', async ({ page }) => {
    await openFiltersDrawer(page);
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Genre' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Director' })).toBeVisible();
  });

  test('search narrows table results', async ({ page }) => {
    const movies = await fetchMovies(page);
    // The movie whose name matches the fewest rows (among the first 100) — it lands on page 1.
    let target = movies[0];
    let expected = searchMatchCount(movies, target.Name);
    for (const m of movies.slice(1, 100)) {
      const n = searchMatchCount(movies, m.Name);
      if (n < expected) { target = m; expected = n; }
    }
    expect(expected, 'precondition: some movie name must not match every row').toBeLessThan(movies.length);

    await searchBox(page).fill(target.Name);
    await expectTotal(page, expected);
    await expect(page.locator('.ant-table-row .movie-name-button', { hasText: target.Name }).first()).toBeVisible();
  });

  test('search with no match shows empty state', async ({ page }) => {
    await searchBox(page).fill('ZZZNOMATCH999QQQ');
    await expect(page.getByText('No movies match your filters')).toBeVisible();
    await expect(page.locator('.ant-table-row')).toHaveCount(0);
  });

  test('clear button appears when filtered and resets', async ({ page }) => {
    await searchBox(page).fill('action');

    const clearBtn = page.locator('button[title="Clear all filters"]');
    await expect(clearBtn).toBeVisible();

    await clearBtn.click();
    await expect(searchBox(page)).toHaveValue('');
    await expect(clearBtn).not.toBeVisible();
  });

  test('a filter chip is removed from the keyboard by its named button', async ({ page }) => {
    await searchBox(page).fill('action');
    const chip = filterChip(page, 'Search: action');
    await expect(chip).toBeVisible();
    const remove = page.getByRole('button', { name: 'Remove Search: action', exact: true });
    await remove.focus();
    await page.keyboard.press('Enter');
    await expect(chip).toHaveCount(0);
    await expect(searchBox(page)).toHaveValue('');
  });

  test('active filter shows dot indicator', async ({ page }) => {
    await searchBox(page).fill('a');
    await expect(page.locator('.ant-badge-dot')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filters, active' })).toBeVisible();
  });

  test('language filter narrows to matching rows', async ({ page }) => {
    const movies = await fetchMovies(page);
    await openFiltersDrawer(page);
    const language = await selectInDrawer(page, 'Language');
    await closeFiltersDrawer(page);

    // The filter matches the code; the option shows the name. Count by code, and skip when the
    // name stands for several codes (B146), since the test can't tell which one was picked.
    const codes = codesByLanguageName(movies).get(language) ?? new Set<string>();
    test.skip(codes.size !== 1, `several language codes share the name "${language}" (B146)`);
    const [code] = codes;
    const expected = movies.filter((m) => m.Language === code).length;
    expect(expected, `precondition: "${language}" must not cover every movie`).toBeLessThan(movies.length);
    expect(expected).toBeGreaterThan(0);
    await expectTotal(page, expected);

    const cells = await (await columnCells(page, 'Language')).allInnerTexts();
    expect(cells.length).toBe(Math.min(expected, 10));
    for (const cell of cells) expect(cell).toBe(language);
  });

  test('genre filter narrows to matching rows', async ({ page }) => {
    const movies = await fetchMovies(page);
    await openFiltersDrawer(page);
    const genre = await selectInDrawer(page, 'Genre');
    await closeFiltersDrawer(page);

    const expected = movies.filter((m) => splitNames(m.Genres).includes(genre)).length;
    expect(expected, `precondition: "${genre}" must not cover every movie`).toBeLessThan(movies.length);
    expect(expected).toBeGreaterThan(0);
    await expectTotal(page, expected);

    // Genres is shown from the md breakpoint up — the desktop viewport.
    const cells = await (await columnCells(page, 'Genres')).allInnerTexts();
    expect(cells.length).toBe(Math.min(expected, 10));
    for (const cell of cells) expect(splitNames(cell)).toContain(genre);
  });

  test('row click opens drawer with movie details', async ({ page }) => {
    await page.locator('.ant-table-row').first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('🎬')).toBeVisible();
    await expect(drawer.getByText('Movie ID')).toBeVisible();
    await expect(drawer.getByText('Language')).toBeVisible();
    await expect(drawer.getByText('Director')).toBeVisible();
  });

  test('drawer closes on X button', async ({ page }) => {
    await page.locator('.ant-table-row').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('.ant-drawer-close').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('CSV export triggers download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/i }).click();
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toMatch(/^movies-\d+\.csv$/); // no search/filter active
  });

  test('Export CSV button disabled when no results', async ({ page }) => {
    await searchBox(page).fill('ZZZNOMATCH999QQQ');
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeDisabled();
  });

  test('column sorting on Name column', async ({ page }) => {
    expect(await movieTotal(page), 'precondition: need two rows to compare').toBeGreaterThan(1);
    const nameHeader = page.locator('th.ant-table-cell').filter({ hasText: /^Name$/ });
    const names = page.locator('.ant-table-row .movie-name-button');

    await nameHeader.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    await expectFirstTwoOrdered(page, names, 1);
    const firstAsc = await names.first().textContent();

    // Second click reverses the sort
    await nameHeader.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    await expectFirstTwoOrdered(page, names, -1);
    await expect(names.first()).not.toHaveText(firstAsc ?? '');
  });

  test('page size changer works', async ({ page }) => {
    const total = await movieTotal(page);
    await setPageSize(page, 5);
    const shown = Math.min(5, total);
    await expect(page.locator('.ant-table-row')).toHaveCount(shown);
    await expect(paginationTotal(page)).toHaveText(`1–${shown} of ${total} movies`);
  });

  test('filters drawer opens and closes', async ({ page }) => {
    await openFiltersDrawer(page);
    await closeFiltersDrawer(page);
    await expect(page.getByRole('combobox', { name: 'Language' })).not.toBeVisible();
  });
});

// ── Movies — Grid View ──────────────────────────────────────────────────────

test.describe('Movies Grid View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);
    await page.getByText('Grid', { exact: true }).click();
    await page.waitForSelector('.ant-card');
  });

  test('grid cards render a poster image (real or fallback)', async ({ page }) => {
    const img = page.locator('.ant-card').first().locator('img').first();
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
    await expect(img).toHaveAttribute('alt', /poster/);
  });

  test('grid card is keyboard-activatable with Enter', async ({ page }) => {
    const card = page.locator('.ant-card[role="button"]').first();
    await card.focus();
    await page.keyboard.press('Enter');
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Movie ID')).toBeVisible();
  });

  test('grid pagination page-size changer works', async ({ page }) => {
    const total = await movieTotal(page);
    await setPageSize(page, 24);
    const shown = Math.min(24, total);
    await expect(page.locator('.ant-card[role="button"]')).toHaveCount(shown);
    await expect(paginationTotal(page)).toHaveText(`1–${shown} of ${total} movies`);
  });
});

// ── Movies — Grid sort (mocked catalogue, so every order is known) ──────────

test.describe('Movies Grid Sort', () => {
  // Five rows whose name/year/rating/runtime orders all differ, so each sort has a distinct top two.
  const rows: ApiMovie[] = [
    makeMovie(1, { Name: 'Delta', 'Release Year': '1999', 'Vote Average': '6.0', Runtime: '120' }),
    makeMovie(2, { Name: 'Alpha', 'Release Year': '2015', 'Vote Average': '4.5', Runtime: '95' }),
    makeMovie(3, { Name: 'Echo', 'Release Year': '2010', 'Vote Average': '8.9', Runtime: '80' }),
    makeMovie(4, { Name: 'Bravo', 'Release Year': '1985', 'Vote Average': '5.1', Runtime: '150' }),
    makeMovie(5, { Name: 'Charlie', 'Release Year': '2023', 'Vote Average': '7.2', Runtime: '101' }),
  ];
  const cases: [option: string, firstTwo: [string, string]][] = [
    ['Name (A–Z)', ['Alpha', 'Bravo']],
    ['Name (Z–A)', ['Echo', 'Delta']],
    ['Year (Newest)', ['Charlie', 'Alpha']],
    ['Year (Oldest)', ['Bravo', 'Delta']],
    ['Rating (High–Low)', ['Echo', 'Charlie']],
    ['Rating (Low–High)', ['Alpha', 'Bravo']],
    ['Runtime (Long–Short)', ['Bravo', 'Delta']],
    ['Runtime (Short–Long)', ['Echo', 'Alpha']],
    ['Default order', ['Delta', 'Alpha']],
  ];

  test('each sort option orders the first cards as expected', async ({ page }) => {
    await mockMovies(page, rows);
    await page.goto('/movies');
    await waitForTable(page);
    await page.getByText('Grid', { exact: true }).click();
    const cards = page.locator('.ant-card[role="button"]');
    await expect(cards).toHaveCount(rows.length);

    for (const [option, [first, second]] of cases) {
      await chooseOption(page, 'Sort', option);
      await expect(cards.nth(0), option).toHaveAttribute('aria-label', `View details for ${first}`);
      await expect(cards.nth(1), option).toHaveAttribute('aria-label', `View details for ${second}`);
    }
  });
});

// ── Movies — Director & Range Filters ───────────────────────────────────────

test.describe('Movies Advanced Filters', () => {
  test('the language picker finds a language by its name (B177)', async ({ page }) => {
    await mockMovies(page, [makeMovie(1, { Language: 'ta' }), makeMovie(2, { Language: 'en' }), makeMovie(3, { Language: 'en' })]);
    await page.goto('/movies');
    await waitForTable(page);
    await openFiltersDrawer(page);
    await page.getByRole('combobox', { name: 'Language' }).fill('Tamil');
    await openDropdown(page).getByTitle('Tamil', { exact: true }).click();
    await page.keyboard.press('Escape');
    await closeFiltersDrawer(page);
    await expectTotal(page, 1);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);
  });

  /**
   * 12 rows with known values: directors A×5, B×4, C×3; runtimes 80–130 by 5 with row 12 unknown
   * (0); revenue (i−1)·$1M, so row 1 is unknown (0). Unknowns drop out while that filter is active.
   */
  const rangeRows = () => Array.from({ length: 12 }, (_, k) => {
    const i = k + 1;
    return makeMovie(i, {
      Director: i <= 5 ? 'Director A' : i <= 9 ? 'Director B' : 'Director C',
      Runtime: i === 12 ? '0' : String(75 + 5 * i),
      'Box Office Revenue': String((i - 1) * 1_000_000),
    });
  });

  test('director filter narrows to that director\'s movies and shows a chip', async ({ page }) => {
    await mockMovies(page, rangeRows());
    await page.goto('/movies');
    await waitForTable(page);
    await openFiltersDrawer(page);
    await selectInDrawer(page, 'Director', 'Director B');
    await closeFiltersDrawer(page);

    await expect(filterChip(page, 'Director: Director B')).toBeVisible();
    await expectTotal(page, 4);
  });

  test('runtime range slider narrows to the movies inside its bounds', async ({ page }) => {
    const rows = rangeRows();
    await mockMovies(page, rows);
    await page.goto('/movies');
    await waitForTable(page);
    await openFiltersDrawer(page);
    const handle = page.locator('.ant-drawer-body .ant-slider').nth(2).locator('.ant-slider-handle').first();
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await closeFiltersDrawer(page);

    // Expected count from the chip's committed bounds, so slider step sizes don't matter.
    const chip = filterChip(page, 'Runtime:');
    await expect(chip).toHaveText(/Runtime: \d+–\d+m/);
    const [lo, hi] = (await chip.innerText()).match(/(\d+)–(\d+)m/)!.slice(1).map(Number);
    const expected = rows.filter((m) => { const r = Number(m.Runtime); return r > 0 && r >= lo && r <= hi; }).length;
    expect(expected).toBeLessThan(rows.length);
    await expectTotal(page, expected);
  });

  test('dragging the year slider applies the filter once, on release', async ({ page }) => {
    await mockMovies(page, yearRows(1990, 2020));
    // Every applied filter change is saved; count the saves to count the updates.
    await page.addInitScript((key) => {
      const w = window as unknown as { __filterSaves: number };
      w.__filterSaves = 0;
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (this === window.sessionStorage && k === key) w.__filterSaves += 1;
        return orig.call(this, k, v);
      };
    }, FILTERS_STORAGE_KEY);
    await page.goto('/movies');
    await waitForTable(page);
    await openFiltersDrawer(page);
    const handle = page.getByRole('slider', { name: 'Release year minimum' });
    await handle.hover(); // waits for the drawer's slide-in to finish, so the boxes below are final
    const track = page.locator('.ant-drawer-body .ant-slider').first();
    const box = await track.boundingBox();
    const start = await handle.boundingBox();
    if (!box || !start) throw new Error('year slider not visible');
    const saves = () => page.evaluate(() => (window as unknown as { __filterSaves: number }).__filterSaves);
    const before = await saves();

    const cx = start.x + start.width / 2;
    const cy = start.y + start.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + box.width * 0.65, cy, { steps: 10 });
    expect(await saves(), 'nothing applied while dragging').toBe(before);
    await page.mouse.up();

    await expect.poll(saves).toBe(before + 1);
    const lo = Number(await handle.getAttribute('aria-valuenow'));
    expect(lo).toBeGreaterThanOrEqual(2005); // dragged across 15+ years
    await closeFiltersDrawer(page);
    await expect(filterChip(page, `Year: ${lo}–2020`)).toBeVisible();
    await expectTotal(page, 2020 - lo + 1);
    expect(await saves()).toBe(before + 1);
  });

  test('range slider handles have accessible names', async ({ page }) => {
    await mockMovies(page, rangeRows());
    await page.goto('/movies');
    await waitForTable(page);
    await openFiltersDrawer(page);
    const drawer = page.locator('.ant-drawer-body');
    for (const label of ['Release year', 'Vote average', 'Runtime', 'Box office revenue']) {
      await expect(drawer.getByRole('slider', { name: `${label} minimum`, exact: true })).toHaveCount(1);
      await expect(drawer.getByRole('slider', { name: `${label} maximum`, exact: true })).toHaveCount(1);
    }
  });

  test('revenue range slider narrows to the movies inside its bounds', async ({ page }) => {
    const rows = rangeRows();
    await mockMovies(page, rows);
    await page.goto('/movies');
    await waitForTable(page);
    await openFiltersDrawer(page);
    const handles = page.locator('.ant-drawer-body .ant-slider').nth(3).getByRole('slider');
    await expect(handles).toHaveCount(2);
    await handles.first().focus();
    await page.keyboard.press('ArrowRight');
    // The chip rounds to $x.xM, so take the exact committed bounds from the handles.
    const [lo, hi] = await handles.evaluateAll((els) => els.map((el) => Number(el.getAttribute('aria-valuenow'))));
    expect(hi).toBeGreaterThan(lo);
    await closeFiltersDrawer(page);

    await expect(filterChip(page, 'Revenue:')).toHaveText(`Revenue: ${formatRevenue(lo)}–${formatRevenue(hi)}`);
    const expected = rows.filter((m) => { const r = Number(m['Box Office Revenue']); return r > 0 && r >= lo && r <= hi; }).length;
    expect(expected).toBeLessThan(rows.length);
    await expectTotal(page, expected);
  });

  test('revenue slider steps by a readable amount from the keyboard', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { 'Box Office Revenue': '1000000' }),
      makeMovie(2, { 'Box Office Revenue': '500000000' }),
      makeMovie(3, { 'Box Office Revenue': '2800000000' }),
    ]);
    await page.goto('/movies');
    await waitForTable(page);
    await openFiltersDrawer(page);
    const handle = page.locator('.ant-drawer-body .ant-slider').nth(3).locator('.ant-slider-handle').first();
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await closeFiltersDrawer(page);
    // Span $1M–$2.8B → step $20M (1/100 of the span, rounded), not $1.
    await expect(filterChip(page, 'Revenue:')).toContainText('Revenue: $21.0M–$2.8B');
    await expectTotal(page, 2);
  });
});

// ── Movies — Add & Delete (all mutations mocked; the real CSV is never written) ──

test.describe('Movies Add & Delete', () => {
  const tmdbResult = (id: number, title: string) =>
    ({ id, title, year: '2024', language: 'en', posterUrl: '', alreadyImported: false });

  async function openAddMovie(page: Page) {
    await page.getByRole('button', { name: 'Add Movie' }).click();
    const modal = page.getByRole('dialog', { name: 'Add Movie from TMDB' });
    await expect(modal).toBeVisible();
    return modal;
  }

  test('Add Movie: search, import, Added state and refetch', async ({ page }) => {
    // 'Added' comes from the catalogue, so the already-imported result is one of its rows.
    const base = [makeMovie(1), makeMovie(2, { 'Movie ID': '999002', Name: 'Mock Already There' })];
    const imported = makeMovie(3, { 'Movie ID': '999001', Name: 'Mock Import One' });
    const setMovies = await mockMovies(page, base);

    const seen: { searchUrl?: URL; importBody?: unknown } = {};
    await page.route(/\/api\/tmdb\/search(\?|$)/, (route) => {
      seen.searchUrl = new URL(route.request().url());
      return route.fulfill({
        json: {
          results: [
            tmdbResult(999001, 'Mock Import One'),
            { id: 999002, title: 'Mock Already There', year: '2019', language: 'fr', posterUrl: '', alreadyImported: true },
          ],
        },
      });
    });
    await page.route('**/api/tmdb/import', (route) => {
      seen.importBody = route.request().postDataJSON();
      setMovies([...base, imported]);
      return route.fulfill({ status: 201, json: { movie: imported } });
    });

    await page.goto('/movies');
    await waitForTable(page);
    await expectTotal(page, 2);
    const modal = await openAddMovie(page);

    await modal.getByPlaceholder('Movie name').fill('Mock');
    await modal.getByRole('button', { name: 'Search' }).click();
    const fresh = searchResult(modal, 'Mock Import One');
    const existing = searchResult(modal, 'Mock Already There');
    await expect(fresh).toBeVisible();
    await expect(existing).toBeVisible();
    expect(seen.searchUrl?.searchParams.get('query')).toBe('Mock');
    await expect(existing.getByText('Added')).toBeVisible();
    await expect(fresh.getByText('Added')).toHaveCount(0);

    await fresh.getByRole('button', { name: 'Import' }).click();
    await expect(fresh.getByText('Added')).toBeVisible();
    await expect(fresh.getByRole('button', { name: 'Import' })).toHaveCount(0);
    expect(seen.importBody).toEqual({ movieId: 999001 });

    // refetch() picks up the new row without a reload; the modal keeps its results meanwhile.
    await expect(page.getByTitle('3 movies in catalogue')).toBeVisible();
    await expect(fresh).toBeVisible();
    await modal.locator('.ant-modal-footer').getByRole('button', { name: 'Close' }).click();
    await expect(modal).not.toBeVisible();
    await expectTotal(page, 3);
    await expect(page.locator('.ant-table-row', { hasText: 'Mock Import One' })).toBeVisible();
  });

  test('background refresh after an import is announced as a status', async ({ page }) => {
    const base = [makeMovie(1), makeMovie(2)];
    const imported = makeMovie(3, { 'Movie ID': '999001', Name: 'Mock Import One' });
    let importDone = false;
    let release: () => void = () => {};
    const held = new Promise<void>((r) => { release = r; });
    await page.route('**/api/movies', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      if (!importDone) return route.fulfill({ json: base });
      await held; // hold the refetch so the refresh state stays visible
      return route.fulfill({ json: [...base, imported] });
    });
    await page.route(/\/api\/tmdb\/search(\?|$)/, (route) => route.fulfill({
      json: { results: [tmdbResult(999001, 'Mock Import One')] },
    }));
    await page.route('**/api/tmdb/import', (route) => {
      importDone = true;
      return route.fulfill({ status: 201, json: { movie: imported } });
    });

    await page.goto('/movies');
    await waitForTable(page);
    const status = page.getByRole('status').filter({ hasText: 'Refreshing catalogue' });
    await expect(status).toHaveCount(0);

    const modal = await openAddMovie(page);
    await modal.getByPlaceholder('Movie name').fill('Mock');
    await modal.getByRole('button', { name: 'Search' }).click();
    await modal.getByRole('button', { name: 'Import' }).click();

    await expect(status).toHaveCount(1);
    release();
    await expect(page.getByTitle('3 movies in catalogue')).toBeVisible();
    await expect(status).toHaveCount(0);
  });

  test('Delete: a movie already deleted elsewhere (404) closes the drawer and refreshes', async ({ page }) => {
    const rows = [makeMovie(1), makeMovie(2)];
    const victim = rows[1];
    const setMovies = await mockMovies(page, rows);
    await mockDelete(page, () => {
      setMovies([rows[0]]); // another tab already removed it
      return { status: 404, json: { error: 'Movie not found' } };
    });
    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-row', { hasText: victim.Name }).click();
    await confirmDrawerDelete(page);
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0);
    await expectTotal(page, 1);
    await expect(page.getByText('Movie not found')).toHaveCount(0);
  });

  test('Delete: Popconfirm, refetch, drawer closes and the row is gone', async ({ page }) => {
    const rows = [makeMovie(1), makeMovie(2), makeMovie(3)];
    const victim = rows[1];
    const setMovies = await mockMovies(page, rows);
    const deleted: string[] = [];
    await mockDelete(page, (id) => {
      deleted.push(id);
      setMovies(rows.filter((m) => m !== victim));
    });

    await page.goto('/movies');
    await waitForTable(page);
    await expectTotal(page, 3);
    await page.locator('.ant-table-row', { hasText: victim.Name }).click();
    const drawer = page.locator('.ant-drawer-open');
    await expect(drawer.getByText(`🎬 ${victim.Name}`)).toBeVisible();

    await drawer.getByRole('button', { name: 'Delete' }).click();
    const confirm = page.locator('.ant-popconfirm');
    await expect(confirm.getByText('Delete this movie?')).toBeVisible();
    expect(deleted).toEqual([]); // nothing is sent until confirmed
    await confirm.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('.ant-drawer-open')).toHaveCount(0);
    expect(deleted).toEqual([victim['Movie ID']]);
    await expectTotal(page, 2);
    await expect(page.locator('.ant-table-row', { hasText: victim.Name })).toHaveCount(0);
    await expect(page.getByTitle('2 movies in catalogue')).toBeVisible();
  });

  test('Delete from page 3 keeps the rating sort and page 3', async ({ page }) => {
    const rows = Array.from({ length: 30 }, (_, i) => makeMovie(i + 1, { 'Vote Average': (1 + i * 0.25).toFixed(2) }));
    const setMovies = await mockMovies(page, rows);
    const victim = rows[20]; // first row of page 3, sorted by rating ascending
    await mockDelete(page, () => setMovies(rows.filter((m) => m !== victim)));
    await page.goto('/movies');
    await waitForTable(page);
    const voteHeader = page.getByRole('columnheader', { name: /Vote Avg/ });
    await voteHeader.click();
    await expect(voteHeader).toHaveAttribute('aria-sort', 'ascending');
    await page.locator('.ant-pagination-item-3').click();
    const firstRow = page.locator('.ant-table-row').first();
    await expect(firstRow).toContainText(victim.Name);

    await firstRow.getByRole('button', { name: victim.Name }).click();
    await confirmDrawerDelete(page);
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0);
    await expectTotal(page, 29);
    await expect(page.locator('.ant-pagination-item-active')).toHaveText('3');
    await expect(voteHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(firstRow).toContainText(rows[21].Name);
  });

  test('Add Movie: two imports in flight each show their own progress', async ({ page }) => {
    const catalogue = [makeMovie(1)];
    const setMovies = await mockMovies(page, catalogue);
    await page.route(/\/api\/tmdb\/search(\?|$)/, (route) => route.fulfill({
      json: { results: [tmdbResult(999101, 'Mock Import A'), tmdbResult(999102, 'Mock Import B')] },
    }));
    const release: Record<number, () => void> = {};
    await page.route('**/api/tmdb/import', async (route) => {
      const { movieId } = route.request().postDataJSON() as { movieId: number };
      await new Promise<void>((resolve) => { release[movieId] = resolve; });
      const movie = makeMovie(movieId - 999000, { 'Movie ID': String(movieId) });
      catalogue.push(movie); // the refetch after the import includes it, so "Added" stays
      setMovies([...catalogue]);
      return route.fulfill({ status: 201, json: { movie } });
    });
    await page.goto('/movies');
    await waitForTable(page);
    const modal = await openAddMovie(page);
    await modal.getByPlaceholder('Movie name').fill('Mock');
    await modal.getByRole('button', { name: 'Search' }).click();
    const rowA = searchResult(modal, 'Mock Import A');
    const rowB = searchResult(modal, 'Mock Import B');
    const importA = rowA.getByRole('button', { name: 'Import' });
    const importB = rowB.getByRole('button', { name: 'Import' });

    await importA.click();
    await importB.click();
    await expect.poll(() => Object.keys(release).length).toBe(2);
    await expect(importA).toHaveClass(/ant-btn-loading/);
    await expect(importB).toHaveClass(/ant-btn-loading/);

    release[999102]();
    await expect(rowB.getByText('Added')).toBeVisible();
    await expect(importA).toHaveClass(/ant-btn-loading/);
    release[999101]();
    await expect(rowA.getByText('Added')).toBeVisible();
  });

  test('Add Movie: a new search replaces one still running', async ({ page }) => {
    await mockMovies(page, [makeMovie(1)]);
    let releaseAlien: () => void = () => {};
    const alienHeld = new Promise<void>((r) => { releaseAlien = r; });
    const state = { alienRequested: false, alienReplied: false };
    await page.route(/\/api\/tmdb\/search(\?|$)/, async (route) => {
      const query = new URL(route.request().url()).searchParams.get('query');
      if (query === 'Alien') {
        state.alienRequested = true;
        await alienHeld;
        state.alienReplied = true;
        // The client aborted this request, so fulfilling it may fail; that's the point.
        return route.fulfill({ json: { results: [tmdbResult(1, 'Alien Result')] } }).catch(() => {});
      }
      return route.fulfill({ json: { results: [tmdbResult(2, 'Aliens Result')] } });
    });

    await page.goto('/movies');
    await waitForTable(page);
    const modal = await openAddMovie(page);
    const name = modal.getByPlaceholder('Movie name');
    await name.fill('Alien');
    await name.press('Enter');
    await expect.poll(() => state.alienRequested).toBe(true);
    await name.fill('Aliens');
    await name.press('Enter');

    const items = searchResult(modal);
    await expect(items.filter({ hasText: 'Aliens Result' })).toBeVisible();
    releaseAlien();
    await expect.poll(() => state.alienReplied).toBe(true);
    await expect(items.filter({ hasText: 'Aliens Result' })).toBeVisible();
    await expect(items.filter({ hasText: 'Alien Result' })).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Search' })).not.toHaveClass(/ant-btn-loading/);
  });

  test('Add Movie: a 409 "already in catalogue" shows Added, not an error', async ({ page }) => {
    const base = [makeMovie(1)];
    const setMovies = await mockMovies(page, base);
    await page.route(/\/api\/tmdb\/search(\?|$)/, (route) =>
      route.fulfill({ json: { results: [tmdbResult(999001, 'Added Elsewhere')] } }));
    await page.route('**/api/tmdb/import', (route) => {
      // Another tab added it: the server already has it, so the refetch includes it.
      setMovies([...base, makeMovie(2, { 'Movie ID': '999001', Name: 'Added Elsewhere' })]);
      return route.fulfill({ status: 409, json: { error: 'Movie already in catalogue' } });
    });

    await page.goto('/movies');
    await waitForTable(page);
    const modal = await openAddMovie(page);
    await modal.getByPlaceholder('Movie name').fill('Added');
    await modal.getByRole('button', { name: 'Search' }).click();
    const row = searchResult(modal, 'Added Elsewhere');
    await row.getByRole('button', { name: 'Import' }).click();

    await expect(row.getByText('Added', { exact: true })).toBeVisible();
    await expect(page.getByTitle('2 movies in catalogue')).toBeVisible();
    await expect(row.getByText('Added', { exact: true })).toBeVisible();
    await expect(modal.getByRole('alert')).toHaveCount(0);
  });

  test('Add Movie: a movie deleted after importing offers Import again', async ({ page }) => {
    const base = [makeMovie(1), makeMovie(2)];
    const imported = makeMovie(3, { 'Movie ID': '999001', Name: 'Short Lived' });
    const setMovies = await mockMovies(page, base);
    await page.route(/\/api\/tmdb\/search(\?|$)/, (route) =>
      route.fulfill({ json: { results: [tmdbResult(999001, 'Short Lived')] } }));
    await page.route('**/api/tmdb/import', (route) => {
      setMovies([...base, imported]);
      return route.fulfill({ status: 201, json: { movie: imported } });
    });
    await mockDelete(page, () => setMovies(base));

    await page.goto('/movies');
    await waitForTable(page);
    const modal = await openAddMovie(page);
    await modal.getByPlaceholder('Movie name').fill('Short');
    await modal.getByRole('button', { name: 'Search' }).click();
    const row = searchResult(modal, 'Short Lived');
    await row.getByRole('button', { name: 'Import' }).click();
    await expect(row.getByText('Added', { exact: true })).toBeVisible();
    await expect(page.getByTitle('3 movies in catalogue')).toBeVisible();
    await modal.locator('.ant-modal-footer').getByRole('button', { name: 'Close' }).click();
    await expect(modal).not.toBeVisible();

    await page.locator('.ant-table-row', { hasText: 'Short Lived' }).click();
    await confirmDrawerDelete(page);
    await expect(page.getByTitle('2 movies in catalogue')).toBeVisible();

    await page.getByRole('button', { name: 'Add Movie' }).click();
    await expect(row.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(row.getByText('Added', { exact: true })).toHaveCount(0);
  });

  test('Add Movie: starting another import keeps an earlier import error visible', async ({ page }) => {
    await mockMovies(page, [makeMovie(1)]);
    await page.route(/\/api\/tmdb\/search(\?|$)/, (route) =>
      route.fulfill({ json: { results: [tmdbResult(999001, 'Movie A'), tmdbResult(999002, 'Movie B')] } }));
    let releaseB: () => void = () => {};
    const bHeld = new Promise<void>((r) => { releaseB = r; });
    await page.route('**/api/tmdb/import', async (route) => {
      const { movieId } = route.request().postDataJSON() as { movieId: number };
      if (movieId === 999001) return route.fulfill({ status: 500, json: { error: 'Failed to save movie' } });
      await bHeld;
      return route.fulfill({ status: 500, json: { error: 'B failed too' } });
    });

    await page.goto('/movies');
    await waitForTable(page);
    const modal = await openAddMovie(page);
    await modal.getByPlaceholder('Movie name').fill('Movie');
    await modal.getByRole('button', { name: 'Search' }).click();
    const items = searchResult(modal);
    await items.filter({ hasText: 'Movie A' }).getByRole('button', { name: 'Import' }).click();
    const alert = modal.getByRole('alert');
    await expect(alert).toContainText('Failed to save movie');

    const importB = items.filter({ hasText: 'Movie B' }).getByRole('button', { name: 'Import' });
    await importB.click();
    await expect(importB).toHaveClass(/ant-btn-loading/);
    await expect(alert).toContainText('Failed to save movie');
    releaseB();
    await expect(alert).toContainText('B failed too');
  });

  test('Delete: a delete for movie A finishing after switching to B leaves B alone', async ({ page }) => {
    const rows = [makeMovie(1), makeMovie(2), makeMovie(3)];
    const [a, b] = rows;
    const setMovies = await mockMovies(page, rows);
    let releaseDelete: () => void = () => {};
    const deleteHeld = new Promise<void>((r) => { releaseDelete = r; });
    await mockDelete(page, async () => {
      await deleteHeld;
      setMovies(rows.filter((m) => m !== a));
    });

    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-row', { hasText: a.Name }).click();
    const drawer = page.locator('.ant-drawer-open');
    await expect(drawer.getByRole('heading', { name: a.Name })).toBeVisible();
    await confirmDrawerDelete(page);
    await expect(drawer.getByRole('button', { name: 'Delete' })).toHaveClass(/ant-btn-loading/);

    await drawer.locator('.ant-drawer-close').click();
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0);
    await page.locator('.ant-table-row', { hasText: b.Name }).click();
    await expect(drawer.getByRole('heading', { name: b.Name })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Delete' })).not.toHaveClass(/ant-btn-loading/);

    releaseDelete();
    await expectTotal(page, 2);
    await expect(drawer.getByRole('heading', { name: b.Name })).toBeVisible();
    await expect(drawer.getByRole('alert')).toHaveCount(0);
  });

  test('a blank server error still shows a message (search and delete)', async ({ page }) => {
    const rows = [makeMovie(1), makeMovie(2)];
    await mockMovies(page, rows);
    await page.route(/\/api\/tmdb\/search(\?|$)/, (route) => route.fulfill({ status: 500, json: { error: '' } }));
    await mockDelete(page, () => ({ status: 500, json: { error: '  ' } }));

    await page.goto('/movies');
    await waitForTable(page);
    const modal = await openAddMovie(page);
    await modal.getByPlaceholder('Movie name').fill('Mock');
    await modal.getByRole('button', { name: 'Search' }).click();
    await expect(modal.getByRole('alert')).toContainText('Request failed');
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();

    await page.locator('.ant-table-row', { hasText: rows[0].Name }).click();
    const drawer = page.locator('.ant-drawer-open');
    await confirmDrawerDelete(page);
    await expect(drawer.getByRole('alert')).toContainText('Delete failed');
  });

  test('drawer shows unknown runtime, rating and date as unknown', async ({ page }) => {
    const odd = makeMovie(1, { Name: 'Unknowns', 'Vote Average': '0', 'Vote Count': '0', Runtime: '0', 'Release Date': '' });
    await mockMovies(page, [odd, makeMovie(2)]);
    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-row', { hasText: 'Unknowns' }).click();
    const drawer = page.locator('.ant-drawer-open');
    await expect(drawer.getByText('Not rated')).toBeVisible();
    await expect(drawer).not.toContainText('0 mins');
    await expect(drawer).not.toContainText('⭐');
    await expect(drawer).not.toContainText('()');
    await expect(drawer).toContainText(`(${odd['Release Year']})`);
  });
});

// ── Navigation ─────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('sidebar navigates to Stats page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ant-layout-sider');
    await page.getByRole('link', { name: 'Stats' }).click();
    await expect(page).toHaveURL('/stats');
    await expect(page.getByText('📊 Statistics Dashboard')).toBeVisible();
  });

  test('sidebar navigates to Movies page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ant-layout-sider');
    await page.getByRole('link', { name: 'Movies' }).click();
    await expect(page).toHaveURL('/movies');
    await expect(page.getByRole('heading', { name: 'Movies', exact: true })).toBeVisible();
  });

  test('sidebar navigates back to Dashboard', async ({ page }) => {
    await page.goto('/stats');
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Highlights' })).toBeVisible();
  });

  test('404 page for unknown route', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
    await expect(page).toHaveTitle('Page not found · MovieDash');
    await expect(page.getByRole('button', { name: 'Back to Dashboard' })).toBeVisible();
  });

  test('back to dashboard from 404', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    await expect(page).toHaveURL('/');
  });

  /**
   * Serves the Stats page through a wrapper that throws while `window.__crashStats` is true and
   * otherwise renders the real page (loaded from the same URL plus `?real`, which this route skips).
   */
  async function crashStatsWhileFlagged(page: Page): Promise<() => boolean> {
    let served = false;
    await page.addInitScript(() => { (window as unknown as { __crashStats: boolean }).__crashStats = true; });
    await page.route((url) => url.pathname === '/src/pages/Stats.tsx' && !url.search.includes('real'), (route) => {
      served = true;
      return route.fulfill({
        contentType: 'application/javascript',
        // Calls the real page as a function so the wrapper needs no React import (bare imports aren't
        // resolved in a fulfilled body); fine because the flag only flips while Stats is unmounted.
        body: "import Real from '/src/pages/Stats.tsx?real';\n"
          + "export default function Stats(props) { if (window.__crashStats) throw new Error('stats render crash'); return Real(props); }",
      });
    });
    return () => served;
  }

  test('navigating away from a crashed page renders the new page', async ({ page }) => {
    const served = await crashStatsWhileFlagged(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Stats', exact: true }).click();
    await expect(page.getByText('Something went wrong')).toBeVisible();
    expect(served(), 'the crashing wrapper was served').toBe(true);
    await page.getByRole('link', { name: 'Movies', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Movies', exact: true })).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('re-opening the crashed section clears the error and starts from its default tab', async ({ page }) => {
    const served = await crashStatsWhileFlagged(page);
    await page.goto('/stats?tab=people');
    await expect(page.getByText('Something went wrong')).toBeVisible();
    expect(served(), 'the crashing wrapper was served').toBe(true);
    await page.evaluate(() => { (window as unknown as { __crashStats: boolean }).__crashStats = false; });
    await page.getByRole('link', { name: 'Stats', exact: true }).click();
    await waitForStats(page);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /Overview/, selected: true })).toBeVisible();
    await expect(page).toHaveURL('/stats?tab=overview');
  });

  test('a trailing slash still highlights Movies in the sidebar', async ({ page }) => {
    await page.goto('/movies/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Movies', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('a wide desktop shows the sidebar and never the bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(1);
  });

  test('sidebar collapses on trigger click', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(page.locator('.ant-layout-sider-collapsed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('sidebar toggle works from the keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Expand sidebar' });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.ant-layout-sider-collapsed')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeFocused();
  });

  test('desktop sidebar is a navigation landmark', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Movies', exact: true })).toBeVisible();
  });

  test('tablet-width load starts with the sidebar collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto('/');
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('.ant-layout-sider-collapsed')).toBeVisible();
  });

  test('collapsed sidebar brand link is named for the app and the Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto('/movies');
    await expect(page.locator('.ant-layout-sider-collapsed')).toBeVisible();
    await page.getByRole('link', { name: 'MovieDash – Dashboard', exact: true }).click();
    await expect(page).toHaveURL('/');
  });

  test('Back keeps the scroll position; a nav link opens the new section at the top', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Highlights' })).toBeVisible();
    const scrollable = () => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(await scrollable(), 'precondition: Dashboard must be scrollable').toBeGreaterThan(300);
    await page.evaluate(() => window.scrollTo(0, 300));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.getByRole('link', { name: 'Movies', exact: true }).click();
    await waitForTable(page);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    // Record every scroll position from here on: the browser may restore after an app-forced
    // scrollTo(0, 0), so the final position alone can't show whether the app jumped to the top.
    await page.evaluate(() => {
      const w = window as unknown as { __scrolls: number[] };
      w.__scrolls = [];
      addEventListener('scroll', () => w.__scrolls.push(window.scrollY));
    });
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Highlights' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const scrolls = await page.evaluate(() => (window as unknown as { __scrolls: number[] }).__scrolls);
    const firstUp = scrolls.findIndex((y) => y > 0);
    expect(scrolls.slice(firstUp).filter((y) => y === 0), `scroll positions after Back: ${scrolls.join(', ')}`).toEqual([]);

    await page.goForward();
    await waitForTable(page);
    expect(await scrollable(), 'precondition: Movies must be scrollable').toBeGreaterThan(200);
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.getByRole('link', { name: 'Stats', exact: true }).click();
    await waitForStats(page);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('page heading and document title update on navigation; the new heading takes focus', async ({ page }) => {
    await page.goto('/');
    const dashboard = page.getByRole('heading', { name: 'Dashboard', exact: true });
    await expect(dashboard).toBeVisible();
    await expect(page).toHaveTitle('Dashboard · MovieDash');
    await expect(dashboard).not.toBeFocused(); // the first page of a visit keeps normal focus

    await page.getByRole('link', { name: 'Movies', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Movies', exact: true })).toBeFocused();
    await expect(page).toHaveTitle('Movies · MovieDash');

    await page.getByRole('link', { name: 'Stats', exact: true }).click();
    const stats = page.getByRole('heading', { name: 'Statistics Dashboard', exact: true });
    await expect(stats).toBeFocused();
    await expect(page).toHaveTitle('Statistics Dashboard · MovieDash');

    // A tab switch rewrites ?tab= but isn't a new page: focus stays on the tab.
    const people = page.getByRole('tab', { name: /People/ });
    await people.click();
    await expect(people).toBeFocused();
  });

  test('the first page keeps normal focus even after Stats rewrites ?tab=', async ({ page }) => {
    await page.goto('/stats');
    await expect(page).toHaveURL(/[?&]tab=overview/);
    const stats = page.getByRole('heading', { name: 'Statistics Dashboard', exact: true });
    await expect(stats).toBeVisible();
    await expect(stats).not.toBeFocused();
    // A reload is a first page too, even though history.state now holds a non-default key.
    await page.reload();
    await expect(stats).toBeVisible();
    await expect(stats).not.toBeFocused();
  });
});

// ── Mobile ─────────────────────────────────────────────────────────────────

test.describe('Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a sort on a column hidden by narrowing is cleared, also for export', async ({ page }) => {
    // Default order Mock 01..03; by Actors/Actresses ascending: 03, 01, 02.
    const rows = [
      makeMovie(1, { 'Actors/Actresses': 'Bea' }),
      makeMovie(2, { 'Actors/Actresses': 'Cid' }),
      makeMovie(3, { 'Actors/Actresses': 'Ada' }),
    ];
    const defaultOrder = rows.map((m) => m.Name);
    await mockMovies(page, rows);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/movies');
    await waitForTable(page);
    const names = page.locator('.ant-table-row .movie-name-button');
    await page.locator('.ant-table-thead th', { hasText: 'Actors/Actresses' }).click();
    await expect(names).toHaveText([rows[2].Name, rows[0].Name, rows[1].Name]);

    await page.setViewportSize({ width: 800, height: 900 });
    await expect(page.locator('.ant-table-thead th', { hasText: 'Actors/Actresses' })).toHaveCount(0);
    await expect(names).toHaveText(defaultOrder);
    const csv = await exportCsv(page);
    const exported = csv.split('\n').slice(1).map((line) => line.split(',')[1]);
    expect(exported).toEqual(defaultOrder);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('.ant-table-thead th[aria-sort]')).toHaveCount(0);
    await expect(names).toHaveText(defaultOrder);
  });

  test('phone viewport shows BottomNav instead of the Sidebar, and its links work', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    await expect(page.locator('.ant-layout-sider')).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Movies', exact: true }).click();
    await expect(page).toHaveURL('/movies');
    await expect(nav.getByRole('link', { name: 'Movies', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Dashboard', exact: true })).not.toHaveAttribute('aria-current', 'page');
    // Below the sm breakpoint the Movies page defaults to the card grid.
    await expect(page.locator('.ant-card[role="button"]').first()).toBeVisible();

    await nav.getByRole('link', { name: 'Stats', exact: true }).click();
    await expect(page).toHaveURL('/stats');
    await expect(page.getByRole('heading', { name: 'Statistics Dashboard', exact: true })).toBeVisible();

    await nav.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page).toHaveURL('/');
  });
});

// ── Stats Page ─────────────────────────────────────────────────────────────

test.describe('Stats Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stats');
    await waitForStats(page);
  });

  test('all 6 tabs are visible', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /People/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Ratings/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Runtime/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Box Office/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Explore/ })).toBeVisible();
  });

  test('Overview tab shows stat cards and charts', async ({ page }) => {
    const pane = activeTabPane(page);
    await expect(pane.getByText('Total Movies')).toBeVisible();
    await expect(pane.getByText('Average Runtime')).toBeVisible();
    await expect(pane.getByText('Longest Runtime')).toBeVisible();
    await expect(pane.locator('canvas').first()).toBeVisible();
  });

  test('People tab loads charts', async ({ page }) => {
    await page.getByRole('tab', { name: /People/ }).click();
    const pane = activeTabPane(page);
    await expect(pane.getByText('Top 15 Actors & Actresses')).toBeVisible();
    await expect(pane.getByText('Top 15 Directors')).toBeVisible();
    await expect(pane.locator('canvas').first()).toBeVisible();
  });

  test('Ratings tab loads charts', async ({ page }) => {
    await page.getByRole('tab', { name: /Ratings/ }).click();
    const pane = activeTabPane(page);
    await expect(pane.getByText('Vote Average Distribution')).toBeVisible();
    await expect(pane.getByText('Average Vote by Language')).toBeVisible();
  });

  test('Runtime tab loads charts', async ({ page }) => {
    await page.getByRole('tab', { name: /Runtime/ }).click();
    const pane = activeTabPane(page);
    await expect(pane.getByText('Movies by Country')).toBeVisible();
    await expect(pane.getByText('Top 50 Longest Films')).toBeVisible();
  });

  test('Box Office tab loads charts', async ({ page }) => {
    await page.getByRole('tab', { name: /Box Office/ }).click();
    const pane = activeTabPane(page);
    await expect(pane.getByText('Top 20 Highest Grossing Films')).toBeVisible();
    await expect(pane.getByText('Top 20 Highest Budget Films')).toBeVisible();
  });

  test('Explore tab loads with heatmap and TopN', async ({ page }) => {
    await page.getByRole('tab', { name: /Explore/ }).click();
    const pane = activeTabPane(page);
    await expect(pane.getByText('Genre Distribution')).toBeVisible();
    await expect(pane.getByText('Year × Genre Heatmap')).toBeVisible();
    await expect(pane.getByText('Top 10 Explorer')).toBeVisible();
  });

  test('TopN explorer metric dropdown changes content', async ({ page }) => {
    await page.getByRole('tab', { name: /Explore/ }).click();
    const pane = activeTabPane(page);
    await expect(pane.getByText('Sort by:')).toBeVisible();

    await chooseOption(page, 'Top 10 metric', 'Longest Runtime');
    await expect(pane.getByText('mins').first()).toBeVisible();
  });

  test('People: count tooltips show whole numbers, not ".00"', async ({ page }) => {
    const rows = Array.from({ length: 10 }, (_, i) => makeMovie(i + 1, { 'Actors/Actresses': `Star One, Extra ${i + 1}` }));
    await mockMovies(page, rows);
    await recordCanvasText(page);
    await page.goto('/stats?tab=people');
    await waitForStats(page);
    const canvas = chartCanvas(page, 'Top 15 Actors & Actresses');
    await expect(canvas).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('actors canvas not visible');
    // "Star One" (10 movies) is the first, full-width bar: sweep down its left part until its tooltip draws.
    let texts: string[] = [];
    for (let y = box.y + 4; y < box.y + box.height / 3 && !texts.includes(' 10'); y += 4) {
      await page.mouse.move(box.x + box.width * 0.4, y);
      await nextFrames(page);
      texts = await canvasTexts(canvas);
    }
    expect(texts).toContain(' 10');
    expect(texts.filter((t) => /\.00$/.test(t))).toEqual([]);
  });

  test('switching tabs updates ?tab= without remounting the Stats page', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Statistics Dashboard', exact: true });
    await heading.evaluate((el) => { (el as HTMLElement).dataset.e2eMarker = 'mounted-once'; });
    await page.getByRole('tab', { name: /People/ }).click();
    await expect(page).toHaveURL('/stats?tab=people');
    await page.getByRole('tab', { name: /Ratings/ }).click();
    await expect(page).toHaveURL('/stats?tab=ratings');
    await expect(heading).toHaveAttribute('data-e2e-marker', 'mounted-once');
  });

  test('tab switch keeps previously loaded tab (no destroyInactiveTabPane)', async ({ page }) => {
    // Load Overview stats
    await expect(activeTabPane(page).getByText('Total Movies')).toBeVisible();

    // Switch to People
    await page.getByRole('tab', { name: /People/ }).click();
    await expect(activeTabPane(page).getByText('Top 15 Directors')).toBeVisible();

    // Switch back to Overview — should still be there (not destroyed)
    await page.getByRole('tab', { name: /Overview/ }).click();
    await expect(activeTabPane(page).getByText('Total Movies')).toBeVisible();
    // People stays mounted (hidden) rather than being destroyed.
    await expect(page.getByRole('tabpanel', { includeHidden: true }).getByText('Top 15 Directors')).toHaveCount(1);
  });

  test('year range slider narrows the scope and Reset restores the full span', async ({ page }) => {
    const movies = await fetchMovies(page);
    const span = yearSpan(movies);
    test.skip(!span || span.yearMin === span.yearMax, SINGLE_YEAR_SKIP);
    const { years, yearMin, yearMax } = span!;
    const fmt = (n: number) => page.evaluate((v) => v.toLocaleString(), n);
    const scoped = years.filter((y) => y >= yearMin + 1 && y <= yearMax).length;

    const reset = page.getByRole('button', { name: 'Reset', exact: true });
    await expect(page.getByText(`${yearMin} – ${yearMax} · ${await fmt(movies.length)} movies`)).toBeVisible();
    await expect(reset).toHaveCount(0);

    const lowerHandle = page.getByRole('slider').first();
    await lowerHandle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(`${yearMin + 1} – ${yearMax} · ${await fmt(scoped)} movies`)).toBeVisible();

    await reset.click();
    await expect(page.getByText(`${yearMin} – ${yearMax} · ${await fmt(movies.length)} movies`)).toBeVisible();
    await expect(reset).toHaveCount(0);
  });

  test('chart PNG download emits a .png file named after the chart', async ({ page }) => {
    const button = activeTabPane(page).getByRole('button', { name: /^Download .+ as PNG$/ }).first();
    await expect(button).toBeVisible();
    const title = (await button.getAttribute('aria-label'))!.replace(/^Download (.+) as PNG$/, '$1');
    const slug = slugify(title);

    const downloadPromise = page.waitForEvent('download');
    await button.click();
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toBe(`${slug}.png`);
  });

  test('per-year chart has no Unknown point and fills gap years', async ({ page }) => {
    const rows = [
      makeMovie(1, { 'Release Year': '1950', 'Release Date': '1950-03-01' }),
      makeMovie(2, { 'Release Year': '1960', 'Release Date': '1960-03-01' }),
      makeMovie(3, { 'Release Year': '2000', 'Release Date': '2000-03-01' }),
      makeMovie(4, { 'Release Year': '', 'Release Date': '' }),
    ];
    await mockMovies(page, rows);
    await recordCanvasText(page);
    await page.goto('/stats?tab=overview');
    await waitForStats(page);
    const canvas = chartCanvas(page, 'Movies Released per Year');
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvasTexts(canvas)).toContain('1950');
    const texts = await canvasTexts(canvas);
    expect(texts).not.toContain('Unknown');
    const years = texts.filter((t) => /^\d{4}$/.test(t)).map(Number);
    // Ascending, and the axis shows years with no data (gap-filled), not only 1950/1960/2000.
    expect(years.slice(0, 10)).toEqual([...years.slice(0, 10)].sort((a, b) => a - b));
    expect(years.some((y) => ![1950, 1960, 2000].includes(y))).toBe(true);
    await expect(activeTabPane(page).getByText('1950', { exact: true })).toBeVisible(); // Earliest Release card

    // No dated movie at all → Earliest/Latest Release show "—", not 0.
    await mockMovies(page, rows.map((m) => ({ ...m, 'Release Year': '', 'Release Date': '' })));
    await page.reload();
    await waitForStats(page);
    const card = activeTabPane(page).getByText('Earliest Release', { exact: true }).locator('xpath=..');
    await expect(card).toContainText('—');
    await expect(card).not.toContainText(/\b0\b/);
  });

  test('a year range with no releases shows an empty state; Reset brings the tab back', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { 'Release Year': '1950', 'Release Date': '1950-03-01' }),
      makeMovie(2, { 'Release Year': '1960', 'Release Date': '1960-03-01' }),
    ]);
    await page.goto('/stats?tab=explore');
    await waitForStats(page);
    const [lower, upper] = [page.getByRole('slider').first(), page.getByRole('slider').last()];
    await lower.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await upper.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    await expect(page.getByText('1953 – 1957 · 0 movies')).toBeVisible();
    await expect(page.getByText('No movies released in this range')).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);

    await page.getByRole('button', { name: 'Reset range' }).click();
    await expect(page.getByRole('tab', { name: /Explore/, selected: true })).toBeVisible();
    await expect(page).toHaveURL('/stats?tab=explore');
  });

  test('empty catalogue shows an empty state with a Go to Movies CTA', async ({ page }) => {
    await mockMovies(page, []);
    await page.reload();
    await expect(page.getByText('No movies yet — add one to see analytics here.')).toBeVisible();
    await expect(page.getByRole('slider')).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveCount(0);
    await page.getByRole('button', { name: 'Go to Movies' }).click();
    await expect(page).toHaveURL('/movies');
  });

  /**
   * Stats has no refresh control of its own; the TopBar retry after a failed refresh is the one way
   * the catalogue changes while Stats stays mounted. Deletes `victim` on Movies with the follow-up
   * refetch failing, then opens Stats through the sidebar (an in-app navigation).
   */
  async function openStatsWithFailedRefresh(page: Page, rows: ApiMovie[], victim: ApiMovie) {
    const setMovies = await mockMovies(page, rows);
    let failGet = false;
    await page.route('**/api/movies', (route) => (route.request().method() === 'GET' && failGet
      ? route.fulfill({ status: 500, json: { error: 'boom' } })
      : route.fallback()));
    await mockDelete(page, () => { failGet = true; });
    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-row', { hasText: victim.Name }).click();
    await confirmDrawerDelete(page);
    const retry = page.getByRole('button', { name: 'Catalogue refresh failed — retry' });
    await expect(retry).toBeVisible();
    await page.getByRole('link', { name: 'Stats', exact: true }).click();
    await waitForStats(page);
    return {
      refresh: async (next: ApiMovie[]) => { setMovies(next); failGet = false; await retry.click(); },
    };
  }

  test('the year range is clamped when a refresh shrinks the data span', async ({ page }) => {
    const rows = yearRows(2010, 2024);
    const { refresh } = await openStatsWithFailedRefresh(page, rows, rows[0]);
    await page.getByRole('slider').first().focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/^2015 – 2024 · /)).toBeVisible();

    await refresh(yearRows(2010, 2020));
    await expect(page.getByText(/^2015 – 2020 · /)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
  });

  test('a refresh that fits inside the narrowed range resets it and hides Reset', async ({ page }) => {
    const rows = yearRows(2010, 2024);
    const { refresh } = await openStatsWithFailedRefresh(page, rows, rows[0]);
    await page.getByRole('slider').first().focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/^2015 – 2024 · /)).toBeVisible();

    await refresh(yearRows(2016, 2020));
    await expect(page.getByText('2016 – 2020 · 5 movies')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toHaveCount(0);
  });

  test('Oldest ranks by release date and leaves out undated movies', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { Name: 'No Date At All', 'Release Year': '', 'Release Date': '' }),
      makeMovie(2, { Name: 'August Ninety', 'Release Year': '1990', 'Release Date': '1990-08-01' }),
      makeMovie(3, { Name: 'February Ninety', 'Release Year': '1990', 'Release Date': '1990-02-01' }),
      makeMovie(4, { Name: 'Later One', 'Release Year': '2005', 'Release Date': '2005-01-01' }),
    ]);
    await page.goto('/stats?tab=explore');
    await waitForStats(page);
    await chooseOption(page, 'Top 10 metric', 'Oldest');
    const pane = activeTabPane(page);
    await expect(pane.getByText('01-02-1990')).toBeVisible();
    await expect(pane.getByText('No Date At All')).toHaveCount(0);
    const text = (await pane.textContent()) ?? '';
    expect(text.indexOf('February Ninety')).toBeGreaterThan(-1);
    expect(text.indexOf('February Ninety')).toBeLessThan(text.indexOf('August Ninety'));
    expect(text.indexOf('August Ninety')).toBeLessThan(text.indexOf('Later One'));
  });

  test('rating averages leave out unrated films; the director drill-down still lists them', async ({ page }) => {
    const rows = [
      makeMovie(1, { Director: 'Mixed Bag', 'Vote Average': '8.0' }),
      makeMovie(2, { Director: 'Mixed Bag', 'Vote Average': '0' }),
      makeMovie(3, { Director: 'Steady A', 'Vote Average': '7.0' }),
      makeMovie(4, { Director: 'Steady A', 'Vote Average': '7.2' }),
      makeMovie(5, { Director: 'Steady B', 'Vote Average': '6.0' }),
      makeMovie(6, { Director: 'Steady B', 'Vote Average': '6.4' }),
    ];
    await mockMovies(page, rows);
    await recordCanvasText(page);
    await page.goto('/stats?tab=people');
    await waitForStats(page);
    const rated = chartCanvas(page, 'Highest Rated Directors (2+ films)');
    await expect(rated).toBeVisible();
    await rated.scrollIntoViewIfNeeded();
    await expect.poll(() => canvasTexts(rated)).toContain('Steady A');
    expect(await canvasTexts(rated)).not.toContain('Mixed Bag');

    // "Top 15 Directors" counts films, rated or not: Mixed Bag (first in the data) is the top bar.
    const byCount = chartCanvas(page, 'Top 15 Directors');
    await expect(byCount).toBeVisible();
    const pt = await findPointer(page, byCount, 'y', 0.4);
    await page.mouse.click(pt.x, pt.y);
    await expect(page).toHaveURL('/movies');
    await expect(filterChip(page, 'Mixed Bag')).toBeVisible();
    await expectTotal(page, 2);
  });

  test('language radar has no Unknown or unrated-only spoke', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { Language: 'en', 'Vote Average': '7.0' }),
      makeMovie(2, { Language: 'en', 'Vote Average': '6.0' }),
      makeMovie(3, { Language: 'ja', 'Vote Average': '8.0' }),
      makeMovie(4, { Language: '', 'Vote Average': '5.0' }),
      makeMovie(5, { Language: '', 'Vote Average': '5.5' }),
      makeMovie(6, { Language: 'fr', 'Vote Average': '0' }),
    ]);
    await recordCanvasText(page);
    await page.goto('/stats?tab=ratings');
    await waitForStats(page);
    const radar = chartCanvas(page, 'Average Vote by Language (Top 8)');
    await expect(radar).toBeVisible();
    await expect.poll(() => canvasTexts(radar)).toContain('Japanese');
    const texts = await canvasTexts(radar);
    expect(texts).toContain('English');
    expect(texts).not.toContain('Unknown');
    expect(texts).not.toContain('French');
  });

  test('average vote by year covers gap years, and a point drills down to its year', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { 'Release Year': '1962', 'Release Date': '1962-05-01', 'Vote Average': '7.0' }),
      makeMovie(2, { 'Release Year': '1971', 'Release Date': '1971-05-01', 'Vote Average': '8.0' }),
      makeMovie(3, { 'Release Year': '1966', 'Release Date': '1966-05-01', 'Vote Average': '0' }),
    ]);
    await recordCanvasText(page);
    await page.goto('/stats?tab=ratings');
    await waitForStats(page);
    const line = chartCanvas(page, 'Average Vote by Year');
    await expect(line).toBeVisible();
    await line.scrollIntoViewIfNeeded();
    await expect.poll(() => canvasTexts(line)).toContain('1962');
    const texts = await canvasTexts(line);
    for (let y = 1962; y <= 1971; y++) expect(texts, String(y)).toContain(String(y));

    // Sweeping from the left, the first clickable column is 1962 (empty years aren't targets).
    const pt = await findPointer(page, line, 'x', 0.5);
    await page.mouse.click(pt.x, pt.y);
    await expect(page).toHaveURL('/movies');
    await expect(filterChip(page, 'Year: 1962–1962')).toBeVisible();
    await expectTotal(page, 1);
  });

  test('a co-production counts toward each of its countries', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { 'Production Country': 'United Kingdom, United States of America' }),
      makeMovie(2, { 'Production Country': 'France' }),
    ]);
    await recordCanvasText(page);
    await page.goto('/stats?tab=runtime');
    await waitForStats(page);
    const polar = chartCanvas(page, 'Movies by Country');
    await expect(polar).toBeVisible();
    await polar.scrollIntoViewIfNeeded();
    await expect.poll(() => canvasTexts(polar)).toContain('United Kingdom');
    const texts = await canvasTexts(polar);
    expect(texts).toContain('United States of America');
    expect(texts).toContain('France');
    expect(texts).not.toContain('United Kingdom, United States of America');
  });

  test('Top 10 toolbar wraps at 320 px instead of squeezing the metric select', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mockMovies(page, Array.from({ length: 12 }, (_, i) => makeMovie(i + 1)));
    await page.goto('/stats?tab=explore');
    await waitForStats(page);
    const pane = activeTabPane(page);
    await expect(pane.getByText('min. 50 votes')).toBeVisible();
    const select = pane.locator('.ant-select').filter({ has: page.getByLabel('Top 10 metric') });
    await select.scrollIntoViewIfNeeded();
    const box = await select.boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

// ── Theme ──────────────────────────────────────────────────────────────────

test.describe('Theme', () => {
  const html = (page: Page) => page.locator('html');

  test('default theme follows the OS preference (dark)', async ({ page }) => {
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('the theme is painted before the app bundle runs', async ({ page }) => {
    // Without the bundle, only index.html's theme-init.js and inline style can set the theme.
    await page.route(/\/src\/main\.tsx/, (route) => route.abort());
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    const dark = await html(page).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(dark).toBe('rgb(13, 13, 26)');
    await page.evaluate(() => localStorage.setItem('movieDash_theme', 'light'));
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await expect(html(page)).toHaveCSS('color-scheme', 'light');
    await expect(html(page)).toHaveCSS('background-color', 'rgb(245, 247, 255)');
  });

  test('a first visit on a light-mode system opens in light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    expect(await savedTheme(page)).toBeNull();
  });

  test('the selected Stats tab uses the darker accent on the light theme (B203)', async ({ page }) => {
    await page.goto('/stats');
    await waitForStats(page);
    const active = page.getByRole('tab', { selected: true });
    await expect(active).toHaveCSS('color', 'rgb(129, 140, 248)');
    await page.locator('button[title*="light mode"]').click();
    await expect(active).toHaveCSS('color', 'rgb(79, 70, 229)'); // #4f46e5, after the colour transition
  });

  test('toggle switches to light theme', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[title*="light mode"]').click();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  test('theme persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[title*="light mode"]').click();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');

    // Reset to dark
    await page.locator('button[title*="dark mode"]').click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });

  const savedTheme = (page: Page) => page.evaluate(() => localStorage.getItem('movieDash_theme'));

  test('first visit saves nothing and follows OS changes live', async ({ page }) => {
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    expect(await savedTheme(page)).toBeNull();
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    expect(await savedTheme(page)).toBeNull();
  });

  test('a toggled choice wins over later OS changes, also after reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[title*="light mode"]').click();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    expect(await savedTheme(page)).toBe('light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  test('a bare "theme" key from another app on the same origin is ignored', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  });
});

// ── Persistence ────────────────────────────────────────────────────────────

test.describe('Filter Persistence', () => {
  test('search filter persists across navigation', async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);

    await searchBox(page).fill('drama');
    // The chip renders from the (immediately persisted) filter state.
    await expect(filterChip(page, 'Search: drama')).toBeVisible();

    await page.getByRole('link', { name: 'Stats' }).click();
    await expect(page).toHaveURL('/stats');
    await page.getByRole('link', { name: 'Movies' }).click();
    await waitForTable(page);

    await expect(searchBox(page)).toHaveValue('drama');

    // Cleanup
    await page.locator('button[title="Clear all filters"]').click();
  });

  test('with all site storage blocked the app loads and the theme toggle works', async ({ page }) => {
    await page.addInitScript(() => {
      for (const name of ['localStorage', 'sessionStorage']) {
        Object.defineProperty(window, name, { get() { throw new DOMException('blocked', 'SecurityError'); } });
      }
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/movies');
    await waitForTable(page);
    await searchBox(page).fill('Mock');
    await page.getByRole('link', { name: 'Stats', exact: true }).click();
    await waitForStats(page);
    await page.locator('button[title*="light mode"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('filters restore with localStorage blocked; theme toggle still works', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new DOMException('blocked', 'SecurityError'); },
      });
    });
    await page.goto('/movies');
    await waitForTable(page);
    await openFiltersDrawer(page);
    const genre = await selectInDrawer(page, 'Genre');
    await closeFiltersDrawer(page);
    const chip = filterChip(page, genre);
    await expect(chip).toBeVisible();

    await page.reload();
    await waitForTable(page);
    await expect(chip).toBeVisible();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('button[title*="light mode"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

// ── Edge Cases ─────────────────────────────────────────────────────────────

test.describe('Edge Cases', () => {
  test('an empty catalogue shows a count badge of 0', async ({ page }) => {
    await mockMovies(page, []);
    await page.goto('/');
    await expect(page.getByTitle('0 movies in catalogue')).toBeVisible();
  });

  test('corrupted saved filters fall back to defaults instead of crashing', async ({ page }) => {
    await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
      FILTERS_STORAGE_KEY,
      JSON.stringify({ genres: null, yearRange: 'x', languages: [1], search: 5 }),
    ]);
    await mockMovies(page, [makeMovie(1), makeMovie(2)]);
    await page.goto('/movies');
    await waitForTable(page);
    await expectTotal(page, 2);
    await expect(page.getByRole('list', { name: 'Active filters' })).toHaveCount(0);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('export after sorting by vote writes the highest rated first', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { 'Vote Average': '6.1' }),
      makeMovie(2, { 'Vote Average': '9.2' }),
      makeMovie(3, { 'Vote Average': '7.5' }),
    ]);
    await page.goto('/movies');
    await waitForTable(page);
    const header = page.locator('.ant-table-thead th', { hasText: 'Vote Avg' });
    await header.click();
    if ((await header.getAttribute('aria-sort')) !== 'descending') await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    const lines = (await exportCsv(page)).split('\n').slice(1).filter(Boolean);
    expect(lines.map((line) => line.split(',')[1])).toEqual(['Mock Movie 02', 'Mock Movie 03', 'Mock Movie 01']);
  });

  test('a formula-like title is exported escaped', async ({ page }) => {
    await mockMovies(page, [makeMovie(1, { Name: '=SUM(1+1)' })]);
    await page.goto('/movies');
    await waitForTable(page);
    const row = (await exportCsv(page)).split('\n')[1];
    expect(row.split(',')[1]).toBe("'=SUM(1+1)");
  });

  test('a filter change on grid page 3 returns to page 1', async ({ page }) => {
    await mockMovies(page, Array.from({ length: 40 }, (_, i) => makeMovie(i + 1)));
    await page.goto('/movies');
    await waitForTable(page);
    await page.getByText('Grid', { exact: true }).click();
    await page.locator('.ant-pagination-item-3').click();
    await expect(paginationTotal(page)).toHaveText('25–36 of 40 movies');
    await searchBox(page).fill('Mock Movie');
    await expect(paginationTotal(page)).toHaveText('1–12 of 40 movies');
  });

  test('search ignores accents', async ({ page }) => {
    await mockMovies(page, [makeMovie(1, { Name: 'Amélie' }), makeMovie(2, { Name: 'Heat' })]);
    await page.goto('/movies');
    await waitForTable(page);
    await searchBox(page).fill('amelie');
    await expectTotal(page, 1);
    await expect(page.locator('.ant-table-row')).toContainText('Amélie');
  });

  test('search ignores surrounding whitespace', async ({ page }) => {
    await mockMovies(page, [makeMovie(1), makeMovie(2), makeMovie(3)]);
    await page.goto('/movies');
    await waitForTable(page);
    await searchBox(page).fill('Mock Movie 01 ');
    await expectTotal(page, 1);
    await searchBox(page).fill(' ');
    await expectTotal(page, 3);
    await expect(filterChip(page, 'Search:')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
  });

  test('a saved genre filter on a catalogue without Genres loads with an empty result', async ({ page }) => {
    const rows = [makeMovie(1), makeMovie(2)];
    rows.forEach((r) => delete r.Genres);
    await mockMovies(page, rows);
    await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [FILTERS_STORAGE_KEY, JSON.stringify({ genres: ['Drama'] })]);
    await page.goto('/movies');
    await expect(filterChip(page, 'Genre: Drama')).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
    await expect(page.locator('.ant-table-row')).toHaveCount(0);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('runtime 0 is unknown: not in the slider span, not matched by a runtime filter', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { Name: 'Zero Runtime', Runtime: '0' }),
      makeMovie(2, { Runtime: '85' }),
      makeMovie(3, { Runtime: '88' }),
      makeMovie(4, { Runtime: '120' }),
    ]);
    await page.goto('/movies');
    await waitForTable(page);
    await expectTotal(page, 4); // no runtime filter: still listed
    await openFiltersDrawer(page);
    const runtimeHandle = page.locator('.ant-drawer-body .ant-slider').nth(2).getByRole('slider').first();
    await expect(runtimeHandle).toHaveAttribute('aria-valuemin', '85');
    await closeFiltersDrawer(page);

    await page.evaluate(([key, value]) => sessionStorage.setItem(key, value), [FILTERS_STORAGE_KEY, JSON.stringify({ runtimeRange: [85, 90] })]);
    await page.reload();
    await waitForTable(page);
    await expectTotal(page, 2);
    await expect(page.locator('.ant-table-row', { hasText: 'Zero Runtime' })).toHaveCount(0);
  });

  test('Export CSV explains itself to screen readers and names filtered exports', async ({ page }) => {
    await mockMovies(page, [makeMovie(1), makeMovie(2), makeMovie(3)]);
    await page.goto('/movies');
    await waitForTable(page);
    const exportButton = page.getByRole('button', { name: /Export CSV/i });
    await expect(exportButton).toHaveAccessibleDescription(/currently shown/);

    await page.evaluate(([key, value]) => sessionStorage.setItem(key, value), [FILTERS_STORAGE_KEY, JSON.stringify({ genres: ['Drama'] })]);
    await page.reload();
    await waitForTable(page);
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    expect((await downloadPromise).suggestedFilename()).toMatch(/^movies-filtered-\d+\.csv$/);
  });

  test('table sorts Language by the name it shows', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { Language: 'en' }),
      makeMovie(2, { Language: 'de' }),
      makeMovie(3, { Language: 'el' }),
    ]);
    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-thead th', { hasText: 'Language' }).click();
    const languageCells = await columnCells(page, 'Language');
    await expect(languageCells).toHaveText(['English', 'German', 'Greek']);
  });

  test('a row missing Genres and Release Date renders in every view', async ({ page }) => {
    const short = makeMovie(1, { Name: 'Short Row' });
    delete short.Genres;
    delete short['Release Date'];
    await mockMovies(page, [short, makeMovie(2), makeMovie(3)]);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/movies');
    await waitForTable(page);
    for (const column of ['Genres', 'Release Date']) {
      await page.locator('.ant-table-thead th', { hasText: column }).click();
      await expect(page.locator('.ant-table-row')).toHaveCount(3);
    }
    await page.locator('.ant-table-row', { hasText: 'Short Row' }).click();
    const drawer = page.locator('.ant-drawer-open');
    await expect(drawer.getByRole('heading', { name: 'Short Row' })).toBeVisible();
    await drawer.locator('.ant-drawer-close').click();
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0);

    await page.getByText('Grid', { exact: true }).click();
    await expect(page.locator('.ant-card[role="button"]')).toHaveCount(3);

    await page.goto('/stats');
    await waitForStats(page);
    for (const tab of [/Explore/, /People/]) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('tab', { name: tab, selected: true })).toBeVisible();
      await expect(page.getByText('Something went wrong')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });

  test('grid cards describe their visible details', async ({ page }) => {
    const movie = makeMovie(1, { Name: 'Described', 'Release Year': '1994', Director: 'Jane Doe' });
    await mockMovies(page, [movie]);
    await page.goto('/movies');
    await waitForTable(page);
    await page.getByText('Grid', { exact: true }).click();
    const card = page.getByRole('button', { name: 'View details for Described' });
    await expect(card).toHaveAccessibleDescription(/1994.*Jane Doe/);
    // The name is already the card's label, so the description doesn't repeat it.
    await expect(card).not.toHaveAccessibleDescription(/Described/);
  });

  test('CSV export starts with a UTF-8 BOM and guards header names', async ({ page }) => {
    await mockMovies(page, [makeMovie(1, { '=X': 'extra' }), makeMovie(2)]);
    await page.goto('/movies');
    await waitForTable(page);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/i }).click();
    const bytes = readFileSync(await (await downloadPromise).path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const header = bytes.subarray(3).toString('utf8').split('\n')[0].split(',');
    expect(header).toContain("'=X");
    expect(header).not.toContain('=X');
  });

  test("a failed first load shows the server's reason and no catalogue count", async ({ page }) => {
    const reason = 'Catalogue file could not be loaded; see server log';
    await page.route('**/api/movies', (route) => route.fulfill({ status: 500, json: { error: reason } }));
    await page.goto('/movies');
    await expect(page.getByText(reason)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.locator('[title$="movies in catalogue"]')).toHaveCount(0);
  });

  test('a failed first load still names the page and moves focus on navigation', async ({ page }) => {
    await page.route('**/api/movies', (route) => route.fulfill({ status: 500, json: { error: 'down' } }));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page).toHaveTitle('Dashboard · MovieDash');
    await page.getByRole('link', { name: 'Stats', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Statistics Dashboard', exact: true })).toBeFocused();
    await expect(page).toHaveTitle('Statistics Dashboard · MovieDash');
    await expect(page.getByText('Failed to load movies')).toBeVisible();
  });

  test('a first-load 503 is retried once automatically', async ({ page }) => {
    const rows = [makeMovie(1), makeMovie(2)];
    // 503 for every request in the first 300 ms (StrictMode's dev double-fetch lands there too);
    // only the automatic retry, ~1 s later, gets data. Without the retry the page shows the error.
    let firstAt: number | undefined;
    await page.route('**/api/movies', (route) => {
      firstAt ??= Date.now();
      return Date.now() - firstAt < 300
        ? route.fulfill({ status: 503, json: { error: 'Data still loading' } })
        : route.fulfill({ json: rows });
    });
    await page.goto('/movies');
    await waitForTable(page);
    await expectTotal(page, 2);
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
    await expect(page.getByText('Data still loading')).toHaveCount(0);
  });

  test('a 200 response that is not a list shows the load error, not the crash screen', async ({ page }) => {
    await page.route('**/api/movies', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>proxy</title>' }));
    await page.goto('/movies');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByText('Unexpected response from the server')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try Again' })).toHaveCount(0);
  });

  test('Clear all drops the search at once, without waiting for the debounce', async ({ page }) => {
    const movies = await fetchMovies(page);
    const term = movies[0].Name;
    await page.clock.install();
    await page.goto('/movies');
    await waitForTable(page);
    await page.clock.pauseAt(Date.now() + 60_000);

    await searchBox(page).fill(term);
    await page.clock.runFor(400);
    await expectTotal(page, searchMatchCount(movies, term));

    // Clock stays paused: a cleared search must not wait for the 300 ms timer.
    await page.locator('button[title="Clear all filters"]').click();
    await expect(searchBox(page)).toHaveValue('');
    await expectTotal(page, movies.length);
  });

  test('multiple filters combined', async ({ page }) => {
    const movies = await fetchMovies(page);
    await page.goto('/movies');
    await waitForTable(page);

    await searchBox(page).fill('a');
    await expectTotal(page, searchMatchCount(movies, 'a'));

    // A language among the search's matches whose name stands for one code only (B146).
    const matches = movies.filter((m) => matchesSearch(m, 'a') && m.Language);
    const codesByName = codesByLanguageName(movies);
    const code = matches.map((m) => m.Language).find((c) => codesByName.get(getLanguageName(c))!.size === 1);
    test.skip(!code, 'no search match has an unambiguous language');
    const language = getLanguageName(code!);
    const expected = matches.filter((m) => m.Language === code).length;
    expect(expected).toBeGreaterThan(0);

    await openFiltersDrawer(page);
    await selectInDrawer(page, 'Language', language);
    await closeFiltersDrawer(page);

    await expectTotal(page, expected);
    await expect(filterChip(page, 'Search: a')).toBeVisible();
    await expect(filterChip(page, language)).toBeVisible();
    const cells = await (await columnCells(page, 'Language')).allInnerTexts();
    expect(cells.length).toBe(Math.min(expected, 10));
    for (const cell of cells) expect(cell).toBe(language);
  });

  test('second page of pagination loads', async ({ page }) => {
    // 25 mocked rows guarantee a second page on any dataset (the CI template has only 5).
    await mockMovies(page, Array.from({ length: 25 }, (_, i) => makeMovie(i + 1)));
    await page.goto('/movies');
    await waitForTable(page);
    await expect(page.locator('.ant-pagination')).toBeVisible();
    await expect(paginationTotal(page)).toHaveText('1–10 of 25 movies');
    await expect(page.locator('.ant-table-row').first()).toContainText('Mock Movie 01');

    await page.locator('.ant-pagination-next').click();
    await expect(paginationTotal(page)).toHaveText('11–20 of 25 movies');
    await expect(page.locator('.ant-table-row')).toHaveCount(10);
    await expect(page.locator('.ant-table-row').first()).toContainText('Mock Movie 11');
  });

  test('sort then filter maintains sort direction', async ({ page }) => {
    const movies = await fetchMovies(page);
    await page.goto('/movies');
    await waitForTable(page);

    // Sort by Name
    const nameHeader = page.locator('th.ant-table-cell').filter({ hasText: /^Name$/ });
    await nameHeader.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

    // Apply filter (wait for the debounced search to land)
    await searchBox(page).fill('a');
    const expected = searchMatchCount(movies, 'a');
    await expectTotal(page, expected);

    // Sort indicator and order persist
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    if (expected > 1) await expectFirstTwoOrdered(page, page.locator('.ant-table-row .movie-name-button'), 1);
  });

  test('drawer shows Vote Average rating colour', async ({ page }) => {
    await mockMovies(page, [makeMovie(1, { Name: 'Well Rated', 'Vote Average': '8.5' })]);
    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-row').first().click();
    const drawer = page.getByRole('dialog');
    const tag = drawer.locator('.ant-tag').filter({ hasText: '8.5' });
    await expect(tag).toBeVisible();
    await expect(tag).toHaveClass(new RegExp(`\\bant-tag-${voteColor(8.5)}\\b`)); // green for ≥ 7
  });
});

// ── Drill-down consistency ─────────────────────────────────────────────────
// Bars live on a <canvas>, so there's no DOM element to click. The chart wrappers set
// cursor: pointer only over a clickable element, so we aim at the expected bar slot and
// confirm with the cursor before clicking. Expected counts come from the API, so these
// tests hold for any dataset (the CI template or a real CSV).

/**
 * Per-bucket counts with the app's own bucket definitions and unrated rule, and the tallest bar
 * (easiest to hit). Skips the test when nothing is rated, since then there's no bar to click.
 */
function tallestBucket(movies: ApiMovie[], buckets: readonly Bucket[]): { counts: number[]; index: number } {
  const votes = movies.map((m) => parseVote(m['Vote Average'])).filter((v): v is number => v !== null);
  const counts = countIntoBuckets(votes, buckets);
  const index = counts.indexOf(Math.max(...counts));
  test.skip(!(counts[index] > 0), 'no rated movies');
  return { counts, index };
}

async function nextFrames(page: Page) {
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}

/** Hovers (x, y) and reports whether Chart.js shows the pointer cursor there (a clickable element). */
async function isPointerAt(page: Page, canvas: Locator, x: number, y: number): Promise<boolean> {
  await page.mouse.move(x, y);
  // Wait two frames for Chart.js's hover handling, then read the cursor in the same round trip.
  const cursor = await canvas.evaluate((el) => new Promise<string>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve((el as HTMLElement).style.cursor)))));
  return cursor === 'pointer';
}

/** Clicks the index-th of `slots` vertical bars on a Chart.js bar chart (aiming within its slot). */
async function clickVerticalBar(page: Page, canvas: Locator, index: number, slots: number) {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('chart canvas not visible');
  // Plot area ≈ canvas minus y-axis labels (left) and a little right padding.
  const plotLeft = box.x + 36;
  const slot = (box.x + box.width - 8 - plotLeft) / slots;
  const cx = plotLeft + slot * (index + 0.5);
  for (const fy of [0.6, 0.7, 0.5, 0.75, 0.4, 0.3]) {
    for (const dx of [0, -0.15, 0.15, -0.3, 0.3]) {
      const x = cx + dx * slot;
      const y = box.y + box.height * fy;
      if (await isPointerAt(page, canvas, x, y)) {
        await page.mouse.click(x, y);
        return;
      }
    }
  }
  throw new Error(`no clickable bar found at slot ${index}/${slots}`);
}

/**
 * The first page x in [fromX, toX) on row `y` where `canvas` has a drawn (non-transparent) pixel and
 * the next 8 px are drawn too (so a 1 px grid line doesn't count), or null. Read in one evaluate.
 */
async function firstPaintedX(canvas: Locator, y: number, fromX: number, toX: number): Promise<number | null> {
  return canvas.evaluate((el, [y0, from, to]) => {
    const c = el as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width;
    const row = Math.round((y0 - r.top) * (c.height / r.height)); // boundingBox and getBoundingClientRect are both viewport-relative
    const data = c.getContext('2d')!.getImageData(0, row, c.width, 1).data;
    const drawn = (px: number) => data[Math.round((px - r.left) * sx) * 4 + 3] > 0;
    for (let x = from; x < to - 8; x++) {
      if ([0, 2, 4, 6, 8].every((d) => drawn(x + d))) return x;
    }
    return null;
  }, [y, fromX, toX] as const);
}

/** Moves the mouse along a line across `canvas` until Chart.js shows the pointer cursor; returns that point. */
async function findPointer(page: Page, canvas: Locator, along: 'x' | 'y', at: number): Promise<{ x: number; y: number }> {
  const [first] = await pointerRuns(page, canvas, along, at, { limit: 1 });
  if (!first) throw new Error('no clickable element found');
  return first;
}

/**
 * Sweeps a line across `canvas` (`along` the x or y axis, at fraction `at` of the other) and returns
 * the first point of each stretch where Chart.js shows the pointer cursor, i.e. one point per
 * clickable element the line crosses, in order. `limit` stops after that many; `step` is the probe
 * spacing in px (4 by default; large targets such as doughnut slices can use a coarser one).
 */
async function pointerRuns(
  page: Page, canvas: Locator, along: 'x' | 'y', at: number,
  { limit = Infinity, step = 4 }: { limit?: number; step?: number } = {},
): Promise<{ x: number; y: number }[]> {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  const len = along === 'x' ? box.width : box.height;
  const runs: { x: number; y: number }[] = [];
  let inRun = false;
  for (let d = 4; d < len - 4 && runs.length < limit; d += step) {
    const pt = along === 'x' ? { x: box.x + d, y: box.y + box.height * at } : { x: box.x + box.width * at, y: box.y + d };
    const hit = await isPointerAt(page, canvas, pt.x, pt.y);
    if (hit && !inRun) runs.push(pt);
    inRun = hit;
  }
  return runs;
}

test.describe('Drill-down consistency', () => {
  test('Dashboard rating bar opens exactly the movies it counted', async ({ page }) => {
    const movies = await fetchMovies(page);
    const { counts, index } = tallestBucket(movies, RATING_BUCKETS);
    await page.goto('/');
    const canvas = dashboardChartCanvas(page, 'Rating Distribution');
    await expect(canvas).toBeVisible();
    await clickVerticalBar(page, canvas, index, RATING_BUCKETS.length);
    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expectTotal(page, counts[index]);
    const voteChip = filterChip(page, 'Vote:');
    await expect(voteChip).toBeVisible();
    // Opening the filters drawer must not rewrite the off-step range (e.g. 3.999 → 4.0).
    const chipText = await voteChip.innerText();
    await openFiltersDrawer(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0);
    await expect(voteChip).toHaveText(chipText);
    await expectTotal(page, counts[index]);
  });

  test('moving one vote handle after a drill-down keeps the other bound exact', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { 'Vote Average': '2.5' }),
      makeMovie(2, { 'Vote Average': '3.0' }),
      makeMovie(3, { 'Vote Average': '3.5' }),
      makeMovie(4, { Name: 'Rated Four', 'Vote Average': '4.0' }),
      makeMovie(5, { 'Vote Average': '7.0' }),
    ]);
    await page.goto('/');
    const canvas = dashboardChartCanvas(page, 'Rating Distribution');
    await expect(canvas).toBeVisible();
    await clickVerticalBar(page, canvas, 1, 5); // "2–4"
    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expectTotal(page, 3);

    await openFiltersDrawer(page);
    const lowerVote = page.locator('.ant-drawer-body .ant-slider').nth(1).locator('.ant-slider-handle').first();
    await lowerVote.focus();
    await page.keyboard.press('ArrowRight');
    await closeFiltersDrawer(page);
    // The untouched upper bound stays 3.999 (not the slider's 0.1-step 4.0), so 4.0 stays out.
    await expect(filterChip(page, 'Vote:')).toContainText('Vote: 2.1–3.999');
    await expectTotal(page, 3);
    await expect(page.locator('.ant-table-row', { hasText: 'Rated Four' })).toHaveCount(0);
  });

  test('Stats drill-down carries the Release Year Range scope', async ({ page }) => {
    const movies = await fetchMovies(page);
    const span = yearSpan(movies);
    test.skip(!span || span.yearMin === span.yearMax, SINGLE_YEAR_SKIP);
    const { yearMin, yearMax } = span!;

    await page.goto('/stats?tab=ratings');
    await waitForStats(page);
    // Narrow the global year range by one year from the bottom.
    const lowerHandle = page.getByRole('slider').first();
    await lowerHandle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(new RegExp(`^${yearMin + 1} – ${yearMax} · `))).toBeVisible();

    const scoped = movies.filter((m) => {
      const y = parseInt(m['Release Year'], 10);
      return !isNaN(y) && y >= yearMin + 1 && y <= yearMax;
    });
    const { counts, index } = tallestBucket(scoped, VOTE_BUCKETS);
    const canvas = chartCanvas(page, 'Vote Average Distribution');
    await clickVerticalBar(page, canvas, index, VOTE_BUCKETS.length);

    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expect(filterChip(page, `Year: ${yearMin + 1}–${yearMax}`)).toBeVisible();
    await expect(filterChip(page, 'Vote:')).toBeVisible();
    await expectTotal(page, counts[index]);
  });

  test('a drill-down never renders the filters saved earlier in the session', async ({ page }) => {
    const saved = 'zz-saved-search-no-match';
    await page.addInitScript(([key, text]) => {
      sessionStorage.setItem(key, JSON.stringify({ search: text }));
      const w = window as unknown as { __sawSaved: boolean };
      w.__sawSaved = false;
      // Read the mutation records, not the live DOM: the saved filters may be replaced within the
      // same task, before this callback runs, so only the records still show what was rendered.
      const has = (v: string | null | undefined) => !!v && v.includes(text);
      new MutationObserver((records) => {
        if (location.pathname !== '/movies') return;
        for (const r of records) {
          const added = [...r.addedNodes].some((n) => has(n.textContent)
            || (n instanceof Element && [...n.querySelectorAll('input')].some((i) => has(i.value) || has(i.getAttribute('value')))));
          if (added || has(r.oldValue) || (r.type === 'characterData' && has(r.target.textContent))) w.__sawSaved = true;
        }
      }).observe(document, {
        subtree: true, childList: true, characterData: true, characterDataOldValue: true,
        attributes: true, attributeFilter: ['value'], attributeOldValue: true,
      });
    }, [FILTERS_STORAGE_KEY, saved]);

    const movies = await fetchMovies(page);
    const { counts, index } = tallestBucket(movies, RATING_BUCKETS);
    await page.goto('/');
    const canvas = dashboardChartCanvas(page, 'Rating Distribution');
    await expect(canvas).toBeVisible();
    await clickVerticalBar(page, canvas, index, RATING_BUCKETS.length);
    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expectTotal(page, counts[index]);
    await expect(searchBox(page)).toHaveValue('');
    expect(await page.evaluate(() => (window as unknown as { __sawSaved: boolean }).__sawSaved)).toBe(false);
  });

  test('a decade drill-down past the data is clamped like a restored range', async ({ page }) => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeMovie(i + 1, { 'Release Year': String(2015 + i), 'Release Date': `${2015 + i}-01-15` }));
    await mockMovies(page, rows);
    await page.goto('/stats?tab=runtime');
    await waitForStats(page);
    const canvas = chartCanvas(page, 'Avg Runtime by Decade');
    await clickVerticalBar(page, canvas, 1, 2); // bars: 2010s, 2020s
    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expect(filterChip(page, 'Year: 2020–2024')).toBeVisible();
    await expectTotal(page, 5);
  });

  /** Rated movies with these runtimes, so each runtime bucket that has one gets a bar. */
  const runtimeRows = (runtimes: number[]) => runtimes.map((r, i) => makeMovie(i + 1, { Runtime: String(r), 'Vote Average': '7.0' }));

  test('a 90-minute movie is in the 90–120 bar, not 60–90', async ({ page }) => {
    await mockMovies(page, runtimeRows([75, 90, 100]));
    await page.goto('/stats?tab=runtime');
    await waitForStats(page);
    const canvas = chartCanvas(page, 'Avg Vote by Runtime Length');
    await expect(canvas).toBeVisible();
    // Bars top to bottom: 60–90 (75 min), 90–120 (90 and 100 min).
    const bars = await pointerRuns(page, canvas, 'y', 0.6, { step: 8 });
    expect(bars).toHaveLength(2);
    await page.mouse.click(bars[0].x, bars[0].y);
    await expect(page).toHaveURL('/movies');
    // The lower bound is clamped to the data's shortest runtime (75); the upper bound shows 90 is out.
    await expect(filterChip(page, 'Runtime: 75–89m')).toBeVisible();
    await expectTotal(page, 1);

    await page.goBack();
    await waitForStats(page);
    await expect(canvas).toBeVisible();
    // Same data and layout, so the second bar is where the sweep found it.
    await canvas.scrollIntoViewIfNeeded();
    expect(await isPointerAt(page, canvas, bars[1].x, bars[1].y)).toBe(true);
    await page.mouse.click(bars[1].x, bars[1].y);
    await expect(page).toHaveURL('/movies');
    await expect(filterChip(page, 'Runtime: 90–100m')).toBeVisible(); // upper bound clamped to the longest runtime
    await expectTotal(page, 2);
  });

  test('the "> 180 min" bar lists every longer movie with a range the slider can show', async ({ page }) => {
    await mockMovies(page, runtimeRows([100, 200, 240]));
    await page.goto('/stats?tab=runtime');
    await waitForStats(page);
    const canvas = chartCanvas(page, 'Avg Vote by Runtime Length');
    await expect(canvas).toBeVisible();
    const bars = await pointerRuns(page, canvas, 'y', 0.6, { step: 8 });
    expect(bars).toHaveLength(2); // 90–120, > 180
    await page.mouse.click(bars[1].x, bars[1].y);
    await expect(page).toHaveURL('/movies');
    await expect(filterChip(page, 'Runtime: 180–240m')).toBeVisible();
    await expectTotal(page, 2);
    await openFiltersDrawer(page);
    const handles = page.getByRole('slider', { name: /^Runtime (minimum|maximum)$/ });
    expect(await handles.evaluateAll((els) => els.map((el) => el.getAttribute('aria-valuenow')))).toEqual(['180', '240']);
  });

  test('a decade partly outside the Release Year Range lists only the years inside it', async ({ page }) => {
    await mockMovies(page, yearRows(2003, 2012));
    await page.goto('/stats?tab=runtime');
    await waitForStats(page);
    const lower = page.getByRole('slider').first();
    await lower.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/^2005 – 2012 · /)).toBeVisible();
    const canvas = chartCanvas(page, 'Avg Runtime by Decade');
    await clickVerticalBar(page, canvas, 0, 2); // bars: 2000s, 2010s
    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expect(filterChip(page, 'Year: 2005–2009')).toBeVisible();
    await expectTotal(page, 5);
  });

  test('an "Unknown" bar has no pointer and doesn\'t navigate', async ({ page }) => {
    // Three movies with no language (the "Unknown" bar, first) and one English (clickable, second).
    await mockMovies(page, [
      ...[1, 2, 3].map((i) => makeMovie(i, { Language: '' })),
      makeMovie(4, { Language: 'en' }),
    ]);
    await page.goto('/stats?tab=overview');
    await waitForStats(page);
    const canvas = chartCanvas(page, 'Movies by Language');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('language canvas not visible');
    const runs = await pointerRuns(page, canvas, 'x', 0.85, { step: 8 });
    expect(runs, 'only the English bar is clickable').toHaveLength(1);
    expect(runs[0].x).toBeGreaterThan(box.x + box.width / 2);
    // Click where the tall Unknown bar is actually drawn in the left half: Stats stays put.
    const now = await canvas.boundingBox(); // the sweep scrolled the chart into view
    const y = now!.y + now!.height * 0.85;
    const x = await firstPaintedX(canvas, y, box.x + box.width * 0.2, box.x + box.width / 2);
    expect(x, 'the Unknown bar is drawn in the left half').not.toBeNull();
    expect(await isPointerAt(page, canvas, x! + 6, y)).toBe(false);
    await page.mouse.click(x! + 6, y);
    await expect(page).toHaveURL('/stats?tab=overview');
  });

  test('unknown ?tab= falls back to Overview and fixes the URL', async ({ page }) => {
    await page.goto('/stats?tab=bogus');
    await waitForStats(page);
    await expect(page.getByRole('tab', { name: /Overview/, selected: true })).toBeVisible();
    await expect(page).toHaveURL('/stats?tab=overview');
  });
});
