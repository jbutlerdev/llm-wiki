import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Tests for MCP Server
 * 
 * Tests the MCP server initialization, tool registration,
 * and individual tool functionality.
 */

describe('MCP Server', () => {
  const testWikiDir = path.join(os.tmpdir(), `llm-wiki-mcp-test-${Date.now()}`);
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    // Create test wiki directory structure
    fs.mkdirSync(path.join(testWikiDir, 'wiki', 'entity'), { recursive: true });
    fs.mkdirSync(path.join(testWikiDir, 'wiki', 'source'), { recursive: true });
    fs.mkdirSync(path.join(testWikiDir, 'wiki', 'summary'), { recursive: true });
    fs.mkdirSync(path.join(testWikiDir, 'raw'), { recursive: true });
    
    // Create a test page
    fs.writeFileSync(
      path.join(testWikiDir, 'wiki', 'entity', 'test-entity.md'),
      `---
title: Test Entity
tags: [test, example]
sources: []
relatedPages: []
---

# Test Entity

This is a test entity page for the wiki.
`
    );

    // Create index.md
    fs.writeFileSync(
      path.join(testWikiDir, 'wiki', 'index.md'),
      `# Wiki Index

## Pages

- [[entity/test-entity]] - Test Entity
`
    );
  });

  afterEach(() => {
    process.chdir(originalCwd);
    // Clean up test directory
    if (fs.existsSync(testWikiDir)) {
      fs.rmSync(testWikiDir, { recursive: true, force: true });
    }
  });

  describe('Server Initialization', () => {
    it('should create MCP server with wiki directory', async () => {
      const { createMCPServer } = await import('./index.js');
      
      const server = createMCPServer({
        wikiDir: testWikiDir,
        name: 'test-wiki',
        version: '0.0.1',
      });

      expect(server).toBeDefined();
      expect(server.server).toBeDefined();
      expect(server.wikiDirProvider).toBeDefined();
    });

    it('should provide wiki directory to tools', async () => {
      const { createMCPServer } = await import('./index.js');
      
      const server = createMCPServer({
        wikiDir: testWikiDir,
      });

      expect(server.wikiDirProvider.getWikiDir()).toBe(testWikiDir);
    });

    it('should allow setting wiki directory', async () => {
      const { createMCPServer } = await import('./index.js');
      
      const server = createMCPServer({
        wikiDir: testWikiDir,
      });

      server.wikiDirProvider.setWikiDir('/new/path');
      expect(server.wikiDirProvider.getWikiDir()).toBe('/new/path');
    });

    it('should have connected status check method', async () => {
      const { createMCPServer } = await import('./index.js');
      
      const server = createMCPServer({
        wikiDir: testWikiDir,
      });

      // Server should be able to check connection status
      expect(typeof server.server.isConnected).toBe('function');
    });
  });

  describe('WikiDirProvider', () => {
    it('should create wiki directory provider', async () => {
      const { createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      expect(provider.getWikiDir()).toBe(testWikiDir);
      
      provider.setWikiDir('/new/path');
      expect(provider.getWikiDir()).toBe('/new/path');
    });

    it('should use current directory when not provided', async () => {
      const { createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider();
      expect(provider.getWikiDir()).toBe(process.cwd());
    });
  });

  describe('Server Configuration', () => {
    it('should export server metadata', async () => {
      const { createMCPServer } = await import('./index.js');
      
      const server = createMCPServer({
        wikiDir: '/test',
        name: 'my-wiki-server',
        version: '1.0.0',
      });

      // Server should be created successfully
      expect(server.server).toBeDefined();
    });

    it('should return getStoreWrapper method', async () => {
      const { createMCPServer } = await import('./index.js');
      
      const server = createMCPServer({
        wikiDir: testWikiDir,
      });

      expect(typeof server.getStoreWrapper).toBe('function');
      expect(server.getStoreWrapper()).toBeUndefined();
    });

    it('should return storeWrapper when provided', async () => {
      const { createMCPServer } = await import('./index.js');
      
      const mockStore = { test: true };
      const server = createMCPServer({
        wikiDir: testWikiDir,
      }, mockStore);

      expect(server.getStoreWrapper()).toBe(mockStore);
    });
  });
});

