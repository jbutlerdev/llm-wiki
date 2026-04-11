import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { QMDStoreWrapper } from './store.js';
import { createSearchFunction, createHybridSearch } from './search.js';
import type { SearchOptions, SearchResult } from '../types/index.js';

// Mock QMD store wrapper
const createMockWrapper = (): QMDStoreWrapper => {
  const mockStore = {
    search: vi.fn().mockResolvedValue([]),
    searchLex: vi.fn().mockResolvedValue([]),
    searchVector: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    multiGet: vi.fn(),
  };

  return {
    getStore: () => mockStore as any,
    close: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      qmdDir: '/tmp/wiki/.llm-wiki',
      isReady: true,
      totalDocuments: 10,
      indexedDocuments: 10,
      needsEmbedding: false,
      collections: [],
    }),
    wikiDir: '/tmp/wiki',
    qmdDir: '/tmp/wiki/.llm-wiki',
    getWikiCollection: () => 'wiki',
    getRawCollection: () => 'raw',
    getAllCollections: () => ['wiki', 'raw'],
    toRelativePath: (p: string) => p.replace('/tmp/wiki/', ''),
  };
};

describe('createSearchFunction', () => {
  let wrapper: QMDStoreWrapper;

  beforeEach(() => {
    wrapper = createMockWrapper();
  });

  it('should create a search function', () => {
    const search = createSearchFunction(wrapper);
    expect(search).toBeDefined();
    expect(typeof search).toBe('function');
  });

  it('should call store.search with query', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.search.mockResolvedValueOnce([
      {
        docId: 'abc123',
        score: 0.85,
        title: 'Test Page',
        path: 'entity/test.md',
        content: 'This is a test content',
      },
    ]);

    const search = createSearchFunction(wrapper);
    const results = await search('test query');

    expect(mockStore.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'test query' })
    );
    expect(results).toHaveLength(1);
    expect(results[0].docId).toBe('abc123');
  });

  it('should filter by collection', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.search.mockResolvedValueOnce([]);

    const search = createSearchFunction(wrapper);
    await search('test', { collections: ['wiki'] });

    expect(mockStore.search).toHaveBeenCalledWith(
      expect.objectContaining({ collections: ['wiki'] })
    );
  });

  it('should limit results', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.search.mockResolvedValueOnce([]);

    const search = createSearchFunction(wrapper);
    await search('test', { limit: 5 });

    expect(mockStore.search).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 })
    );
  });

  it('should filter by minimum score', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.search.mockResolvedValueOnce([]);

    const search = createSearchFunction(wrapper);
    await search('test', { minScore: 0.5 });

    expect(mockStore.search).toHaveBeenCalledWith(
      expect.objectContaining({ minScore: 0.5 })
    );
  });

  it('should return normalized SearchResult objects', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.search.mockResolvedValueOnce([
      {
        docId: 'xyz789',
        score: 0.92,
        title: 'My Document',
        path: 'source/doc.md',
        content: 'Document content here',
      },
    ]);

    const search = createSearchFunction(wrapper);
    const results = await search('document');

    expect(results[0]).toMatchObject({
      docId: 'xyz789',
      score: 0.92,
      content: 'Document content here',
      title: 'My Document',
    });
  });
});

describe('createHybridSearch', () => {
  let wrapper: QMDStoreWrapper;

  beforeEach(() => {
    wrapper = createMockWrapper();
  });

  it('should create a hybrid search function', () => {
    const hybrid = createHybridSearch(wrapper);
    expect(hybrid).toBeDefined();
    expect(typeof hybrid).toBe('function');
  });

  it('should combine BM25 and vector search', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.searchLex.mockResolvedValueOnce([
      { docId: 'lex1', score: 0.8, title: 'Lex Result', content: 'lex content' },
    ]);
    mockStore.searchVector.mockResolvedValueOnce([
      { docId: 'vec1', score: 0.9, title: 'Vec Result', content: 'vec content' },
    ]);

    const hybrid = createHybridSearch(wrapper);
    const results = await hybrid('test query');

    expect(mockStore.searchLex).toHaveBeenCalled();
    expect(mockStore.searchVector).toHaveBeenCalled();
    expect(results.length).toBeGreaterThan(0);
  });

  it('should use RRF fusion for combining results', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.searchLex.mockResolvedValueOnce([
      { docId: 'doc1', score: 0.8, title: 'Doc 1', content: 'content 1' },
      { docId: 'doc2', score: 0.6, title: 'Doc 2', content: 'content 2' },
    ]);
    mockStore.searchVector.mockResolvedValueOnce([
      { docId: 'doc2', score: 0.9, title: 'Doc 2', content: 'content 2' },
      { docId: 'doc3', score: 0.7, title: 'Doc 3', content: 'content 3' },
    ]);

    const hybrid = createHybridSearch(wrapper);
    const results = await hybrid('test query');

    // doc2 should appear first (ranked #2 in lex, #1 in vec)
    expect(results[0].docId).toBe('doc2');
  });

  it('should handle empty results gracefully', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.searchLex.mockResolvedValueOnce([]);
    mockStore.searchVector.mockResolvedValueOnce([]);

    const hybrid = createHybridSearch(wrapper);
    const results = await hybrid('nonexistent query');

    expect(results).toEqual([]);
  });

  it('should apply minScore filter', async () => {
    const mockStore = wrapper.getStore() as any;
    mockStore.searchLex.mockResolvedValueOnce([
      { docId: 'low', score: 0.2, title: 'Low Score', content: 'content' },
    ]);
    mockStore.searchVector.mockResolvedValueOnce([]);

    const hybrid = createHybridSearch(wrapper);
    const results = await hybrid('test', { minScore: 0.5 });

    expect(results).toEqual([]);
  });
});

describe('search with wiki integration', () => {
  it('should filter by page type', async () => {
    const wrapper = createMockWrapper();
    const mockStore = wrapper.getStore() as any;
    
    // Mock results with different page types
    mockStore.search.mockResolvedValueOnce([
      { docId: 'e1', score: 0.8, title: 'Entity', path: 'entity/test.md', content: 'content' },
      { docId: 's1', score: 0.7, title: 'Source', path: 'source/doc.md', content: 'content' },
    ]);

    const search = createSearchFunction(wrapper);
    const results = await search('test', { pageType: 'entity' });

    // Results should include page type derived from path
    expect(results.some((r: SearchResult) => r.pageType === 'entity')).toBe(true);
  });
});
