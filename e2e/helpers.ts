import { test as base, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Custom test fixtures for E2E testing
 */
export interface TestFixtures {
  wikiDir: string;
  testWiki: TestWiki;
}

export interface TestWiki {
  path: string;
  cleanup: () => void;
}

/**
 * Create a test wiki with sample data
 */
async function createTestWiki(): Promise<TestWiki> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-wiki-e2e-'));
  
  // Create basic wiki structure
  const wikiDir = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(wikiDir, { recursive: true });
  fs.mkdirSync(path.join(wikiDir, 'wiki'), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, 'wiki', 'entity'), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, 'wiki', 'source'), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, 'wiki', 'summary'), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, 'raw'), { recursive: true });
  
  // Create sample pages
  fs.writeFileSync(
    path.join(wikiDir, 'wiki', 'index.md'),
    `---\ntitle: Test Wiki\ndescription: A test wiki\n---\n\n# Test Wiki\n\nThis is a test wiki for E2E testing.`
  );
  
  fs.writeFileSync(
    path.join(wikiDir, 'wiki', 'entity', 'machine-learning.md'),
    `---\ntitle: Machine Learning\ntype: entity\ntags: [ai, ml]\nsources: []\nrelatedPages: [deep-learning, neural-networks]\n---\n\n# Machine Learning\n\nMachine learning is a subset of artificial intelligence.\n\n## Related Concepts\n\n- [[deep-learning]]\n- [[neural-networks]]`
  );
  
  fs.writeFileSync(
    path.join(wikiDir, 'wiki', 'entity', 'deep-learning.md'),
    `---\ntitle: Deep Learning\ntype: entity\ntags: [ai, ml, neural-networks]\nsources: []\nrelatedPages: [machine-learning]\n---\n\n# Deep Learning\n\nDeep learning uses neural networks with multiple layers.\n\n## See Also\n\n- [[machine-learning]]\n- [[neural-networks]]`
  );
  
  fs.writeFileSync(
    path.join(wikiDir, 'wiki', 'entity', 'neural-networks.md'),
    `---\ntitle: Neural Networks\ntype: entity\ntags: [ai, ml]\nsources: []\nrelatedPages: [deep-learning]\n---\n\n# Neural Networks\n\nNeural networks are computational models inspired by biological neural networks.`
  );
  
  fs.writeFileSync(
    path.join(wikiDir, 'wiki', 'source', 'sample-paper.md'),
    `---\ntitle: Sample Research Paper\ntype: source\ntags: [research]\nsources: []\nrelatedPages: [machine-learning]\n---\n\n# Sample Research Paper\n\nThis is a sample research paper about machine learning.`
  );
  
  fs.writeFileSync(
    path.join(wikiDir, 'wiki', 'summary', 'ai-overview.md'),
    `---\ntitle: AI Overview\ntype: summary\ntags: [ai, overview]\nsources: []\nrelatedPages: [machine-learning]\n---\n\n# AI Overview\n\nThis summary covers artificial intelligence and its subfields.`
  );
  
  fs.writeFileSync(
    path.join(wikiDir, 'wiki', 'log.md'),
    `# Log\n\n## [2026-04-11] ingest | Sample Research Paper\n\nIngested sample research paper.\n\n## [2026-04-11] lint | Initial lint check\n\nNo issues found.`
  );
  
  // Create config file
  fs.writeFileSync(
    path.join(wikiDir, 'llm-wiki.yml'),
    `wikiName: Test Wiki\ndescription: A test wiki\n`
  );
  
  // Initialize git repo
  const { execSync } = require('child_process');
  try {
    execSync('git init', { cwd: wikiDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: wikiDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: wikiDir, stdio: 'ignore' });
    execSync('git add .', { cwd: wikiDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: wikiDir, stdio: 'ignore' });
  } catch {
    // Git may not be available or already initialized
  }
  
  return {
    path: wikiDir,
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

export const test = base.extend<TestFixtures>({
  wikiDir: async ({}, use) => {
    const wiki = await createTestWiki();
    await use(wiki.path);
    wiki.cleanup();
  },
  
  testWiki: async ({}, use) => {
    const wiki = await createTestWiki();
    await use(wiki);
    wiki.cleanup();
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
}

/**
 * Helper to get text content safely
 */
export async function getText(page: Page, selector: string): Promise<string | null> {
  const element = page.locator(selector).first();
  if (await element.count() === 0) return null;
  return element.textContent();
}
