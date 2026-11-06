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
  test('Add Movie: search, import, Added state and refetch', async ({ page }) => {
    const base = [makeMovie(1), makeMovie(2)];
    const imported = makeMovie(3, { 'Movie ID': '999001', Name: 'Mock Import One' });
    const setMovies = await mockMovies(page, base);

    const seen: { searchUrl?: URL; importBody?: unknown } = {};
    await page.route(/\/api\/tmdb\/search(\?|$)/, (route) => {
      seen.searchUrl = new URL(route.request().url());
      return route.fulfill({
        json: {
          results: [
            { id: 999001, title: 'Mock Import One', year: '2024', language: 'en', posterUrl: '', alreadyImported: false },
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
    await page.getByRole('button', { name: 'Add Movie' }).click();
    const modal = page.getByRole('dialog', { name: 'Add Movie from TMDB' });
    await expect(modal).toBeVisible();

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
    await page.getByRole('link', { name: 'Dashboard' }).click();
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

  test('phone viewport shows BottomNav instead of the Sidebar, and its links work', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    await expect(page.locator('.ant-layout-sider')).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Movies' }).click();
    await expect(page).toHaveURL('/movies');
    await expect(nav.getByRole('link', { name: 'Movies' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
    // Below the sm breakpoint the Movies page defaults to the card grid.
    await expect(page.locator('.ant-card[role="button"]').first()).toBeVisible();

    await nav.getByRole('link', { name: 'Stats' }).click();
    await expect(page).toHaveURL('/stats');
    await expect(page.getByRole('heading', { name: 'Statistics Dashboard', exact: true })).toBeVisible();

    await nav.getByRole('link', { name: 'Dashboard' }).click();
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
});

// ── Edge Cases ─────────────────────────────────────────────────────────────

test.describe('Edge Cases', () => {
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

  test('unknown ?tab= falls back to Overview and fixes the URL', async ({ page }) => {
    await page.goto('/stats?tab=bogus');
    await waitForStats(page);
    await expect(page.getByRole('tab', { name: /Overview/, selected: true })).toBeVisible();
    await expect(page).toHaveURL('/stats?tab=overview');
  });
});
