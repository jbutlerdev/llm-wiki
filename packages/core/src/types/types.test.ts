/**
 * Tests for WikiPage type - Phase 1
 */
import { describe, it, expect } from 'vitest';
import type { WikiPage, PageMeta, PageType } from './index.js';

describe('WikiPage type', () => {
  it('should include all required fields', () => {
    const page: WikiPage = {
      slug: 'test-page',
      title: 'Test Page',
      type: 'entity',
      content: '# Test Page\n\nThis is test content.',
      frontmatter: {
        tags: ['test'],
        sources: [],
        relatedPages: [],
      },
      lastModified: new Date(),
      createdAt: new Date(),
    };

    expect(page.slug).toBe('test-page');
    expect(page.title).toBe('Test Page');
    expect(page.type).toBe('entity');
    expect(page.content).toContain('Test Page');
    expect(page.frontmatter).toBeDefined();
    expect(page.lastModified).toBeInstanceOf(Date);
    expect(page.createdAt).toBeInstanceOf(Date);
  });

  it('should support optional docId for QMD integration', () => {
    const page: WikiPage = {
      slug: 'test-page',
      title: 'Test Page',
      type: 'entity',
      content: '# Test Page',
      frontmatter: {
        tags: [],
        sources: [],
        relatedPages: [],
      },
      lastModified: new Date(),
      createdAt: new Date(),
      docId: 'abc123',
    };

    expect(page.docId).toBe('abc123');
  });

  it('should validate page type enum values', () => {
    const pageTypes: PageType[] = ['summary', 'entity', 'source', 'comparison', 'synthesis'];

    pageTypes.forEach((type) => {
      const page: WikiPage = {
        slug: `test-${type}`,
        title: `Test ${type}`,
        type,
        content: '',
        frontmatter: { tags: [], sources: [], relatedPages: [] },
        lastModified: new Date(),
        createdAt: new Date(),
      };
      expect(page.type).toBe(type);
    });
  });

  it('should include optional summary in PageMeta', () => {
    const meta: PageMeta = {
      tags: ['test'],
      sources: ['source-1'],
      relatedPages: ['page-1', 'page-2'],
      summary: 'This is a one-line summary',
    };

    expect(meta.summary).toBe('This is a one-line summary');
  });
});
