/**
 * Tests for Query System
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createQueryFunction,
  shouldFileAnswer,
} from './query.js';
import type { QMDStoreWrapper } from '../qmd/store.js';
import type { SearchResult } from '../qmd/search.js';

describe('Query System', () => {
  describe('createQueryFunction', () => {
    let mockStore: any;
    let wrapper: QMDStoreWrapper;

    beforeEach(() => {
      mockStore = {
        search: vi.fn().mockResolvedValue([
          {
            docId: 'doc1',
            title: 'Machine Learning',
            path: 'entity/machine-learning.md',
            content: 'Machine learning is a subset of artificial intelligence. It enables systems to learn from data.',
            score: 0.95,
          },
          {
            docId: 'doc2',
            title: 'Deep Learning',
            path: 'entity/deep-learning.md',
            content: 'Deep learning is a type of machine learning based on neural networks.',
            score: 0.85,
          },
        ]),
      };

      wrapper = {
        getStore: () => mockStore,
        getWikiCollection: () => 'wiki',
        getRawCollection: () => 'raw',
        close: vi.fn(),
        wikiDir: '/test/wiki',
        qmdDir: '/test/.llm-wiki',
        getStatus: vi.fn().mockResolvedValue({ documentCount: 0 }),
        getAllCollections: vi.fn().mockReturnValue(['wiki', 'raw']),
        toRelativePath: vi.fn((p: string) => p),
      };
    });

    it('should process a question and return search results', async () => {
      const query = createQueryFunction(wrapper);

      const result = await query('What is machine learning?');

      expect(result.question).toBe('What is machine learning?');
      expect(result.searchResults).toHaveLength(2);
      expect(result.citations).toHaveLength(2);
      expect(result.answer).toContain('Machine learning');
    });

    it('should include citations in the answer', async () => {
      const query = createQueryFunction(wrapper);

      const result = await query('What is AI?');

      expect(result.citations).toHaveLength(2);
      expect(result.citations[0]).toHaveProperty('slug');
      expect(result.citations[0]).toHaveProperty('title');
      expect(result.citations[0]).toHaveProperty('snippet');
    });

    it('should use default options when not provided', async () => {
      const query = createQueryFunction(wrapper);

      await query('test question');

      // Check that search was called with defaults
      expect(mockStore.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          minScore: 0.1,
        })
      );
    });

    it('should respect custom maxResults option', async () => {
      const query = createQueryFunction(wrapper);

      await query('test', { maxResults: 3 });

      expect(mockStore.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 6, // maxResults * 2
        })
      );
    });

    it('should respect custom minScore option', async () => {
      const query = createQueryFunction(wrapper);

      await query('test', { minScore: 0.5 });

      expect(mockStore.search).toHaveBeenCalledWith(
        expect.objectContaining({
          minScore: 0.5,
        })
      );
    });

    it('should handle empty search results', async () => {
      mockStore.search.mockResolvedValueOnce([]);

      const query = createQueryFunction(wrapper);
      const result = await query('nonexistent topic');

      expect(result.searchResults).toHaveLength(0);
      expect(result.citations).toHaveLength(0);
      expect(result.answer).toContain('Based on the wiki');
    });

    it('should include raw collection when includeRaw is true', async () => {
      const query = createQueryFunction(wrapper);

      await query('test', { includeRaw: true });

      expect(mockStore.search).toHaveBeenCalledWith(
        expect.objectContaining({
          collections: ['wiki', 'raw'],
        })
      );
    });
  });

  describe('shouldFileAnswer', () => {
    const createCitations = (count: number): any[] => {
      return Array.from({ length: count }, (_, i) => ({
        slug: `page-${i + 1}`,
        title: `Page ${i + 1}`,
        snippet: 'Sample content',
      }));
    };

    it('should recommend filing for answers with multiple good sources', () => {
      const citations = createCitations(2);
      // Answer must be > 100 chars
      const answer = 'This is a detailed answer that explains the concept thoroughly. It covers all aspects and provides comprehensive information.';

      const result = shouldFileAnswer(answer, citations, []);

      expect(result.shouldFile).toBe(true);
    });

    it('should not recommend filing for short answers', () => {
      const citations = createCitations(1);
      const answer = 'Short answer';

      const result = shouldFileAnswer(answer, citations, []);

      expect(result.shouldFile).toBe(false);
      expect(result.reason).toContain('too short');
    });

    it('should recommend filing for answers synthesizing multiple pages', () => {
      const citations = createCitations(3);
      // Answer is short (< 100 chars) but has 3 unique pages, so it should file
      const answer = 'Short answer';

      const result = shouldFileAnswer(answer, citations, []);

      expect(result.shouldFile).toBe(true);
      expect(result.reason).toContain('multiple pages');
    });

    it('should not recommend filing for single citation answers', () => {
      const citations = createCitations(1);
      const answer = 'This is a moderately long answer about something.';

      const result = shouldFileAnswer(answer, citations, []);

      expect(result.shouldFile).toBe(false);
    });
  });
});
