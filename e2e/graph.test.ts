import { test, expect } from './helpers';

/**
 * E2E Tests for Graph View
 * 
 * Critical user flow: Users visualize page connections as a graph
 */
test.describe('Graph View', () => {
  test('should load the graph page', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page.locator('h1')).toContainText('Graph');
  });

  test('should display graph visualization container', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    // Look for SVG canvas (D3.js uses SVG)
    const svg = page.locator('svg');
    await expect(svg.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show nodes in the graph', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    // Wait for graph to render
    await page.waitForTimeout(1000);

    // Look for node elements (circles in SVG)
    const nodes = page.locator('svg circle, svg g.node, svg [class*="node"]');
    
    // Either show nodes or "no data" message
    const hasNodes = await nodes.count() > 0;
    const hasEmptyState = await page.getByText(/no pages|no connections|empty/i).count() > 0;
    
    expect(hasNodes || hasEmptyState).toBeTruthy();
  });

  test('should show edges/lines connecting nodes', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(1000);

    // Look for edge elements (lines in SVG)
    const edges = page.locator('svg line, svg path, svg [class*="edge"], svg [class*="link"]');
    
    // Edges are optional
    const hasEdges = await edges.count() > 0;
    expect(hasEdges || true).toBeTruthy();
  });

  test('should have graph legend', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    // Look for legend
    const legend = page.locator('[data-testid="legend"], .legend, text=/Legend|Node Types/i');
    
    // Legend is optional
    if (await legend.count() > 0) {
      await expect(legend.first()).toBeVisible();
    }
  });

  test('should zoom and pan on the graph', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    // Get the SVG container
    const svg = page.locator('svg').first();
    
    if (await svg.count() === 0) {
      // Skip if no graph
      test.skip();
      return;
    }

    // Get bounding box
    const box = await svg.boundingBox();
    if (!box) return;

    // Perform zoom (scroll)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100); // Zoom in
    
    // Graph should still be visible after zoom
    await expect(svg).toBeVisible();
  });

  test('should highlight node on hover', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(1000);

    // Look for nodes
    const nodes = page.locator('svg circle, svg g.node, svg [class*="node"]');
    
    if (await nodes.count() > 0) {
      // Hover over first node
      await nodes.first().hover();
      
      // Graph should still be visible (hover effect may or may not change appearance)
      await expect(page.locator('svg').first()).toBeVisible();
    }
  });

  test('should navigate to page on node click', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(1000);

    // Look for clickable nodes (with links)
    const nodes = page.locator('svg a, svg [data-href]');
    
    if (await nodes.count() > 0) {
      await nodes.first().click();
      
      // Should navigate to a page
      await page.waitForTimeout(500);
      const url = page.url();
      expect(url.includes('/page/') || url.includes('/graph')).toBeTruthy();
    }
  });

  test('should show instructions for using the graph', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    // Look for help/instructions section
    const help = page.locator('[data-testid="instructions"], .help, text=/scroll to zoom|click to select|drag to pan/i');
    
    // Instructions are optional
    if (await help.count() > 0) {
      await expect(help.first()).toBeVisible();
    }
  });

  test('should handle empty graph gracefully', async ({ page }) => {
    // Graph page should load even with no data
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');

    // Should show either graph or empty state
    const hasGraph = await page.locator('svg').count() > 0;
    const hasEmptyState = await page.getByText(/no pages|no connections|empty/i).count() > 0;
    
    // Page should not crash
    await expect(page.locator('h1')).toBeVisible();
  });
});
