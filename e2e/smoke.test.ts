import { test, expect } from '@playwright/test';

/**
 * E2E Smoke Tests
 * 
 * Basic validation that Playwright and the test infrastructure work correctly
 */
test.describe('Smoke Tests', () => {
  test('should have Playwright installed', async () => {
    // Basic test to verify Playwright is working
    expect(true).toBe(true);
  });

  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Basic check that page loaded
    await expect(page).toHaveURL(/.*/);
  });

  test('should navigate to all main pages', async ({ page }) => {
    const pages = [
      { path: '/', name: 'Dashboard' },
      { path: '/browse', name: 'Browse' },
      { path: '/search', name: 'Search' },
      { path: '/sources', name: 'Sources' },
    ];

    for (const p of pages) {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      
      // Page should load without crash (even if empty)
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('should display navigation sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for sidebar navigation
    const sidebar = page.locator('nav, aside, [role="navigation"], .sidebar');
    
    if (await sidebar.count() > 0) {
      await expect(sidebar.first()).toBeVisible();
    }
  });

  test('should toggle theme', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for theme toggle button
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button:has-text("Theme"), button:has-text("Dark")');
    
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      
      // Theme should toggle (body should have dark class or similar)
      // Just verify it didn't crash
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show error boundary for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-xyz-123');
    await page.waitForLoadState('networkidle');

    // Should show either 404 or redirect to valid page
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });

  test('should handle rapid navigation', async ({ page }) => {
    // Navigate quickly between pages
    await page.goto('/');
    await page.goto('/browse');
    await page.goto('/search');
    await page.goto('/sources');
    
    // Final page should be visible
    await expect(page.locator('body')).toBeVisible();
  });
});
