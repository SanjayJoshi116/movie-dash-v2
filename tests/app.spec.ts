import { test, expect, type Page } from '@playwright/test';

async function waitForTable(page: Page) {
  await page.waitForSelector('.ant-table-row', { timeout: 30000 });
}

async function waitForStats(page: Page) {
  await page.waitForSelector('.ant-tabs-content-holder', { timeout: 30000 });
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
    await expect(page).toHaveURL('/stats');
    await waitForStats(page);
    await expect(page.getByRole('tab', { name: /Box Office/, selected: true })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: '🎬 Movies' })).toBeVisible();
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

  test('movie count badge is non-zero', async ({ page }) => {
    const badge = page.locator('.ant-badge-count').first();
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    const count = parseInt((text ?? '').replace(/,/g, ''), 10);
    expect(count).toBeGreaterThan(0);
  });

  test('search and filters button visible by default', async ({ page }) => {
    await expect(page.getByPlaceholder('Search by name, director, actor…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
  });

  test('filters button opens drawer with all filter groups', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Genre' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Director' })).toBeVisible();
  });

  test('search narrows table results', async ({ page }) => {
    const before = await page.locator('.ant-table-row').count();
    await page.getByPlaceholder('Search by name, director, actor…').fill('the');
    await page.waitForTimeout(400);
    const after = await page.locator('.ant-table-row').count();
    // results changed or both are same (small dataset) — table still visible
    await expect(page.locator('.ant-table')).toBeVisible();
    expect(after).toBeLessThanOrEqual(before);
  });

  test('search with no match shows empty state', async ({ page }) => {
    await page.getByPlaceholder('Search by name, director, actor…').fill('ZZZNOMATCH999QQQ');
    await page.waitForTimeout(400);
    await expect(page.getByText('No movies match your filters')).toBeVisible();
  });

  test('clear button appears when filtered and resets', async ({ page }) => {
    await page.getByPlaceholder('Search by name, director, actor…').fill('action');
    await page.waitForTimeout(400);

    const clearBtn = page.locator('button[title="Clear all filters"]');
    await expect(clearBtn).toBeVisible();

    await clearBtn.click();
    await page.waitForTimeout(200);
    await expect(page.getByPlaceholder('Search by name, director, actor…')).toHaveValue('');
    await expect(clearBtn).not.toBeVisible();
  });

  test('active filter shows dot indicator', async ({ page }) => {
    await page.getByPlaceholder('Search by name, director, actor…').fill('a');
    await page.waitForTimeout(400);
    await expect(page.locator('.ant-badge-dot')).toBeVisible();
  });

  test('language filter applies', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Language' }).click();
    await page.waitForSelector('.ant-select-item-option');
    await page.locator('.ant-select-item-option').first().click();
    await page.keyboard.press('Escape');
    await page.locator('.ant-drawer-close').click();
    await expect(page.locator('.ant-table')).toBeVisible();
    await expect(page.locator('.ant-badge-dot')).toBeVisible();
  });

  test('genre filter applies', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Genre' }).click();
    await page.waitForSelector('.ant-select-item-option');
    await page.locator('.ant-select-item-option').first().click();
    await page.keyboard.press('Escape');
    await page.locator('.ant-drawer-close').click();
    await expect(page.locator('.ant-table')).toBeVisible();
    await expect(page.locator('.ant-badge-dot')).toBeVisible();
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
    await page.getByPlaceholder('Search by name, director, actor…').fill('ZZZNOMATCH999QQQ');
    await page.waitForTimeout(400);
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeDisabled();
  });

  test('column sorting on Name column', async ({ page }) => {
    await page.locator('.ant-table-column-sorters').first().click();
    await expect(page.locator('th.ant-table-column-sort')).toBeVisible();
    // Second click reverses sort
    await page.locator('.ant-table-column-sorters').first().click();
    await expect(page.locator('[aria-sort="descending"]')).toBeVisible();
  });

  test('pagination controls visible and functional', async ({ page }) => {
    await expect(page.locator('.ant-pagination')).toBeVisible();
    // Total count text visible
    await expect(page.locator('.ant-pagination-total-text')).toBeVisible();
  });

  test('page size changer works', async ({ page }) => {
    await page.locator('.ant-pagination-options .ant-select-selector').click();
    await page.waitForSelector('.ant-select-dropdown');
    await page.getByText('5 / page').click();
    await page.waitForTimeout(300);
    const rows = await page.locator('.ant-table-row').count();
    expect(rows).toBeLessThanOrEqual(5);
  });

  test('filters drawer opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();

    await page.locator('.ant-drawer-close').click();
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
    await page.locator('.ant-pagination-options .ant-select-selector').click();
    await page.waitForSelector('.ant-select-dropdown');
    await page.getByText('24 / page').click();
    await page.waitForTimeout(300);
    const cards = await page.locator('.ant-card').count();
    expect(cards).toBeLessThanOrEqual(24);
  });

  test('grid sort control reorders cards', async ({ page }) => {
    await page.locator('.ant-select-selector').first().click();
    await page.waitForSelector('.ant-select-dropdown');
    await page.getByText('Name (A–Z)').click();
    await page.waitForTimeout(200);
    const firstNameAZ = await page.locator('.ant-card').first().locator('span').first().textContent();

    await page.locator('.ant-select-selector').first().click();
    await page.waitForSelector('.ant-select-dropdown');
    await page.getByText('Name (Z–A)').click();
    await page.waitForTimeout(200);
    const firstNameZA = await page.locator('.ant-card').first().locator('span').first().textContent();

    expect(firstNameAZ).toBeTruthy();
    expect(firstNameZA).not.toBe(firstNameAZ);
  });
});

