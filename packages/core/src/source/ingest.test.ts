/**
 * Tests for Ingest function - Phase 4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ingest, IngestContext, IngestOperationResult } from './ingest.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { rm, mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { init } from '../wiki/init.js';

describe('ingest', () => {
  let testWikiDir: string;

  beforeEach(async () => {
    testWikiDir = join(tmpdir(), `llm-wiki-ingest-test-${Date.now()}-${Math.random()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);
  });

  afterEach(async () => {
    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('basic ingestion', () => {
    it('should ingest a markdown file and create a source page', async () => {
      const sourcePath = join(testWikiDir, 'test-source.md');
      const sourceContent = '# Test Document\n\nThis is test content with key information.';
      await writeFile(sourcePath, sourceContent);

      const context: IngestContext = {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      };

      const result = await ingest(sourcePath, context);

      expect(result.success).toBe(true);
      expect(result.source).toBeDefined();
      expect(result.source!.type).toBe('markdown');
      expect(result.source!.title).toBe('Test Document');
      expect(result.source!.checksum).toBeDefined();
      expect(result.pagesCreated.length).toBeGreaterThan(0);
      expect(result.logEntry).toBeDefined();
    });

    it('should ingest raw text input', async () => {
      const textContent = 'Some raw text content without a file.';

      const context: IngestContext = {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      };

      const result = await ingest(textContent, context);

      expect(result.success).toBe(true);
      expect(result.source).toBeDefined();
      expect(result.source!.type).toBe('text');
      expect(result.pagesCreated.length).toBeGreaterThan(0);
    });

    it('should log the ingest operation', async () => {
      const sourcePath = join(testWikiDir, 'test.md');
      await writeFile(sourcePath, '# Logged Document\n\nContent.');

      const context: IngestContext = {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      };

      const result = await ingest(sourcePath, context);

      expect(result.logEntry).toBeDefined();
      expect(result.logEntry!.type).toBe('ingest');
      expect(result.logEntry!.title).toBe('Logged Document');
    });
  });

  describe('source page creation', () => {
    it('should create source page in wiki/source directory', async () => {
      const sourcePath = join(testWikiDir, 'my-source.md');
      await writeFile(sourcePath, '# My Source\n\nContent here.');

      const context: IngestContext = {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      };

      const result = await ingest(sourcePath, context);

      expect(result.success).toBe(true);
      expect(result.source).toBeDefined();
      const sourcePagePath = join(testWikiDir, 'wiki', 'source', `${result.source!.checksum}.md`);
      expect(existsSync(sourcePagePath)).toBe(true);

      const pageContent = await readFile(sourcePagePath, 'utf-8');
      expect(pageContent).toContain('My Source');
      // Content should be in the page body
      expect(pageContent).toContain('Content');
    });

    it('should include frontmatter in source page', async () => {
      const sourcePath = join(testWikiDir, 'frontmatter-test.md');
      await writeFile(sourcePath, '# Frontmatter Test\n\nContent.');

      const context: IngestContext = {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      };

      const result = await ingest(sourcePath, context);

      expect(result.success).toBe(true);
      expect(result.source).toBeDefined();
      const sourcePagePath = join(testWikiDir, 'wiki', 'source', `${result.source!.checksum}.md`);
      const pageContent = await readFile(sourcePagePath, 'utf-8');
      
      // Check for frontmatter
      expect(pageContent).toContain('---');
      expect(pageContent).toContain('type: source');
      expect(pageContent).toContain('sources:');
    });
  });

  describe('index.md updates', () => {
    it('should update index.md after ingestion', async () => {
      const sourcePath = join(testWikiDir, 'indexed-source.md');
      await writeFile(sourcePath, '# Indexed Source\n\nImportant content.');

      const context: IngestContext = {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      };

      await ingest(sourcePath, context);

      const indexPath = join(testWikiDir, 'wiki', 'index.md');
      const indexContent = await readFile(indexPath, 'utf-8');
      
      // Should contain reference to the new source
      expect(indexContent).toContain('Indexed Source');
    });
  });

  describe('error handling', () => {
    it('should fail gracefully for non-existent file', async () => {
      const nonExistentPath = join(testWikiDir, 'nonexistent.md');

      const context: IngestContext = {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      };

      const result = await ingest(nonExistentPath, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('idempotency', () => {
    it('should detect re-ingestion of same source by checksum', async () => {
      const sourcePath = join(testWikiDir, 'idempotent.md');
      await writeFile(sourcePath, '# Idempotent Source\n\nSame content.');

      const context: IngestContext = {
        wikiDir: testWikiDir,
        rawDir: join(testWikiDir, 'wiki', 'raw'),
      };

      const result1 = await ingest(sourcePath, context);
      expect(result1.success).toBe(true);
      expect(result1.source).toBeDefined();

      // Re-ingest same file
      const result2 = await ingest(sourcePath, context);
      
      // Should either update existing or recognize duplicate
      expect(result2.success).toBe(true);
      expect(result2.source).toBeDefined();
      // Checksum should be same
      expect(result2.source!.checksum).toBe(result1.source!.checksum);
    });
  });
});

describe('IngestContext', () => {
  it('should validate wiki directory', async () => {
    const testWikiDir = join(tmpdir(), `llm-wiki-validate-${Date.now()}`);
    await mkdir(testWikiDir, { recursive: true });
    await init(testWikiDir);

    const context: IngestContext = {
      wikiDir: testWikiDir,
      rawDir: join(testWikiDir, 'wiki', 'raw'),
    };

    // Valid context should work
    const sourcePath = join(testWikiDir, 'valid-context.md');
    await writeFile(sourcePath, '# Valid Context\n\nContent.');
    
    const result = await ingest(sourcePath, context);
    expect(result.success).toBe(true);

    try {
      await rm(testWikiDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup
    }
  });
});
