/**
 * Tests for API response types - Phase 1
 */
import { describe, it, expect } from 'vitest';
import type {
  PageListResponse,
  PageResponse,
  SourceListResponse,
  SourceResponse,
  SearchResponse,
  LintReportResponse,
  StatusResponse,
  ConfigResponse,
  LogResponse,
  AgentStatusResponse,
  ApiError,
  PaginationParams,
} from './api.js';

describe('API Response Types', () => {
  describe('PageListResponse', () => {
    it('should include pages array and pagination info', () => {
      const response: PageListResponse = {
        pages: [
          {
            slug: 'test-page',
            title: 'Test Page',
            type: 'entity',
            frontmatter: { tags: [], sources: [], relatedPages: [] },
            lastModified: new Date(),
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      expect(response.pages).toHaveLength(1);
      expect(response.total).toBe(1);
      expect(response.page).toBe(1);
      expect(response.pageSize).toBe(20);
    });

    it('should support optional filters info', () => {
      const response: PageListResponse = {
        pages: [],
        total: 0,
        page: 1,
        pageSize: 20,
        filters: {
          type: 'entity',
          tags: ['test'],
        },
      };

      expect(response.filters?.type).toBe('entity');
      expect(response.filters?.tags).toEqual(['test']);
    });
  });

  describe('PageResponse', () => {
    it('should include page and optional backlinks', () => {
      const response: PageResponse = {
        page: {
          slug: 'test-page',
          title: 'Test Page',
          type: 'entity',
          content: '# Test Page',
          frontmatter: { tags: [], sources: [], relatedPages: [] },
          lastModified: new Date(),
          createdAt: new Date(),
        },
        backlinks: ['other-page'],
      };

      expect(response.page.slug).toBe('test-page');
      expect(response.backlinks).toHaveLength(1);
      expect(response.backlinks?.[0]).toBe('other-page');
    });
  });

  describe('SourceListResponse', () => {
    it('should include sources array', () => {
      const response: SourceListResponse = {
        sources: [
          {
            path: 'raw/test.md',
            type: 'markdown',
            title: 'Test Source',
            content: '# Test\n\nSource content',
            ingestedAt: new Date(),
            checksum: 'abc123',
          },
        ],
        total: 1,
      };

      expect(response.sources).toHaveLength(1);
      expect(response.total).toBe(1);
      expect(response.sources[0].path).toBe('raw/test.md');
    });
  });

  describe('SourceResponse', () => {
    it('should include source document', () => {
      const response: SourceResponse = {
        source: {
          path: 'raw/test.md',
          type: 'markdown',
          title: 'Test Source',
          content: '# Test\n\nSource content',
          ingestedAt: new Date(),
          checksum: 'abc123',
        },
      };

      expect(response.source.title).toBe('Test Source');
    });
  });

  describe('SearchResponse', () => {
    it('should include results array with query', () => {
      const response: SearchResponse = {
        query: 'test search',
        results: [
          {
            docId: 'doc123',
            score: 0.95,
            content: 'This is a test result',
            title: 'Test Page',
            slug: 'test-page',
            pageType: 'entity',
          },
        ],
        total: 1,
        took: 15,
      };

      expect(response.query).toBe('test search');
      expect(response.results).toHaveLength(1);
      expect(response.results[0].score).toBe(0.95);
      expect(response.took).toBe(15);
    });

    it('should support filters in response', () => {
      const response: SearchResponse = {
        query: 'test',
        results: [],
        total: 0,
        took: 5,
        filters: {
          pageType: 'source',
          tags: ['documentation'],
        },
      };

      expect(response.filters?.pageType).toBe('source');
    });
  });

  describe('LintReportResponse', () => {
    it('should include full lint report', () => {
      const response: LintReportResponse = {
        report: {
          timestamp: new Date(),
          issues: [
            {
              type: 'orphan',
              pageId: 'test-page',
              message: 'Page has no inbound links',
              severity: 'warning',
            },
          ],
          summary: {
            contradictions: 0,
            orphans: 1,
            stale: 0,
            coverage: [],
          },
        },
        fixed: 0,
      };

      expect(response.report.issues).toHaveLength(1);
      expect(response.report.summary.orphans).toBe(1);
    });

    it('should indicate when issues were fixed', () => {
      const response: LintReportResponse = {
        report: {
          timestamp: new Date(),
          issues: [],
          summary: { contradictions: 0, orphans: 0, stale: 0, coverage: [] },
        },
        fixed: 5,
      };

      expect(response.fixed).toBe(5);
    });
  });

  describe('StatusResponse', () => {
    it('should include wiki and QMD stats', () => {
      const response: StatusResponse = {
        wiki: {
          name: 'Test Wiki',
          pageCount: 42,
          sourceCount: 10,
          lastModified: new Date(),
        },
        qmd: {
          indexedDocuments: 40,
          indexSize: 1024,
          lastIndexed: new Date(),
        },
      };

      expect(response.wiki.pageCount).toBe(42);
      expect(response.qmd.indexedDocuments).toBe(40);
    });
  });

  describe('ConfigResponse', () => {
    it('should include config and editable fields', () => {
      const response: ConfigResponse = {
        config: {
          wikiDir: './wiki',
          rawDir: './wiki/raw',
          qmdDir: './.llm-wiki',
          name: 'Test Wiki',
          description: 'A test wiki',
          schemaPath: './wiki/CLAUDE.md',
        },
        editableFields: ['name', 'description'],
      };

      expect(response.config.name).toBe('Test Wiki');
      expect(response.editableFields).toContain('name');
    });
  });

  describe('LogResponse', () => {
    it('should include log entries', () => {
      const response: LogResponse = {
        entries: [
          {
            timestamp: new Date('2026-04-10'),
            type: 'ingest',
            title: 'Ingested test.md',
          },
        ],
        total: 1,
      };

      expect(response.entries).toHaveLength(1);
      expect(response.entries[0].type).toBe('ingest');
    });
  });

  describe('AgentStatusResponse', () => {
    it('should include agent status info', () => {
      const response: AgentStatusResponse = {
        running: true,
        mode: 'autonomous',
        currentTask: 'Running lint check',
        lastActivity: new Date(),
      };

      expect(response.running).toBe(true);
      expect(response.mode).toBe('autonomous');
      expect(response.currentTask).toBe('Running lint check');
    });

    it('should support interactive mode with no current task', () => {
      const response: AgentStatusResponse = {
        running: false,
        mode: 'interactive',
        currentTask: null,
        lastActivity: new Date(),
      };

      expect(response.running).toBe(false);
      expect(response.currentTask).toBeNull();
    });
  });

  describe('ApiError', () => {
    it('should include error code and message', () => {
      const error: ApiError = {
        error: 'NOT_FOUND',
        message: 'Page not found',
        statusCode: 404,
      };

      expect(error.error).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should support optional details', () => {
      const error: ApiError = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid input',
        statusCode: 400,
        details: { field: 'slug', issue: 'must be lowercase-kebab-case' },
      };

      expect(error.details?.field).toBe('slug');
    });
  });

  describe('PaginationParams', () => {
    it('should have default values', () => {
      const params: PaginationParams = {};

      expect(params.page).toBeUndefined();
      expect(params.pageSize).toBeUndefined();
    });

    it('should accept custom values', () => {
      const params: PaginationParams = {
        page: 5,
        pageSize: 50,
      };

      expect(params.page).toBe(5);
      expect(params.pageSize).toBe(50);
    });
  });
});