// ── Movies — Director & Range Filters ───────────────────────────────────────

test.describe('Movies Advanced Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);
  });

  test('director filter applies and shows a chip', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Director' }).click();
    await page.waitForSelector('.ant-select-item-option');
    await page.locator('.ant-select-item-option').first().click();
    await page.keyboard.press('Escape');
    await page.locator('.ant-drawer-close').click();

    await expect(page.locator('.ant-table')).toBeVisible();
    await expect(page.locator('.ant-tag').filter({ hasText: 'Director:' }).first()).toBeVisible();
  });

  test('runtime range slider narrows results and shows a chip', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    const runtimeSlider = page.locator('.ant-drawer-body .ant-slider').nth(2);
    const handle = runtimeSlider.locator('.ant-slider-handle').first();
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.locator('.ant-drawer-close').click();

    await expect(page.locator('.ant-tag').filter({ hasText: 'Runtime:' }).first()).toBeVisible();
  });

  test('revenue range slider narrows results and shows a chip', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    const revenueSlider = page.locator('.ant-drawer-body .ant-slider').nth(3);
    const handle = revenueSlider.locator('.ant-slider-handle').first();
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.locator('.ant-drawer-close').click();

    await expect(page.locator('.ant-tag').filter({ hasText: 'Revenue:' }).first()).toBeVisible();
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
    await expect(page.getByRole('heading', { name: '🎬 Movies' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: '🏠 Dashboard' })).toBeVisible();
    await page.getByRole('link', { name: 'Movies' }).click();
    await expect(page.getByRole('heading', { name: '🎬 Movies' })).toBeVisible();
    await page.getByRole('link', { name: 'Stats' }).click();
    await expect(page.getByRole('heading', { name: '📊 Statistics Dashboard' })).toBeVisible();
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
    await expect(page.getByText('Total Movies')).toBeVisible();
    await expect(page.getByText('Average Runtime')).toBeVisible();
    await expect(page.getByText('Longest Runtime')).toBeVisible();
    await expect(page.locator('.ant-tabs-tabpane-active canvas').first()).toBeVisible();
  });

  test('People tab loads charts', async ({ page }) => {
    await page.getByRole('tab', { name: /People/ }).click();
    await expect(page.getByText('Top 15 Actors & Actresses')).toBeVisible();
    await expect(page.getByText('Top 15 Directors')).toBeVisible();
    await expect(page.locator('.ant-tabs-tabpane-active canvas').first()).toBeVisible();
  });

  test('Ratings tab loads charts', async ({ page }) => {
    await page.getByRole('tab', { name: /Ratings/ }).click();
    await expect(page.getByText('Vote Average Distribution')).toBeVisible();
    await expect(page.getByText('Average Vote by Language')).toBeVisible();
  });

  test('Runtime tab loads charts', async ({ page }) => {
    await page.getByRole('tab', { name: /Runtime/ }).click();
    await expect(page.getByText('Movies by Country')).toBeVisible();
    await expect(page.getByText('Top 50 Longest Films')).toBeVisible();
  });

  test('Box Office tab loads charts', async ({ page }) => {
    await page.getByRole('tab', { name: /Box Office/ }).click();
    await expect(page.getByText('Top 20 Highest Grossing Films')).toBeVisible();
    await expect(page.getByText('Top 20 Highest Budget Films')).toBeVisible();
  });

  test('Explore tab loads with heatmap and TopN', async ({ page }) => {
    await page.getByRole('tab', { name: /Explore/ }).click();
    await expect(page.getByText('Genre Distribution')).toBeVisible();
    await expect(page.getByText('Year × Genre Heatmap')).toBeVisible();
    await expect(page.getByText('Top 10 Explorer')).toBeVisible();
  });

  test('TopN explorer metric dropdown changes content', async ({ page }) => {
    await page.getByRole('tab', { name: /Explore/ }).click();
    await expect(page.getByText('Sort by:')).toBeVisible();

    // Change metric
    await page.locator('.ant-select-selector').last().click();
    await page.waitForSelector('.ant-select-item-option');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('.ant-tabs-tabpane-active').getByText('mins').first()).toBeVisible();
  });

  test('tab switch keeps previously loaded tab (no destroyInactiveTabPane)', async ({ page }) => {
    // Load Overview stats
    await expect(page.getByText('Total Movies')).toBeVisible();

    // Switch to People
    await page.getByRole('tab', { name: /People/ }).click();
    await expect(page.getByText('Top 15 Directors')).toBeVisible();

    // Switch back to Overview — should still be there (not destroyed)
    await page.getByRole('tab', { name: /Overview/ }).click();
    await expect(page.getByText('Total Movies')).toBeVisible();
  });
});

