/**
 * Mock fixtures for testing
 */
import { describe, it, expect } from 'vitest';
import type {
  WikiPage,
  SourceDocument,
  LogEntry,
  LintReport,
  WikiConfig,
  SearchResult,
  PageMeta,
} from './index.js';
import {
  createWikiPage,
  createSourceDocument,
  createLogEntry,
  createLintReport,
  createWikiConfig,
  createSearchResult,
  createPageMeta,
} from './fixtures.js';

describe('Mock Fixtures', () => {
  describe('createWikiPage', () => {
    it('should create a page with default values', () => {
      const page = createWikiPage({ slug: 'test-page' });

      expect(page.slug).toBe('test-page');
      expect(page.title).toBe('Test Page');
      expect(page.type).toBe('entity');
      expect(page.content).toBe('# Test Page');
      expect(page.frontmatter.tags).toEqual([]);
      expect(page.frontmatter.sources).toEqual([]);
      expect(page.frontmatter.relatedPages).toEqual([]);
      expect(page.lastModified).toBeInstanceOf(Date);
      expect(page.createdAt).toBeInstanceOf(Date);
    });

    it('should override default values with provided options', () => {
      const page = createWikiPage({
        slug: 'custom-page',
        title: 'Custom Title',
        type: 'source',
        content: '# Custom Content',
        frontmatter: {
          tags: ['custom', 'test'],
          sources: ['source-1'],
          relatedPages: ['other-page'],
        },
      });

      expect(page.slug).toBe('custom-page');
      expect(page.title).toBe('Custom Title');
      expect(page.type).toBe('source');
      expect(page.content).toBe('# Custom Content');
      expect(page.frontmatter.tags).toEqual(['custom', 'test']);
      expect(page.frontmatter.sources).toEqual(['source-1']);
      expect(page.frontmatter.relatedPages).toEqual(['other-page']);
    });

    it('should use custom date if provided', () => {
      const customDate = new Date('2025-01-01');
      const page = createWikiPage({
        slug: 'test',
        lastModified: customDate,
        createdAt: customDate,
      });

      expect(page.lastModified).toEqual(customDate);
      expect(page.createdAt).toEqual(customDate);
    });
  });

  describe('createPageMeta', () => {
    it('should create meta with defaults', () => {
      const meta = createPageMeta();

      expect(meta.tags).toEqual([]);
      expect(meta.sources).toEqual([]);
      expect(meta.relatedPages).toEqual([]);
      expect(meta.summary).toBeUndefined();
    });

    it('should create meta with provided values', () => {
      const meta = createPageMeta({
        tags: ['important', 'review'],
        sources: ['source-a', 'source-b'],
        relatedPages: ['page-1'],
        summary: 'A brief summary',
      });

      expect(meta.tags).toEqual(['important', 'review']);
      expect(meta.sources).toEqual(['source-a', 'source-b']);
      expect(meta.relatedPages).toEqual(['page-1']);
      expect(meta.summary).toBe('A brief summary');
    });
  });

  describe('createSourceDocument', () => {
    it('should create a source with defaults', () => {
      const source = createSourceDocument({ path: 'raw/test.md' });

      expect(source.path).toBe('raw/test.md');
      expect(source.type).toBe('markdown');
      expect(source.title).toBe('Test Document');
      expect(source.ingestedAt).toBeInstanceOf(Date);
      expect(source.checksum).toMatch(/^[a-f0-9]{32}$/); // MD5 format
    });

    it('should create a URL source', () => {
      const source = createSourceDocument({
        type: 'url',
        url: 'https://example.com/article',
        title: 'Example Article',
      });

      expect(source.type).toBe('url');
      expect(source.url).toBe('https://example.com/article');
      expect(source.title).toBe('Example Article');
    });

    it('should create a text source', () => {
      const source = createSourceDocument({
        type: 'text',
        title: 'Custom Text Source',
      });

      expect(source.type).toBe('text');
      expect(source.title).toBe('Custom Text Source');
    });
  });

  describe('createLogEntry', () => {
    it('should create an ingest log entry', () => {
      const entry = createLogEntry({
        type: 'ingest',
        title: 'Ingested test.md',
        sources: ['raw/test.md'],
      });

      expect(entry.type).toBe('ingest');
      expect(entry.title).toBe('Ingested test.md');
      expect(entry.sources).toEqual(['raw/test.md']);
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should create a query log entry', () => {
      const entry = createLogEntry({
        type: 'query',
        title: 'What is the capital of France?',
        details: 'Answered: Paris',
      });

      expect(entry.type).toBe('query');
      expect(entry.details).toBe('Answered: Paris');
    });

    it('should create a lint log entry', () => {
      const entry = createLogEntry({
        type: 'lint',
        title: 'Lint pass completed',
        details: 'Found 3 issues, fixed 2',
      });

      expect(entry.type).toBe('lint');
      expect(entry.details).toBe('Found 3 issues, fixed 2');
    });
  });

  describe('createLintReport', () => {
    it('should create an empty report', () => {
      const report = createLintReport();

      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.issues).toEqual([]);
      expect(report.summary.contradictions).toBe(0);
      expect(report.summary.orphans).toBe(0);
      expect(report.summary.stale).toBe(0);
      expect(report.summary.coverage).toEqual([]);
    });

    it('should create a report with issues', () => {
      const report = createLintReport({
        issues: [
          { type: 'orphan', pageId: 'orphan-page', message: 'No inbound links', severity: 'warning' },
          { type: 'stale', pageId: 'old-page', message: 'Content may be outdated', severity: 'info' },
        ],
      });

      expect(report.issues).toHaveLength(2);
      expect(report.summary.orphans).toBe(1);
      expect(report.summary.stale).toBe(1);
    });
  });

  describe('createWikiConfig', () => {
    it('should create config with defaults', () => {
      const config = createWikiConfig();

      expect(config.wikiDir).toBe('./wiki');
      expect(config.rawDir).toBe('./wiki/raw');
      expect(config.qmdDir).toBe('./.llm-wiki');
      expect(config.name).toBe('LLM Wiki');
      expect(config.description).toBe('');
      expect(config.schemaPath).toBe('./wiki/CLAUDE.md');
    });

    it('should create config with custom values', () => {
      const config = createWikiConfig({
        wikiDir: '/path/to/wiki',
        name: 'My Wiki',
        description: 'A knowledge base',
      });

      expect(config.wikiDir).toBe('/path/to/wiki');
      expect(config.name).toBe('My Wiki');
      expect(config.description).toBe('A knowledge base');
    });
  });

  describe('createSearchResult', () => {
    it('should create a search result with defaults', () => {
      const result = createSearchResult({ docId: 'abc123' });

      expect(result.docId).toBe('abc123');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.content).toContain('Result');
      expect(result.title).toBeUndefined();
    });

    it('should create a result with page info', () => {
      const result = createSearchResult({
        docId: 'xyz789',
        title: 'Search Page',
        slug: 'search-page',
        pageType: 'entity',
      });

      expect(result.title).toBe('Search Page');
      expect(result.slug).toBe('search-page');
      expect(result.pageType).toBe('entity');
    });
  });
});
