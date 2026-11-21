import { readFileSync } from 'node:fs';
import type { Page, Locator } from '@playwright/test';
import {
  test,
  expect,
  type ApiMovie,
  searchBox,
  activeTabPane,
  waitForTable,
  waitForStats,
  openFiltersDrawer,
  closeFiltersDrawer,
  selectInDrawer,
  chooseOption,
  fetchMovies,
  movieTotal,
  expectTotal,
  makeMovie,
  mockMovies,
  searchMatchCount,
  yearSpan,
  paginationTotal,
  setPageSize,
} from './helpers';
import { getLanguageName } from '../src/utils/languages';
import { slugify } from '../src/utils/slugify';

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
    await expect(page.locator('.ant-tag').filter({ hasText: 'Year: 2020–2020' })).toBeVisible();
    await expectTotal(page, 1);
  });

  test('the single-series rating distribution draws no legend', async ({ page }) => {
    await recordCanvasText(page);
    await page.goto('/');
    const canvas = page.getByText('Rating Distribution', { exact: true }).locator('xpath=..').locator('canvas');
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

    const expected = movies.filter((m) => m.Language && getLanguageName(m.Language) === language).length;
    expect(expected, `precondition: "${language}" must not cover every movie`).toBeLessThan(movies.length);
    expect(expected).toBeGreaterThan(0);
    await expectTotal(page, expected);

    const cells = await page.locator('.ant-table-row td:nth-child(3)').allInnerTexts();
    expect(cells.length).toBe(Math.min(expected, 10));
    for (const cell of cells) expect(cell).toBe(language);
  });

  test('genre filter narrows to matching rows', async ({ page }) => {
    const movies = await fetchMovies(page);
    await openFiltersDrawer(page);
    const genre = await selectInDrawer(page, 'Genre');
    await closeFiltersDrawer(page);

    const genresOf = (s: string) => s.split(',').map((g) => g.trim());
    const expected = movies.filter((m) => genresOf(m.Genres ?? '').includes(genre)).length;
    expect(expected, `precondition: "${genre}" must not cover every movie`).toBeLessThan(movies.length);
    expect(expected).toBeGreaterThan(0);
    await expectTotal(page, expected);

    // Genres is the 6th column (shown from the md breakpoint up — the desktop viewport).
    const cells = await page.locator('.ant-table-row td:nth-child(6)').allInnerTexts();
    expect(cells.length).toBe(Math.min(expected, 10));
    for (const cell of cells) expect(genresOf(cell)).toContain(genre);
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
    expect(dl.suggestedFilename()).toMatch(/movies-filtered.*\.csv/);
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

  test('pagination controls visible and functional', async ({ page }) => {
    await expect(page.locator('.ant-pagination')).toBeVisible();
    // Total count text visible
    await expect(paginationTotal(page)).toBeVisible();
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
  test.beforeEach(async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);
  });

  test('director filter applies and shows a chip', async ({ page }) => {
    await openFiltersDrawer(page);
    const director = await selectInDrawer(page, 'Director');
    await closeFiltersDrawer(page);

    await expect(page.locator('.ant-table')).toBeVisible();
    await expect(page.locator('.ant-tag').filter({ hasText: `Director: ${director}` }).first()).toBeVisible();
  });

  test('runtime range slider narrows results and shows a chip', async ({ page }) => {
    await openFiltersDrawer(page);
    const runtimeSlider = page.locator('.ant-drawer-body .ant-slider').nth(2);
    const handle = runtimeSlider.locator('.ant-slider-handle').first();
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await closeFiltersDrawer(page);

    await expect(page.locator('.ant-tag').filter({ hasText: 'Runtime:' }).first()).toBeVisible();
  });

  test('revenue range slider narrows results and shows a chip', async ({ page }) => {
    await openFiltersDrawer(page);
    const revenueSlider = page.locator('.ant-drawer-body .ant-slider').nth(3);
    const handle = revenueSlider.locator('.ant-slider-handle').first();
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await closeFiltersDrawer(page);

    await expect(page.locator('.ant-tag').filter({ hasText: 'Revenue:' }).first()).toBeVisible();
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
    const fresh = modal.locator('.ant-list-item').filter({ hasText: 'Mock Import One' });
    const existing = modal.locator('.ant-list-item').filter({ hasText: 'Mock Already There' });
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

  test('Delete: Popconfirm, refetch, drawer closes and the row is gone', async ({ page }) => {
    const rows = [makeMovie(1), makeMovie(2), makeMovie(3)];
    const victim = rows[1];
    const setMovies = await mockMovies(page, rows);
    const deleted: string[] = [];
    await page.route('**/api/movies/*', (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      deleted.push(new URL(route.request().url()).pathname);
      setMovies(rows.filter((m) => m !== victim));
      return route.fulfill({ json: { ok: true } });
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
    expect(deleted).toEqual([`/api/movies/${victim['Movie ID']}`]);
    await expectTotal(page, 2);
    await expect(page.locator('.ant-table-row', { hasText: victim.Name })).toHaveCount(0);
    await expect(page.getByTitle('2 movies in catalogue')).toBeVisible();
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

    const items = modal.locator('.ant-list-item');
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
    const row = modal.locator('.ant-list-item').filter({ hasText: 'Added Elsewhere' });
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
    await page.route('**/api/movies/*', (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      setMovies(base);
      return route.fulfill({ json: { ok: true } });
    });

    await page.goto('/movies');
    await waitForTable(page);
    const modal = await openAddMovie(page);
    await modal.getByPlaceholder('Movie name').fill('Short');
    await modal.getByRole('button', { name: 'Search' }).click();
    const row = modal.locator('.ant-list-item').filter({ hasText: 'Short Lived' });
    await row.getByRole('button', { name: 'Import' }).click();
    await expect(row.getByText('Added', { exact: true })).toBeVisible();
    await expect(page.getByTitle('3 movies in catalogue')).toBeVisible();
    await modal.locator('.ant-modal-footer').getByRole('button', { name: 'Close' }).click();
    await expect(modal).not.toBeVisible();

    await page.locator('.ant-table-row', { hasText: 'Short Lived' }).click();
    const drawer = page.locator('.ant-drawer-open');
    await drawer.getByRole('button', { name: 'Delete' }).click();
    await page.locator('.ant-popconfirm').getByRole('button', { name: 'Delete' }).click();
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
    const items = modal.locator('.ant-list-item');
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
    await page.route('**/api/movies/*', async (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      await deleteHeld;
      setMovies(rows.filter((m) => m !== a));
      return route.fulfill({ json: { ok: true } });
    });

    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-row', { hasText: a.Name }).click();
    const drawer = page.locator('.ant-drawer-open');
    await expect(drawer.getByRole('heading', { name: a.Name })).toBeVisible();
    await drawer.getByRole('button', { name: 'Delete' }).click();
    await page.locator('.ant-popconfirm').getByRole('button', { name: 'Delete' }).click();
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
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Dashboard' })).toBeVisible();
  });

  test('back to dashboard from 404', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    await expect(page).toHaveURL('/');
  });

  test('sidebar collapses on trigger click', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ant-layout-sider');
    await page.locator('.ant-layout-sider-trigger').click();
    await expect(page.locator('.ant-layout-sider-collapsed')).toBeVisible();
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

  test('page title updates on navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Movies' }).click();
    await expect(page.getByRole('heading', { name: 'Movies', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Stats' }).click();
    await expect(page.getByRole('heading', { name: 'Statistics Dashboard', exact: true })).toBeVisible();
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
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/i }).click();
    const csv = readFileSync(await (await downloadPromise).path(), 'utf8');
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
    const canvas = activeTabPane(page).getByRole('heading', { name: 'Top 15 Actors & Actresses' })
      .locator('xpath=../..').locator('canvas');
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
    const { years, yearMin, yearMax } = yearSpan(movies);
    expect(yearMax, 'precondition: dataset must span more than one year').toBeGreaterThan(yearMin);
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
});

// ── Theme ──────────────────────────────────────────────────────────────────

test.describe('Theme', () => {
  const html = (page: Page) => page.locator('html');

  test('default theme follows the OS preference (dark)', async ({ page }) => {
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
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
    await expect(page.locator('.ant-tag').filter({ hasText: 'Search: drama' })).toBeVisible();

    await page.getByRole('link', { name: 'Stats' }).click();
    await expect(page).toHaveURL('/stats');
    await page.getByRole('link', { name: 'Movies' }).click();
    await waitForTable(page);

    await expect(searchBox(page)).toHaveValue('drama');

    // Cleanup
    await page.locator('button[title="Clear all filters"]').click();
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
    const chip = page.locator('.ant-tag').filter({ hasText: genre });
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
  test('table sorts Language by the name it shows', async ({ page }) => {
    await mockMovies(page, [
      makeMovie(1, { Language: 'en' }),
      makeMovie(2, { Language: 'de' }),
      makeMovie(3, { Language: 'el' }),
    ]);
    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-thead th', { hasText: 'Language' }).click();
    const languageCells = page.locator('.ant-table-row td:nth-child(3)');
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

    await openFiltersDrawer(page);
    const language = await selectInDrawer(page, 'Language');
    await closeFiltersDrawer(page);

    await expect(page.locator('.ant-tag').filter({ hasText: 'Search: a' })).toBeVisible();
    await expect(page.locator('.ant-tag').filter({ hasText: language })).toBeVisible();
    const cells = await page.locator('.ant-table-row td:nth-child(3)').allInnerTexts();
    for (const cell of cells) expect(cell).toBe(language);
  });

  test('second page of pagination loads', async ({ page }) => {
    // 25 mocked rows guarantee a second page on any dataset (the CI template has only 5).
    await mockMovies(page, Array.from({ length: 25 }, (_, i) => makeMovie(i + 1)));
    await page.goto('/movies');
    await waitForTable(page);
    await expect(paginationTotal(page)).toHaveText('1–10 of 25 movies');

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
    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-row').first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.locator('.ant-tag').first()).toBeVisible();
  });
});

// ── Drill-down consistency ─────────────────────────────────────────────────
// Bars live on a <canvas>, so there's no DOM element to click. The chart wrappers set
// cursor: pointer only over a clickable element, so we aim at the expected bar slot and
// confirm with the cursor before clicking. Expected counts come from the API, so these
// tests hold for any dataset (the CI template or a real CSV).

// Same half-open bucketing as the charts: [i*width, (i+1)*width), last bucket open-ended, 0 = unrated.
function voteBucketCounts(movies: ApiMovie[], bucketCount: number, width: number): number[] {
  const counts = Array(bucketCount).fill(0);
  movies.forEach((m) => {
    const v = parseFloat(m['Vote Average']);
    if (isNaN(v) || v <= 0) return;
    counts[Math.min(Math.floor(v / width), bucketCount - 1)] += 1;
  });
  return counts;
}

async function nextFrames(page: Page) {
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
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
      await page.mouse.move(x, y);
      await nextFrames(page);
      if ((await canvas.evaluate((el) => (el as HTMLElement).style.cursor)) === 'pointer') {
        await page.mouse.click(x, y);
        return;
      }
    }
  }
  throw new Error(`no clickable bar found at slot ${index}/${slots}`);
}

test.describe('Drill-down consistency', () => {
  test('Dashboard rating bar opens exactly the movies it counted', async ({ page }) => {
    const movies = await fetchMovies(page);
    const counts = voteBucketCounts(movies, 5, 2);
    const index = counts.indexOf(Math.max(...counts)); // tallest bar = easiest to hit
    await page.goto('/');
    const canvas = page.getByText('Rating Distribution', { exact: true }).locator('xpath=..').locator('canvas');
    await expect(canvas).toBeVisible();
    await clickVerticalBar(page, canvas, index, 5);
    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expectTotal(page, counts[index]);
    const voteChip = page.locator('.ant-tag').filter({ hasText: 'Vote:' });
    await expect(voteChip).toBeVisible();
    // Opening the filters drawer must not rewrite the off-step range (e.g. 3.999 → 4.0).
    const chipText = await voteChip.innerText();
    await openFiltersDrawer(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0);
    await expect(voteChip).toHaveText(chipText);
    await expectTotal(page, counts[index]);
  });

  test('Stats drill-down carries the Release Year Range scope', async ({ page }) => {
    const movies = await fetchMovies(page);
    const { yearMin, yearMax } = yearSpan(movies);
    test.skip(yearMin === yearMax, 'dataset spans a single year — the range slider is disabled');

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
    const counts = voteBucketCounts(scoped, 10, 1);
    const index = counts.indexOf(Math.max(...counts));
    const canvas = activeTabPane(page)
      .getByRole('heading', { name: 'Vote Average Distribution' })
      .locator('xpath=../..').locator('canvas');
    await clickVerticalBar(page, canvas, index, 10);

    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expect(page.locator('.ant-tag').filter({ hasText: `Year: ${yearMin + 1}–${yearMax}` })).toBeVisible();
    await expect(page.locator('.ant-tag').filter({ hasText: 'Vote:' })).toBeVisible();
    await expectTotal(page, counts[index]);
  });

  test('a drill-down never renders the filters saved earlier in the session', async ({ page }) => {
    const saved = 'zz-saved-search-no-match';
    await page.addInitScript((text) => {
      sessionStorage.setItem('movieDash_filters_v2', JSON.stringify({ search: text }));
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
    }, saved);

    const movies = await fetchMovies(page);
    const counts = voteBucketCounts(movies, 5, 2);
    const index = counts.indexOf(Math.max(...counts));
    await page.goto('/');
    const canvas = page.getByText('Rating Distribution', { exact: true }).locator('xpath=..').locator('canvas');
    await expect(canvas).toBeVisible();
    await clickVerticalBar(page, canvas, index, 5);
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
    const canvas = activeTabPane(page)
      .getByRole('heading', { name: 'Avg Runtime by Decade' })
      .locator('xpath=../..').locator('canvas');
    await clickVerticalBar(page, canvas, 1, 2); // bars: 2010s, 2020s
    await expect(page).toHaveURL('/movies');
    await waitForTable(page);
    await expect(page.locator('.ant-tag').filter({ hasText: 'Year: 2020–2024' })).toBeVisible();
    await expectTotal(page, 5);
  });

  test('unknown ?tab= falls back to Overview and fixes the URL', async ({ page }) => {
    await page.goto('/stats?tab=bogus');
    await waitForStats(page);
    await expect(page.getByRole('tab', { name: /Overview/, selected: true })).toBeVisible();
    await expect(page).toHaveURL('/stats?tab=overview');
  });
});