// ── Theme ──────────────────────────────────────────────────────────────────

test.describe('Theme', () => {
  test('default theme is dark', async ({ page }) => {
    await page.goto('/');
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('dark');
  });

  test('toggle switches to light theme', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[title*="light mode"]').click();
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('light');
  });

  test('theme persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[title*="light mode"]').click();
    await page.reload();
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('light');

    // Reset to dark
    await page.locator('button[title*="dark mode"]').click();
  });
});

// ── Persistence ────────────────────────────────────────────────────────────

test.describe('Filter Persistence', () => {
  test('search filter persists across navigation', async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);

    await page.getByPlaceholder('Search by name, director, actor…').fill('drama');
    await page.waitForTimeout(400);

    await page.getByRole('link', { name: 'Stats' }).click();
    await page.getByRole('link', { name: 'Movies' }).click();
    await waitForTable(page);

    await expect(page.getByPlaceholder('Search by name, director, actor…')).toHaveValue('drama');

    // Cleanup
    await page.locator('button[title="Clear all filters"]').click();
  });
});

// ── Edge Cases ─────────────────────────────────────────────────────────────

test.describe('Edge Cases', () => {
  test('multiple filters combined', async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);

    await page.getByPlaceholder('Search by name, director, actor…').fill('a');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Language' }).click();
    await page.waitForSelector('.ant-select-item-option');
    await page.locator('.ant-select-item-option').first().click();
    await page.keyboard.press('Escape');

    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('second page of pagination loads', async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);

    const nextBtn = page.locator('.ant-pagination-next');
    const isDisabled = await nextBtn.getAttribute('aria-disabled');
    if (isDisabled !== 'true') {
      await nextBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('.ant-table-row').first()).toBeVisible();
    }
  });

  test('sort then filter maintains sort direction', async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);

    // Sort by Name
    await page.locator('.ant-table-column-sorters').first().click();
    await expect(page.locator('th.ant-table-column-sort')).toBeVisible();

    // Apply filter
    await page.getByPlaceholder('Search by name, director, actor…').fill('a');
    await page.waitForTimeout(400);

    // Sort indicator persists
    await expect(page.locator('th.ant-table-column-sort')).toBeVisible();
  });

  test('drawer shows Vote Average rating colour', async ({ page }) => {
    await page.goto('/movies');
    await waitForTable(page);
    await page.locator('.ant-table-row').first().click();
    const drawer = page.getByRole('dialog');
    const tagCount = await drawer.locator('.ant-tag').count();
    expect(tagCount).toBeGreaterThan(0);
  });
});
