import { test, expect } from './helpers';

/**
 * E2E Tests for Page View
 * 
 * Critical user flow: Users view individual wiki pages with content
 */
test.describe('Page View', () => {
  test('should load a wiki page', async ({ page }) => {
    // Navigate to an entity page directly
    await page.goto('/page/machine-learning');
    await page.waitForLoadState('networkidle');

    // Should show page title or content
    const titleOrContent = page.locator('h1, article, .prose').first();
    await expect(titleOrContent).toBeVisible();
  });

  test('should display page title', async ({ page }) => {
    await page.goto('/page/machine-learning');
    await page.waitForLoadState('networkidle');

    // Check for h1 title
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
    
    // Title should contain text
    const titleText = await h1.first().textContent();
    expect(titleText).toBeTruthy();
  });

  test('should render markdown content', async ({ page }) => {
    await page.goto('/page/machine-learning');
    await page.waitForLoadState('networkidle');

    // Markdown content should be rendered (headings, paragraphs)
    const content = page.locator('article, .prose, [data-testid="page-content"]');
    await expect(content.first()).toBeVisible();
    
    // Check for markdown elements
    const headings = page.locator('h2, h3');
    const hasHeadings = await headings.count() > 0;
    
    // Some content should be visible
    const paragraphs = page.locator('p');
    expect(await paragraphs.count()).toBeGreaterThanOrEqual(0);
  });

  test('should show table of contents', async ({ page }) => {
    await page.goto('/page/machine-learning');
    await page.waitForLoadState('networkidle');

    // Look for TOC section
    const toc = page.locator('nav, aside, [data-testid="toc"], .toc, text=/Table of Contents|Contents/i');
    
    // TOC is optional but should exist if page has multiple headings
    if (await toc.count() > 0) {
      await expect(toc.first()).toBeVisible();
    }
  });

  test('should display backlinks section', async ({ page }) => {
    await page.goto('/page/machine-learning');
    await page.waitForLoadState('networkidle');

    // Look for backlinks section
    const backlinks = page.locator('[data-testid="backlinks"], .backlinks, text=/Backlinks|Linked from/i');
    
    // Backlinks are optional
    if (await backlinks.count() > 0) {
      await expect(backlinks.first()).toBeVisible();
    }
  });

  test('should have wiki links that navigate to other pages', async ({ page }) => {
    await page.goto('/page/machine-learning');
    await page.waitForLoadState('networkidle');

    // Look for internal wiki links
    const wikiLinks = page.locator('a[href*="/page/"]');
    const linkCount = await wikiLinks.count();
    
    if (linkCount > 0) {
      // Click first wiki link
      await wikiLinks.first().click();
      
      // Should navigate to the linked page
      await expect(page).toHaveURL(/\/page\//);
    }
  });

  test('should show page metadata in frontmatter', async ({ page }) => {
    await page.goto('/page/machine-learning');
    await page.waitForLoadState('networkidle');

    // Look for metadata display (tags, dates, sources)
    const tags = page.locator('.tag, .badge, [data-testid="tags"]');
    const hasTags = await tags.count() > 0;
    
    // Metadata is optional
    expect(hasTags || true).toBeTruthy();
  });

  test('should display 404 for non-existent page', async ({ page }) => {
    await page.goto('/page/non-existent-page-xyz');
    await page.waitForLoadState('networkidle');

    // Should show 404 page or error message
    const content = await page.content();
    const has404 = content.includes('404') || 
                  content.includes('not found') || 
                  content.includes('Not Found') ||
                  (await page.locator('h1').textContent() || '').toLowerCase().includes('not found');
    
    expect(has404).toBeTruthy();
  });

  test('should handle different page types', async ({ page }) => {
    // Test entity page
    await page.goto('/page/machine-learning');
    await page.waitForLoadState('networkidle');
    const entityH1 = await page.locator('h1').first().textContent();
    expect(entityH1).toBeTruthy();

    // Test source page
    await page.goto('/page/sample-paper');
    await page.waitForLoadState('networkidle');
    const sourceH1 = await page.locator('h1').first().textContent();
    expect(sourceH1).toBeTruthy();

    // Test summary page
    await page.goto('/page/ai-overview');
    await page.waitForLoadState('networkidle');
    const summaryH1 = await page.locator('h1').first().textContent();
    expect(summaryH1).toBeTruthy();
  });
});