describe('MCP Tool Executors', () => {
  const testWikiDir = path.join(os.tmpdir(), `llm-wiki-mcp-executor-test-${Date.now()}`);

  beforeEach(async () => {
    // Create test wiki directory structure
    fs.mkdirSync(path.join(testWikiDir, 'wiki', 'entity'), { recursive: true });
    fs.mkdirSync(path.join(testWikiDir, 'wiki', 'source'), { recursive: true });
    fs.mkdirSync(path.join(testWikiDir, 'raw'), { recursive: true });
    
    // Create a test page
    fs.writeFileSync(
      path.join(testWikiDir, 'wiki', 'entity', 'test-entity.md'),
      `---
title: Test Entity
tags: [test, example]
sources: []
relatedPages: []
---

# Test Entity

This is a test entity page for the wiki with some content.
`
    );

    // Create index.md
    fs.writeFileSync(
      path.join(testWikiDir, 'wiki', 'index.md'),
      `# Wiki Index

## Pages

- [[entity/test-entity]] - Test Entity
`
    );
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testWikiDir)) {
      fs.rmSync(testWikiDir, { recursive: true, force: true });
    }
  });

  describe('wiki_get executor', () => {
    it('should get existing page by id', async () => {
      const { executeWikiGetTool, createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      // The loadPage function looks for pages in the type directory
      // So we need to search for just the slug "test-entity"
      const result = await executeWikiGetTool(provider, { id: 'test-entity' });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Test Entity');
      expect(result.details.slug).toBe('test-entity');
    });

    it('should return error for non-existent page', async () => {
      const { executeWikiGetTool, createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      const result = await executeWikiGetTool(provider, { id: 'nonexistent-page' });

      expect(result.isError || result.content[0].text).toBeTruthy();
    });

    it('should support raw output', async () => {
      const { executeWikiGetTool, createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      const result = await executeWikiGetTool(provider, { id: 'test-entity', raw: true });

      expect(result.details.raw).toBe(true);
      // Raw content is the parsed body without frontmatter
      expect(result.content[0].text).toContain('Test Entity');
    });
  });

  describe('wiki_status executor', () => {
    it('should return wiki status', async () => {
      const { executeWikiStatusTool, createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      const result = await executeWikiStatusTool(provider);

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Wiki');
      expect(result.details.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should include page counts by type', async () => {
      const { executeWikiStatusTool, createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      const result = await executeWikiStatusTool(provider);

      expect(result.details.pagesByType).toBeDefined();
    });
  });

  describe('wiki_search executor', () => {
    it('should return empty results for no matches', async () => {
      const { executeWikiSearchTool, createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      const result = await executeWikiSearchTool(provider, { query: 'nonexistent-query-xyz-123' });

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('No results found');
    });

    it('should search with limit parameter', async () => {
      const { executeWikiSearchTool, createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      const result = await executeWikiSearchTool(provider, { query: 'test', limit: 5 });

      expect(result).toBeDefined();
    });
  });

  describe('wiki_ingest executor', () => {
    it('should ingest text source', async () => {
      const { executeWikiIngestTool, createWikiDirProvider } = await import('./index.js');
      
      const provider = createWikiDirProvider(testWikiDir);
      const result = await executeWikiIngestTool(provider, { 
        source: '# Test Document\n\nThis is a test document.',
        sourceType: 'text',
        title: 'Test Document',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeTruthy();
    });
  });
});

describe('MCP Server Package Exports', () => {
  it('should export all required types and functions', async () => {
    const module = await import('./index.js');
    
    // Check createMCPServer
    expect(typeof module.createMCPServer).toBe('function');
    
    // Check createWikiDirProvider
    expect(typeof module.createWikiDirProvider).toBe('function');
    
    // Check startMCPServer
    expect(typeof module.startMCPServer).toBe('function');
    
    // Check types are exported (they're TypeScript types, not values)
    expect(module).toBeDefined();
    expect(typeof module.createMCPServer).toBe('function');
    expect(typeof module.createWikiDirProvider).toBe('function');
    expect(typeof module.startMCPServer).toBe('function');
    expect(typeof module.executeWikiSearchTool).toBe('function');
    expect(typeof module.executeWikiGetTool).toBe('function');
    expect(typeof module.executeWikiIngestTool).toBe('function');
    expect(typeof module.executeWikiStatusTool).toBe('function');
  });
});
