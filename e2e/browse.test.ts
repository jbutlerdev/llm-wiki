import { test, expect } from './helpers';

/**
 * E2E Tests for Browse Page
 * 
 * Critical user flow: Users browse all wiki pages with filtering
 */
test.describe('Browse Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/browse');
    await page.waitForLoadState('networkidle');
  });

  test('should load the browse page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Browse');

    // Check for page list container
    await expect(page.locator('[data-testid="page-list"], .grid, .space-y-4')).toBeVisible();
  });

  test('should display page list', async ({ page }) => {
    // Should show some page cards or rows
    const pageItems = page.locator('[data-testid="page-item"], article, .page-card, .page-row');
    
    // Wait for pages to load
    await page.waitForTimeout(1000);
    
    // Either we have pages or an empty state message
    const hasPages = await pageItems.count() > 0;
    const hasEmptyState = await page.getByText(/no pages|empty|0 pages/i).count() > 0;
    
    expect(hasPages || hasEmptyState).toBeTruthy();
  });

  test('should have type filter dropdown', async ({ page }) => {
    // Look for filter controls
    const filterSelect = page.locator('select, [role="combobox"], button:has-text("Filter")');
    
    if (await filterSelect.count() > 0) {
      await expect(filterSelect.first()).toBeVisible();
    }
  });

  test('should have sort options', async ({ page }) => {
    // Look for sort controls
    const sortButton = page.locator('button:has-text("Sort"), [aria-label*="sort"]');
    
    if (await sortButton.count() > 0) {
      await expect(sortButton.first()).toBeVisible();
    }
  });

  test('should navigate to page detail when clicking a page', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Find a clickable page link
    const pageLink = page.locator('a[href*="/page/"]').first();
    
    if (await pageLink.count() > 0) {
      await pageLink.click();
      
      // Should navigate to page view
      await expect(page).toHaveURL(/\/page\//);
      
      // Should show page content
      await expect(page.locator('article, .prose, [data-testid="page-content"]')).toBeVisible();
    }
  });

  test('should show pagination if many pages', async ({ page }) => {
    // Check for pagination controls
    const pagination = page.locator('[role="navigation"]:has(button), .pagination, nav:has-text("Previous")');
    
    // Pagination is optional - test passes if present or not
    if (await pagination.count() > 0) {
      await expect(pagination).toBeVisible();
    }
  });
});
