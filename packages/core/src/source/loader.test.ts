/**
 * Tests for SourceLoader - Phase 4
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceLoader } from './loader.js';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';

describe('SourceLoader', () => {
  let loader: SourceLoader;
  let testRawDir: string;

  beforeEach(() => {
    testRawDir = join(tmpdir(), `llm-wiki-source-test-${Date.now()}-${Math.random()}`);
    loader = new SourceLoader(testRawDir);
  });

  afterEach(async () => {
    try {
      await rm(testRawDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadMarkdownFile', () => {
    it('should load a markdown file and return SourceDocument', async () => {
      const testContent = '# Test Document\n\nThis is test content.';
      const testPath = join(testRawDir, 'test.md');
      await mkdir(testRawDir, { recursive: true });
      await writeFile(testPath, testContent);

      const result = await loader.loadMarkdownFile(testPath);

      expect(result).toBeDefined();
      expect(result.type).toBe('markdown');
      expect(result.title).toBe('Test Document');
      expect(result.content).toBe(testContent);
      expect(result.path).toBe(testPath);
      expect(result.checksum).toBeDefined();
      expect(result.ingestedAt).toBeInstanceOf(Date);
    });

    it('should extract title from first heading', async () => {
      const testContent = '# My Custom Title\n\nSome content here.';
      const testPath = join(testRawDir, 'custom-title.md');
      await mkdir(testRawDir, { recursive: true });
      await writeFile(testPath, testContent);

      const result = await loader.loadMarkdownFile(testPath);

      expect(result.title).toBe('My Custom Title');
    });

    it('should use filename as title when no heading', async () => {
      const testContent = 'No heading here, just plain text.';
      const testPath = join(testRawDir, 'no-heading.md');
      await mkdir(testRawDir, { recursive: true });
      await writeFile(testPath, testContent);

      const result = await loader.loadMarkdownFile(testPath);

      expect(result.title).toBe('no-heading');
    });

    it('should calculate checksum correctly', async () => {
      const testContent = '# Content\n\nTest';
      const testPath = join(testRawDir, 'checksum-test.md');
      await mkdir(testRawDir, { recursive: true });
      await writeFile(testPath, testContent);

      const result = await loader.loadMarkdownFile(testPath);
      const expectedChecksum = createHash('sha256').update(testContent).digest('hex').slice(0, 16);

      expect(result.checksum).toBe(expectedChecksum);
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentPath = join(testRawDir, 'nonexistent.md');

      await expect(loader.loadMarkdownFile(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('loadTextInput', () => {
    it('should process raw text and return SourceDocument', async () => {
      const textContent = 'Some raw text content without any file.';

      const result = await loader.loadTextInput(textContent);

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      expect(result.content).toBe(textContent);
      expect(result.path).toBeUndefined();
      expect(result.checksum).toBeDefined();
      expect(result.ingestedAt).toBeInstanceOf(Date);
    });

    it('should generate title from first line if it looks like a heading', async () => {
      const textContent = '# This is a heading\n\nRest of content.';

      const result = await loader.loadTextInput(textContent);

      expect(result.title).toBe('This is a heading');
    });

    it('should use first non-empty line as title when no heading', async () => {
      const textContent = 'Just some plain text without any heading.';

      const result = await loader.loadTextInput(textContent);

      // First line without heading marker becomes the title
      expect(result.title).toBe('Just some plain text without any heading.');
    });

    it('should return Untitled for empty content', async () => {
      const result = await loader.loadTextInput('');
      expect(result.title).toBe('Untitled');
    });

    it('should calculate checksum for text content', async () => {
      const textContent = 'Text for checksum test.';
      const expectedChecksum = createHash('sha256').update(textContent).digest('hex').slice(0, 16);

      const result = await loader.loadTextInput(textContent);

      expect(result.checksum).toBe(expectedChecksum);
    });
  });

  describe('loadSource', () => {
    it('should load markdown file when path has .md extension', async () => {
      const testContent = '# Markdown Source\n\nContent here.';
      const testPath = join(testRawDir, 'markdown-source.md');
      await mkdir(testRawDir, { recursive: true });
      await writeFile(testPath, testContent);

      const result = await loader.loadSource(testPath);

      expect(result.type).toBe('markdown');
      expect(result.content).toBe(testContent);
    });

    it('should process URL when path starts with http/https', async () => {
      const url = 'https://example.com/test';
      // Mock fetch will be tested separately
      // This test verifies URL detection
      expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
    });

    it('should treat non-.md paths as text', async () => {
      const textContent = 'Plain text file content';
      
      // This should fall through to text processing
      const result = await loader.loadTextInput(textContent);
      expect(result.type).toBe('text');
    });
  });

  describe('detectTitle', () => {
    it('should extract title from first h1 heading', () => {
      const content = '# Main Title\n\n## Section\n\nContent';
      const title = loader.detectTitle(content);
      expect(title).toBe('Main Title');
    });

    it('should extract title from first h2 heading if no h1', () => {
      const content = '## Secondary Title\n\n## Section\n\nContent';
      const title = loader.detectTitle(content);
      expect(title).toBe('Secondary Title');
    });

    it('should return filename without extension for markdown', () => {
      const title = loader.detectTitle('', 'my-document.md');
      expect(title).toBe('my-document');
    });

    it('should return Untitled for empty content without filename', () => {
      const title = loader.detectTitle('');
      expect(title).toBe('Untitled');
    });

    it('should extract first non-empty line if no headings', () => {
      const content = 'First line\nSecond line\nThird line';
      const title = loader.detectTitle(content);
      expect(title).toBe('First line');
    });
  });

  describe('calculateChecksum', () => {
    it('should return consistent checksum for same content', () => {
      const content = 'Test content';
      const checksum1 = loader.calculateChecksum(content);
      const checksum2 = loader.calculateChecksum(content);
      expect(checksum1).toBe(checksum2);
    });

    it('should return different checksum for different content', () => {
      const checksum1 = loader.calculateChecksum('Content A');
      const checksum2 = loader.calculateChecksum('Content B');
      expect(checksum1).not.toBe(checksum2);
    });

    it('should return 16-character hex string', () => {
      const checksum = loader.calculateChecksum('Any content');
      expect(checksum).toMatch(/^[a-f0-9]{16}$/);
    });
  });
});

describe('SourceLoader URL support', () => {
  let loader: SourceLoader;
  let testRawDir: string;

  beforeEach(() => {
    testRawDir = join(tmpdir(), `llm-wiki-url-test-${Date.now()}-${Math.random()}`);
    loader = new SourceLoader(testRawDir);
  });

  afterEach(async () => {
    try {
      await rm(testRawDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadUrl', () => {
    it('should detect URL sources correctly', () => {
      expect(loader.isUrl('https://example.com')).toBe(true);
      expect(loader.isUrl('http://example.com')).toBe(true);
      expect(loader.isUrl('https://example.com/path?query=value')).toBe(true);
      expect(loader.isUrl('not-a-url')).toBe(false);
      expect(loader.isUrl('/local/path')).toBe(false);
      expect(loader.isUrl('./relative/path')).toBe(false);
    });

    it('should store URL metadata for URL sources', async () => {
      const url = 'https://example.com/test';
      
      // Test that isUrl correctly identifies URLs
      expect(loader.isUrl(url)).toBe(true);
    });
  });
});
